# AWEWEBOS

AWEWEBOS is a **local-first browser-based Web OS environment** with a desktop shell, taskbar/dock, app windows, settings, file workspace, and a responsive mobile web/PWA layout. It is not a bootable OS and does not have a privileged hardware kernel: the runtime operates inside the browser sandbox.

## Run the Web OS

- **Web:** publish the repository root with GitHub Pages and open the HTTPS URL in a current browser.
- **Mobile:** use the same responsive web version on a phone/tablet; install it through the browser's Add to Home Screen / Install option. No separate Android app is required.
- **Local workspace:** choose a folder when prompted. The browser requires explicit folder selection and may request permission again later.
- **Desktop wrapper:** Tauri workflows may package the web runtime as a desktop app; that does not turn it into a native OS kernel.

## New: user-owned publishing backend

A separate optional Node.js backend stores published files and HTML apps on the user's own device. It persists while that computer's disk and backend process remain available and provides a search API that can query manually configured peer nodes without a central registry.

Requirements: Node.js 22+. On Windows, double-click backend/start-windows.bat. Or start it from a terminal:

    cd backend
    npm start

The first start prints a private publish token. Open **Publish & Search** inside AWEWEBOS, use the default URL http://127.0.0.1:41801, and paste the token. The token permits publishing/deleting and must not be shared. The backend defaults to loopback-only.

To allow trusted LAN peers, use AWE_BIND=0.0.0.0 and configure the machine's firewall. For remote internet access, use a secure HTTPS reverse proxy or VPN/overlay. Add each reachable peer URL in Publish & Search. The application does not open firewall ports or bypass NAT automatically.

- File publications receive an AWE-FID-... ID.
- HTML apps receive an AWE-APP-... ID and open in a sandboxed preview.
- Each publication can be up to 32 MiB.
- Files and metadata persist in backend/awewebos-node-data/ (or the configured data directory) until deleted.
- Search queries this node and peers explicitly added to it. There is no central index and no automatic worldwide discovery.
- The publishing device must be powered on, online, and reachable for others to fetch its content. For public internet use, HTTPS/VPN and firewall setup are required.

See backend/README.md for the API, setup and security model.

## Built-in apps and runtime tools

- **Files:** browse the selected workspace, create folders/files, rename/delete, search the current folder, open supported file types and share/import portable FIDs.
- **Text Editor:** save/save-as, find/replace, basic formatting and HTML preview.
- **Media Studio:** local media playback and browser-supported audio recording.
- **Image Viewer / Paint / Notes / Calculator / Calendar / Clock.**
- **Contacts:** local contacts and stable user/workspace identifiers.
- **Messenger:** experimental same-origin tab messaging and locally recorded voice messages; not a production remote messenger and does not yet provide peer-to-peer calls.
- **App Hub:** bundled apps and portable self-contained HTML mini-app packages.
- **Publish & Search:** publish persistent files/apps to the optional device-owned backend, search this node and manually configured peers, download files and sandbox-preview HTML apps.
- **Storage & Drives:** show files/folders readable inside the selected workspace and browser storage estimates. Browsers do not allow automatic enumeration of every OS disk.
- **Kernel & Processes:** inspect running app windows and exposed browser capabilities. This is a web runtime monitor, not a privileged kernel.
- **Browser:** restricted in-app browser; some sites block iframe embedding.
- **Settings / Themes:** appearance, theme and workspace preferences.

## Validation

The GitHub Actions validation workflow checks the manifest, extracts and syntax-checks inline JavaScript, checks the Node.js backend syntax, runs backend integration tests for publish/search/download/delete and persistence after restart, and checks patch whitespace.

## Current limits

- This remains a Web OS shell running inside a browser, not a bootable or hardware-level OS.
- Browser security prevents unrestricted disk/CPU/GPU access and automatic listing of all host disks.
- User-hosted backend search is federated only across explicitly configured peers; it is not globally discoverable without reachable peer addresses.
- A node is reachable only while the device is online and network/firewall/NAT settings permit access.
- Production WebRTC signaling/discovery, end-to-end encrypted remote messaging, video calls, identity verification, a global signed app registry, and an audited permission/security model remain future work.
