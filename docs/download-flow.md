# Download Flow (Visual)

How the download test page moves a file from the backend endpoint to a device — across iOS, iPadOS, Android, desktop, and in-app webviews.

## 1. System Overview

```mermaid
flowchart TB
    Row["Artifact row<br/>(json · pdf · csv · txt)"]

    Row -->|"Mode B"| FetchSave["Download<br/>(client-side)"]
    Row -->|"Mode A"| DirectLink["Direct link<br/>(server-side)"]

    FetchSave --> Query["Prefetch on page load<br/>TanStack Query"]
    Query --> Endpoint[("Backend endpoint<br/>/v3/verification/qr.*")]
    Endpoint --> Blob["Blob held in memory<br/>(keeps the tap gesture synchronous)"]
    Blob --> Engine["Download engine<br/>strategy chain per platform"]

    DirectLink --> Endpoint
    Endpoint --> Headers["Response headers<br/>Content-Disposition: attachment"]
    Headers --> OS1["OS download manager saves file"]

    Engine --> Bridge["Native bridge hand-off<br/>(in-app webviews)"]
    Engine --> OS2["Share sheet / browser download manager<br/>or guide dialog"]
```

- **Mode B — Download:** the backend returns the file body (e.g. JSON). The frontend fetches it ahead of time, then applies a per-platform strategy so the file actually saves.
- **Mode A — Direct link:** a plain link to the endpoint. The server's `Content-Disposition: attachment` header does the work — the most reliable path on iOS.

## 2. Strategy Chain (Download)

Mirrors `src/features/download-file/model/engine.ts` exactly. Blob is prefetched so no `await` happens before the download is triggered (Safari drops user activation otherwise).

```mermaid
flowchart TD
    Start(["Tap 'Download'"]) --> Ready{"Blob prefetched?"}
    Ready -- "no" --> Preparing["Button disabled<br/>'Preparing...'"]
    Ready -- "yes" --> BridgeAvail{"In-app webview<br/>with native bridge?"}

    BridgeAvail -- "yes" --> BridgePost["Post payload to<br/>DownloadBridge / flutter_inappwebview"]
    BridgePost --> BridgeStatus["Status: 'Handed to the app'<br/>native reply updates it"]

    BridgeAvail -- "no" --> IOS{"iOS / iPadOS?"}

    IOS -- "yes" --> CanShare{"navigator.canShare<br/>with files?"}
    CanShare -- "yes" --> Share["Web Share API<br/>share sheet - 'Save to Files'"]
    CanShare -- "no" --> IOSWV{"In-app webview?"}
    Share -- "user cancels" --> Cancelled["Status: Cancelled"]
    Share -- "throws (non-cancel)" --> IOSWV

    IOSWV -- "yes" --> DataURI["data: URI anchor click<br/>(WKWebView blocks blob: downloads)"]
    IOSWV -- "no" --> Octet["Anchor click<br/>blob rebuilt as application/octet-stream<br/>(forces Safari to download, not preview)"]

    IOS -- "no" --> WV{"In-app webview?"}
    WV -- "no" --> Anchor["Anchor click<br/>blob + download attribute"]
    WV -- "yes" --> Android{"Android webview?"}
    Android -- "yes" --> AnchorWV["Anchor click attempt<br/>(may be ignored if host app lacks a DownloadListener)"]
    Android -- "no" --> GuideOnly["No download attempt"]

    DataURI --> Uncertain["Status shown<br/>+ auto-opens guide on iOS webviews"]
    Octet --> Uncertain
    Uncertain --> Guide
    AnchorWV --> Guide
    GuideOnly --> Guide

    Anchor --> Saved["File saved by OS download manager"]

    Guide["Guide dialog<br/>Copy link · open in Safari/Chrome · paste"]
```

## 3. Sequence: Download

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant P as Page (React)
    participant E as Backend endpoint
    participant G as Download engine
    participant OS as OS share / download UI
    participant N as Native bridge (host app)

    P->>E: GET /v3/verification/qr.json (prefetch on mount)
    E-->>P: file body + Content-Disposition filename
    Note over P: Blob held in memory
    U->>P: taps "Download"
    P->>G: runDownload(blob) - synchronous until trigger
    alt webview with bridge
        G->>N: DownloadBridge payload (url + filename + MIME)
        N-->>P: window.onDownloadBridgeResult("saved")
    else no bridge
        G->>OS: share sheet / anchor click / data URI / guide
        OS-->>U: File saved (Files app / Downloads folder)
    end
