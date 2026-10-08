# AWEWEBOS

AWEWEBOS is a local-first web operating environment for the AWE ecosystem. It has a browser-based desktop shell, an installable PWA, and an experimental Tauri native desktop host.

## Ways to run it

- **Website:** publish the repository root using GitHub Pages.
- **PWA:** visit the HTTPS site and choose Install app / Add to Home Screen. Website and installed PWA on the same origin generally share browser storage and service-worker scope.
- **Native desktop:** the Tauri wrapper can be built for Windows and Linux by the `.github/workflows/native-build.yml` workflow. The native wrapper is an application, not a bootable operating system.

## Current features

- Desktop shell, app launcher/dock, movable/minimizable/maximizable windows
- PWA manifest and offline shell cache
- Local notes and backup import/export
- Browser folder picker on supported browsers with explicit permission
- AWESTORE local HTML mini-app import, on-device storage and sandboxed launch
- AWE Messenger experimental direct WebRTC data channel; peers exchange offer/answer JSON manually
- Google Translate widget and best-effort text translation
- Developer Studio with sandboxed HTML preview
- AWE ecosystem links, ONECOIN demo balance, AWENET node preference prototype and diagnostics

## Important limits — please read

This is not a bootable OS and does not include a Linux/Windows/Android kernel. The Tauri target is a native desktop wrapper around the web environment. Full OS integration, boot startup, unrestricted disk/display enumeration, native background node services and privileged device control require OS-level code and explicit user permissions.

The WebRTC messenger is an experimental peer-to-peer prototype. It has no contact discovery, groups, push notifications, voice/video, offline delivery or guaranteed NAT traversal. Manual signaling avoids a hosted signaling server, but some networks still require a TURN relay. Do not treat it as a production-secure messenger without a threat model and security review.

Imported HTML apps are untrusted code. They run in a restricted iframe, but users should only install apps from trusted sources. AWESTORE is currently a local library, not a global package registry. It has no signed package verification or payments.

AWENET transport, AWEID resolution, a real ONECOIN ledger, live multi-user sync, production store payments and production voice/video calling are not implemented as live services. The ONECOIN balance is a demo only and has no monetary value.

Translation requires internet access and may send text to Google or another third party. Do not translate confidential content through third-party services. The direct translation endpoint is unofficial; production use needs a supported API and applicable terms.

## Build native desktop

The native workflow installs the Tauri CLI, generates app icons, and builds Windows and Linux bundles. Open GitHub Actions and download the `awewebos-windows` or `awewebos-linux` artifact after the workflow succeeds. Build artifacts are not available until CI completes successfully.

## Development

Serve the root over HTTP/HTTPS, not `file://`, to test service workers and PWA installability. Browser APIs differ by browser and OS. Native builds require the Rust toolchain and platform-specific dependencies.
