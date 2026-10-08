# AWEWEBOS

AWEWEBOS is a **browser-based Web OS environment** with a desktop, taskbar/dock, Start menu, application windows, and a user-selected local workspace. It is not a bootable kernel and does not replace Windows, Linux, macOS, or Android.

## Run it

- **Web:** publish this repository root with GitHub Pages and open the HTTPS URL in a recent Chromium-based browser.
- **PWA:** use the browser's Install / Add to Home Screen option. The app manifest and service worker provide an installable shell and offline caching of the core UI.
- **Native wrapper:** the Tauri workflows can package the web environment as a desktop application. That is still a native app containing a Web OS interface, not a bootable operating system.

## Desktop and built-in apps

The integrated desktop includes a top menu bar, Start menu with application search, dock/taskbar, desktop shortcuts, notifications, right-click context menu, draggable/resizable/minimizable/maximizable windows, and keyboard shortcuts.

Built-in applications:
- **Terminal:** commands such as `help`, `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `rm`, `open`, and `install`, backed by the selected workspace.
- **Files:** browse the AWEWEBOS workspace and manage real files.
- **Editor:** edit and save text files.
- **Notes:** create and keep notes in the workspace.
- **Calculator:** local calculations.
- **Paint:** draw on a canvas.
- **Image Viewer:** view supported image files.
- **Messenger:** experimental same-origin tab messaging only; it is not a production internet messenger and has no remote account discovery or voice/video calls.
- **Contacts:** save names and stable UIDs locally.
- **Media Studio:** play local audio/video files and record microphone audio where supported.
- **Browser:** restricted in-app browser; some sites block iframe embedding.
- **App Hub:** browse bundled mini-apps and create/import portable sandboxed HTML mini-app packages by AppID. Packages are local-first and not listed in a global server registry.
- **Themes and Settings:** change appearance and manage system preferences.

Bundled Store apps include live weather via Open-Meteo (internet required), clock, calendar, Snake, Tetris, Minesweeper, and a runtime monitor. The runtime monitor reports actual AWEWEBOS window/app counts and browser storage estimates; browser security prevents this web app from reading host CPU/RAM utilization reliably, so those metrics are marked unavailable rather than fabricated.

## Install to a selected folder

On first run, select a folder you control. The installer creates a workspace structure and stores actual files in that folder:

```text
AWEWEBOS workspace/
├── System/
│   ├── config.json
│   ├── users.json
│   └── Runtime/
│       ├── index.html
│       └── manifest.webmanifest
├── Apps/
│   ├── catalog.json
│   └── <app-id>/
│       ├── manifest.json
│       ├── package.json
│       ├── app.js
│       └── README.txt
├── Users/user/
│   ├── Desktop/
│   ├── Documents/
│   ├── Downloads/
│   ├── Pictures/
│   └── Music/
├── Themes/
└── Settings/preferences.json
```

The App Store writes package metadata and the bundled app's mount code to the selected folder; installed apps run inside the trusted AWEWEBOS web runtime. These are web app packages, not native executables. Existing files are not intentionally formatted or used as a disk image. Choose a dedicated folder rather than the root of a drive.

The folder handle is stored in IndexedDB when the browser supports it. On later visits, the app attempts to reconnect when permission is already granted. If permission was revoked or the browser requires a user gesture, use **Reconnect previous installation** and approve the browser's permission prompt. Browser security means permission cannot be guaranteed to remain granted forever.

## Storage and security boundaries

- The selected folder uses the browser File System Access API and requires explicit user selection and read/write permission. Support varies by browser and platform.
- Browser-local state and selected-folder files are different storage layers; back up important files separately.
- Imported or third-party app code should be treated as untrusted. This Store currently installs bundled apps; it is not yet a global signed package registry.
- Weather requires internet access. Messenger currently works only between tabs sharing the same browser origin and channel; it is not a remote multi-user service. Contacts are local-only. Portable FIDs embed files (maximum 1.2 MB) and portable AppIDs embed self-contained HTML (maximum 180 KB); these do not provide global online discovery or a live-host peer transfer.
- A browser app cannot boot a computer, format a disk, control unrestricted hardware, run native background services, or guarantee access after permissions are revoked.
- AWENET transport, production AWEID resolution, a real ONECOIN ledger, global store payments, and production voice/video messaging are not implemented by this Web OS shell.

## Development and CI

Serve the project over HTTPS or localhost. Service workers and PWA installation do not work from ordinary `file://` pages. Check [GitHub Actions](https://github.com/ARARAT33/AWEWEBOS/actions) before treating a commit as successfully deployed or packaged. Native build artifacts are available only after the corresponding workflow completes successfully.
