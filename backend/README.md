# AWEWEBOS Local Publish Node

This optional user-owned backend stores published files/apps on the computer running it and supports search across manually configured peers. It uses only built-in Node.js modules and has no central registry.

## Requirements and start

Use Node.js 22 or newer.

    cd backend
    npm start

The first run creates awewebos-node-data/config.json with a stable node ID and private publish token. Copy the token from the terminal into AWEWEBOS > Publish & Search. Keep the token private: it can publish and delete items.

By default, the service binds only to 127.0.0.1:41801 and is usable from the same computer. Set AWE_PORT to change the port.

## Allow other computers to reach this node

The service does not open firewall ports automatically. For a trusted LAN, set AWE_BIND=0.0.0.0 and configure the host firewall deliberately.

Linux/macOS:

    AWE_BIND=0.0.0.0 AWE_PORT=41801 npm start

PowerShell:

    $env:AWE_BIND='0.0.0.0'; $env:AWE_PORT='41801'; npm start

For internet access, use a trusted HTTPS reverse proxy or VPN/overlay network. Do not expose plain HTTP and the publish token to the public internet. Add each reachable peer base URL in Publish & Search.

## API

- GET /api/health and /api/info: health and node metadata.
- POST /api/publish: token-protected persistent publication of a file or self-contained HTML app (up to 32 MiB).
- GET /api/search?q=...: local search plus results from manually configured peers.
- GET /api/item/:id: metadata.
- GET /api/content/:id: download bytes.
- POST/DELETE /api/peers: token-protected peer management.
- GET /api/peers: configured peer URLs.

File publication IDs have the form AWE-FID- plus 24 hexadecimal characters; HTML app IDs use AWE-APP-. Each ID has 24 hexadecimal characters after its prefix. Files remain on disk until deleted. Peers can search/download only while the host is online and reachable. If it is off, asleep, offline, behind an unreachable NAT, or its address is not reachable, the item cannot be fetched from that node. Discovery is federated only across peers you add; this is not automatic worldwide discovery.

## Security

Bind to loopback unless you understand the risks. The token is a capability secret; never commit or share it. Downloaded HTML is untrusted and must be opened in a sandbox. This development service does not execute uploaded files, and it is not yet a hardened production internet service.