```

## 4. Bridge Contract (In-App Webviews)

In-app webviews cannot save downloads from JS alone — no web-only change fixes that. When the page detects a host-app bridge, the engine hands the file over to native code instead of faking a download.

### Detection & transport (web side: `model/bridge.ts`)

Either channel works, checked in this order:

| Channel | Injected by | Call |
| :--- | :--- | :--- |
| `window.DownloadBridge.postMessage(json)` | `webview_flutter` JavaScript channel | host receives the JSON string |
| `window.flutter_inappwebview.callHandler('downloadBridge', payload)` | `flutter_inappwebview` | host receives the payload object; its return value is used as the result |

Payload:

```json
{
  "type": "download",
  "url": "/v3/verification/qr.json",
  "filename": "verification-qr.json",
  "mimeType": "application/json"
}
```

### Host app responsibilities

1. Receive the payload and download the file natively (or copy it from bundled assets).
2. Save it to the device (Files / Documents / Downloads) using native APIs.
3. Report the result — either by evaluating JS in the page:

```js
window.onDownloadBridgeResult(JSON.stringify({ status: 'saved', filename: 'verification-qr.json' }))
```

`status` is `saved` | `failed` | `cancelled`. The page matches `filename` to the artifact row and updates its status line.

### Flutter snippets

`webview_flutter` (channel + evaluated callback):

```dart
controller.addJavaScriptChannel(
  'DownloadBridge',
  onMessageReceived: (message) async {
    final payload = jsonDecode(message.message) as Map<String, dynamic>;
    final saved = await saveDownloadToDevice(payload);
    final result = jsonEncode({
      'status': saved ? 'saved' : 'failed',
      'filename': payload['filename'],
    });
    await controller.runJavaScript(
      "window.onDownloadBridgeResult('$result')",
    );
  },
);
```

`flutter_inappwebview` (handler; the returned JSON string becomes the result):

```dart
controller.addJavaScriptHandler(
  handlerName: 'downloadBridge',
  callback: (args) async {
    final payload = (args.first as Map).cast<String, dynamic>();
    final saved = await saveDownloadToDevice(payload);
    return jsonEncode({
      'status': saved ? 'saved' : 'failed',
      'filename': payload['filename'],
    });
  },
);
```

Without a bridge, the page still works: it falls back to the data-URI/blob attempts and auto-opens the manual guide on iOS webviews.

## 5. Sequence: Direct Link

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant B as Browser
    participant E as Backend endpoint
    participant D as OS download manager

    U->>B: taps "Direct link" (plain anchor navigation)
    B->>E: GET /v3/verification/qr.json
    E-->>B: 200 OK
    Note right of E: Content-Type: application/json<br/>Content-Disposition: attachment; filename="verification-qr.json"
    B->>D: attachment header forces save on all platforms (incl. iOS Safari)
    D-->>U: File in Files app / Downloads folder
```

## 6. Backend Simulation: Dev vs Prod

Same headers, two hosting paths — so local phone testing matches production behavior.

```mermaid
flowchart LR
    Page["Download page"]

    subgraph Dev["Local dev: pnpm dev"]
        VM["Vite middleware<br/>sets Content-Disposition + MIME"]
        PF["public/v3/verification/qr.*"]
        VM --- PF
    end

    subgraph Prod["AWS Amplify"]
        AH["customHttp.yml custom headers<br/>sets Content-Disposition + MIME"]
        DF["dist/v3/verification/qr.*"]
        AH --- DF
    end

    Page -->|"fetch (Mode B) or anchor (Mode A)"| VM
    Page -->|"fetch (Mode B) or anchor (Mode A)"| AH
```

## 7. Platform Matrix

| Platform | Mode B (Download) | Mode A (Direct link) |
| :--- | :--- | :--- |
| iOS / iPadOS Safari | Web Share &#8594; octet-stream blob | `Content-Disposition` header &#10003; |
| iOS in-app webview (Instagram, Facebook, ...) | bridge if present &#8594; data URI anchor &#8594; auto guide | Often blocked &#8594; guide |
| Flutter webview with bridge | native hand-off + result callback | host-app dependent |
| Android browser | blob + `download` attribute | header &#10003; |
| Android webview | bridge if present &#8594; blob attempt &#8594; guide | host-app dependent |
| Desktop (all browsers) | blob + `download` attribute | header &#10003; |

## 8. Why This Is Needed (iOS WebKit Quirks)

- All iOS browsers use WebKit — Chrome/Firefox/Edge on iPhone behave like Safari, not like their desktop versions.
- Text-like files (JSON/CSV/TXT) open in-tab instead of downloading; PDFs get previewed.
- `blob:` URLs with the `download` attribute are ignored inside WKWebView (in-app browsers).
- `data:` URIs still work in WKWebView but broke in recent iOS Safari — hence blob for Safari, data URI for webviews.
- Rebuilding a blob as `application/octet-stream` forces Safari to download instead of preview.
- Filenames are lost unless the server sends `Content-Disposition` or the user goes through the share sheet.
- In-app browsers (Instagram, Facebook) often block downloads entirely — no web code fixes that; the guide dialog is the fallback.
- Inside a host app's own webview (e.g. Flutter), the only real fix is a native bridge — see section 4. The page detects the bridge automatically and hands off.

## 9. Source Map

| Concern | File |
| :--- | :--- |
| Platform / webview detection | `src/shared/lib/platform.ts` |
| Strategy chain (pure logic) | `src/features/download-file/model/engine.ts` |
| Native bridge detection, post, result parsing | `src/features/download-file/model/bridge.ts` |
| Real DOM implementations (share, anchor, data URI) | `src/features/download-file/model/browser.ts` |
| Gesture-safe orchestration hook | `src/features/download-file/model/useDownloadFile.ts` |
| Guide dialog content per platform | `src/features/download-file/model/guide.ts` |
| Copy-link clipboard helper | `src/shared/lib/clipboard.ts` |
| Fetch + Content-Disposition parsing | `src/shared/api/client.ts` |
| Artifact catalog (endpoints) | `src/entities/download-artifact/model/catalog.ts` |
| Simulated backend headers (dev) | `vite.config.ts` |
| Simulated backend headers (prod) | `customHttp.yml` |

Append `?simulate=ios`, `?simulate=ipados`, `?simulate=android`, `?simulate=ios-webview`, or `?simulate=android-webview` to preview any strategy from a desktop browser.
