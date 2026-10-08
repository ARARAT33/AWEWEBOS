# AWEWEBOS

AWEWEBOS is a local-first web operating environment/PWA foundation for the AWE ecosystem.

## GitHub Pages
A GitHub Actions workflow deploys the repository root on pushes to `main`. In **Settings → Pages**, select **GitHub Actions** as the source if it is not already selected.

## Included
- Desktop shell with movable, minimizable and maximizable app windows
- PWA manifest and offline app-shell service worker
- Local notes, backup import/export and browser storage
- Google Translate page widget plus best-effort text translation
- Explicit folder picker on supported browsers
- AWE Browser links, AWESTORE catalog, ONECOIN demo wallet, AWENET node preferences, messenger prototype, safe command palette, HTML sandbox studio and diagnostics

## Important limits
This is browser software, not a bootable OS or replacement for a native kernel. A normal PWA cannot silently access all disks, enumerate all monitors, force startup on boot, or run unrestricted background services. Those require OS-level settings and/or a native companion.

AWENET transport, AWEID resolution, real ONECOIN transactions, live multi-user messaging, voice/video calls and production payments are not implemented as live services. The demo wallet has no real monetary value. The direct translation endpoint is unofficial; use a licensed translation API for production. Do not submit confidential text to third-party translation services.

## Local development
Serve the directory over HTTP/HTTPS, not file://, to test service workers and installability. Browser APIs and PWA installation vary by browser and operating system.
