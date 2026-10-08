/* AWEWEBOS persistent workspace filesystem.
   Uses the browser File System Access API only after explicit user selection. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let rootHandle = null;
  let stack = [];
  let openedFile = null;
  const runtimeFiles = ['index.html','setup.js','setup.css','webos-fs.js','manifest.webmanifest','icon.svg','sw.js'];
  const folders = ['System','System/Runtime','System/Config','Apps','Users','Users/Default','Users/Default/Documents','Users/Default/Downloads','Users/Default/Pictures','Users/Default/Videos','Users/Default/Music','Desktop','Documents','Downloads','Pictures','Videos','Music','Shared','Trash'];
  const starterFiles = [
    ['README.md', '# AWEWEBOS workspace\n\nThis folder is the persistent workspace selected by the user.\n\n- System/Runtime contains a copy of the Web OS web assets.\n- System/Config contains system metadata.\n- Apps/catalog.json describes the built-in applications.\n- Users/Default contains the default user workspace.\n\nOpen AWEWEBOS over HTTPS or through its supported native host to use browser APIs. Opening the copied HTML directly with file:// will not enable all browser capabilities.'],
    ['System/README.md', '# System\n\nAWEWEBOS web-runtime files and configuration. These are ordinary files in the selected folder, not privileged operating-system binaries.'],
    ['System/Config/system.json', JSON.stringify({ name: 'AWEWEBOS', type: 'web-os-workspace', schemaVersion: 1, createdBy: 'AWEWEBOS first-run setup', capabilities: ['directory-backed files', 'built-in web applications', 'local settings'] }, null, 2)],
    ['Apps/README.md', '# Applications\n\nThe AWEWEBOS shell provides the built-in applications listed in catalog.json. Application execution is handled by the Web OS shell; this catalog is not a native executable package manager. Imported HTML mini-apps remain sandboxed in AWESTORE.'],
    ['Users/README.md', '# Users\n\nPer-user workspace data. This Web OS currently has a local default profile; this folder structure does not create operating-system accounts.'],
    ['Users/Default/README.md', '# Default user\n\nPlace user documents and exported data here.'],
    ['Desktop/README.md', '# Desktop\n\nFiles placed here are part of the persistent workspace. The browser desktop icons are managed by AWEWEBOS.'],
    ['Documents/Welcome.md', '# Welcome to AWEWEBOS\n\nYour selected folder is now connected to the Web OS file manager. You can create folders, create and edit text files, upload files, and organize content here.'],
    ['Downloads/README.md', '# Downloads\n\nUse this folder for files you export or copy into your AWEWEBOS workspace. Browser downloads may still use the browser download location unless the application explicitly saves here.'],
    ['Shared/README.md', '# Shared\n\nA workspace folder for files you choose to share manually. No network sharing is enabled automatically.'],
    ['Trash/README.md', '# Trash\n\nA reserved folder for future reversible-delete behavior. Current permanent delete actions in the file manager are not moved here.']
  ];

  function escapeHtml(value) {
    if (typeof window.esc === 'function') return window.esc(String(value));
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function notify(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else alert(message);
  }
  async function ensureDir(parent, path) {
    let current = parent;
    for (const part of path.split('/').filter(Boolean)) current = await current.getDirectoryHandle(part, { create: true });
    return current;
  }
  async function writeFile(dir, name, text, overwrite) {
    let handle;
    try { handle = await dir.getFileHandle(name); }
    catch (e) { if (e.name !== 'NotFoundError') throw e; }
    if (handle && !overwrite) return false;
    handle = handle || await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return true;
  }
  async function writePath(path, text, overwrite) {
    const bits = path.split('/');
    const name = bits.pop();
    const dir = await ensureDir(rootHandle, bits.join('/'));
    return writeFile(dir, name, text, overwrite);
  }
  async function ensurePermission(handle) {
    let state = await handle.queryPermission({ mode: 'readwrite' });
    if (state !== 'granted') state = await handle.requestPermission({ mode: 'readwrite' });
    if (state !== 'granted') throw new Error('Write permission was not granted.');
  }

  window.initializeAweFilesystem = async function (handle, options) {
    const opts = options || {};
    const selected = handle || rootHandle || (typeof folder !== 'undefined' ? folder : null);
    if (!selected) throw new Error('Choose a workspace folder first.');
    await ensurePermission(selected);
    rootHandle = selected;
    if (typeof folder !== 'undefined') folder = selected;
    stack = [{ name: selected.name, handle: selected }];
    for (const path of folders) await ensureDir(selected, path);
    for (const [path, text] of starterFiles) await writePath(path, text, false);

    const catalog = {
      name: 'AWEWEBOS Built-in Apps',
      schemaVersion: 1,
      note: 'These apps execute in the AWEWEBOS web shell; this file is an inventory, not native binaries.',
      apps: (typeof apps !== 'undefined' ? apps : []).map(a => ({ id: a[0], icon: a[1], name: a[2], launch: 'awewebos://app/' + a[0], delivery: 'web-shell' }))
    };
    await writePath('Apps/catalog.json', JSON.stringify(catalog, null, 2), true);
    const config = {
      name: 'AWEWEBOS', schemaVersion: 1, initializedAt: new Date().toISOString(),
      workspaceName: selected.name, storageMode: 'user-selected-directory',
      warning: 'This is a browser-managed workspace, not a disk format or privileged OS installation.'
    };
    await writePath('System/Config/workspace.json', JSON.stringify(config, null, 2), true);

    const runtimeDir = await ensureDir(selected, 'System/Runtime');
    let copied = 0;
    for (const name of runtimeFiles) {
      try {
        const response = await fetch('./' + name, { cache: 'no-cache' });
        if (!response.ok) continue;
        await writeFile(runtimeDir, name, await response.text(), true);
        copied++;
      } catch (e) { console.warn('Could not copy runtime asset', name, e); }
    }
    if (typeof window.saveSharedFolderHandle === 'function') await window.saveSharedFolderHandle(selected);
    if (!opts.quiet) notify('AWEWEBOS workspace initialized. Created the folder structure and copied ' + copied + ' runtime files.');
    await renderExplorer();
    return { root: selected.name, runtimeFilesCopied: copied };
  };

  async function chooseFolder() {
    if (!window.showDirectoryPicker) {
      notify('This browser does not support choosing a folder. Try current Chrome or Edge over HTTPS.');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'awewebos-workspace' });
      await ensurePermission(handle);
      rootHandle = handle;
      if (typeof folder !== 'undefined') folder = handle;
      stack = [{ name: handle.name, handle }];
      if (typeof window.saveSharedFolderHandle === 'function') await window.saveSharedFolderHandle(handle);
      await renderExplorer();
      const status = $('aweFsStatus');
      if (status) status.textContent = 'Connected: ' + handle.name;
    } catch (e) {
      if (e.name !== 'AbortError') notify('Could not connect folder: ' + (e.message || 'permission denied'));
    }
  }

  function currentDir() { return stack[stack.length - 1]?.handle || rootHandle; }
  function pathLabel() { return stack.map(s => s.name).join(' / '); }
  async function renderExplorer() {
    const host = $('aweFsExplorer');
    if (!host) return;
    const selected = rootHandle || (typeof folder !== 'undefined' ? folder : null);
    if (!selected) {
      host.innerHTML = '<div class="card"><h3>Choose your workspace folder</h3><p>Select a folder or a USB-drive folder. AWEWEBOS will ask permission, create its directory structure, and copy its web runtime there without formatting the disk.</p><button class="primary" id="aweFsChoose">Choose folder</button></div>';
      $('aweFsChoose').onclick = chooseFolder;
      return;
    }
    rootHandle = selected;
    if (!stack.length) stack = [{ name: selected.name, handle: selected }];
    let entries = [];
    try {
      for await (const [name, handle] of currentDir().entries()) {
        entries.push({ name, kind: handle.kind, handle });
      }
      entries.sort((a,b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
    } catch (e) {
      host.innerHTML = '<p class="muted">Folder access expired. Choose the folder again and grant access.</p><button id="aweFsReconnect">Reconnect folder</button>';
      $('aweFsReconnect').onclick = chooseFolder;
      return;
    }
    host.innerHTML =
      '<div class="row" style="justify-content:space-between"><div><b>Workspace</b><div class="small muted">' + escapeHtml(pathLabel()) + '</div></div><button id="aweFsInit">Initialize / repair folders</button></div>' +
      '<div class="row" style="margin:10px 0"><button id="aweFsUp" ' + (stack.length <= 1 ? 'disabled' : '') + '>↑ Up</button><button id="aweFsRefresh">↻ Refresh</button><button id="aweFsMkdir">＋ Folder</button><button id="aweFsNew">＋ Text file</button><button id="aweFsUpload">↑ Upload files</button><input id="aweFsUploadInput" type="file" multiple class="hidden"></div>' +
      '<div class="small muted">' + entries.length + ' item(s) · files are written to the selected folder on your device</div>' +
      '<div class="list" id="aweFsEntries" style="margin-top:8px">' +
      (entries.map(e => '<div class="item"><button class="awe-fs-open" data-name="' + escapeHtml(e.name) + '" data-kind="' + e.kind + '" style="flex:1;text-align:left;background:transparent;border-color:transparent">' + (e.kind === 'directory' ? '📁 ' : '📄 ') + escapeHtml(e.name) + '</button><span class="small muted">' + (e.kind === 'directory' ? 'Folder' : 'File') + '</span><button class="awe-fs-delete" data-name="' + escapeHtml(e.name) + '" data-kind="' + e.kind + '" title="Delete">×</button></div>').join('')) :
      '<div class="item muted">This folder is empty. Use “Initialize / repair folders” to create the AWEWEBOS structure.</div>') +
      '</div><div class="card" style="margin-top:12px"><h3 id="aweFsEditorTitle">Text editor</h3><p class="small muted">Select a text file to view or edit it. Large and binary files are not opened in this editor.</p><textarea id="aweFsEditor" class="field" rows="8" placeholder="Choose a text file…"></textarea><div class="row"><button id="aweFsSave" class="primary" disabled>Save file</button><span id="aweFsEditorStatus" class="small muted"></span></div></div>';

    $('aweFsInit').onclick = async () => {
      try { await window.initializeAweFilesystem(rootHandle); }
      catch (e) { notify('Could not initialize workspace: ' + e.message); }
    };
    $('aweFsUp').onclick = () => { if (stack.length > 1) { stack.pop(); renderExplorer(); } };
    $('aweFsRefresh').onclick = renderExplorer;
    $('aweFsMkdir').onclick = createFolder;
    $('aweFsNew').onclick = createTextFile;
    $('aweFsUpload').onclick = () => $('aweFsUploadInput').click();
    $('aweFsUploadInput').onchange = uploadFiles;
    $('aweFsEntries').addEventListener('click', async e => {
      const open = e.target.closest('.awe-fs-open');
      const del = e.target.closest('.awe-fs-delete');
      if (del) { await deleteEntry(del.dataset.name, del.dataset.kind); return; }
      if (!open) return;
      const name = open.dataset.name;
      if (open.dataset.kind === 'directory') {
        try { stack.push({ name, handle: await currentDir().getDirectoryHandle(name) }); await renderExplorer(); }
        catch (err) { notify('Could not open folder: ' + err.message); }
      } else {
        try { await openTextFile(name); }
        catch (err) { notify('Could not open file: ' + err.message); }
      }
    });
  }

  async function createFolder() {
    const name = prompt('New folder name');
    if (!name) return;
    if (name === '.' || name === '..' || /[\\/:*?"<>|]/.test(name)) return notify('Enter a valid folder name.');
    try { await currentDir().getDirectoryHandle(name, { create: true }); await renderExplorer(); }
    catch (e) { notify('Could not create folder: ' + e.message); }
  }
  async function createTextFile() {
    const name = prompt('New text file name', 'New document.txt');
    if (!name) return;
    if (name === '.' || name === '..' || /[\\/:*?"<>|]/.test(name)) return notify('Enter a valid file name.');
    try {
      let handle;
      try { handle = await currentDir().getFileHandle(name); }
      catch (e) { if (e.name !== 'NotFoundError') throw e; }
      if (handle && !confirm('This file already exists. Replace its contents?')) return;
      handle = handle || await currentDir().getFileHandle(name, { create: true });
      const writable = await handle.createWritable(); await writable.write(''); await writable.close();
      await renderExplorer(); await openTextFile(name);
    } catch (e) { notify('Could not create file: ' + e.message); }
  }
  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      try {
        const handle = await currentDir().getFileHandle(file.name, { create: true });
        const writable = await handle.createWritable(); await writable.write(file); await writable.close();
      } catch (e) { notify('Could not upload ' + file.name + ': ' + e.message); }
    }
    event.target.value = '';
    await renderExplorer();
  }
  async function openTextFile(name) {
    const handle = await currentDir().getFileHandle(name);
    const file = await handle.getFile();
    if (file.size > 2 * 1024 * 1024) throw new Error('Files over 2 MB are not opened in the text editor.');
    const text = await file.text();
    if (text.includes('\u0000')) throw new Error('This looks like a binary file.');
    openedFile = { name, handle };
    $('aweFsEditorTitle').textContent = 'Editing: ' + name;
    $('aweFsEditor').value = text;
    $('aweFsSave').disabled = false;
    $('aweFsEditorStatus').textContent = file.size + ' bytes';
    $('aweFsSave').onclick = async () => {
      try {
        const writable = await openedFile.handle.createWritable();
        await writable.write($('aweFsEditor').value); await writable.close();
        $('aweFsEditorStatus').textContent = 'Saved · ' + new Date().toLocaleTimeString();
        notify('Saved ' + openedFile.name);
        await renderExplorer();
      } catch (e) { notify('Save failed: ' + e.message); }
    };
  }
  async function deleteEntry(name, kind) {
    if (!confirm('Permanently delete ' + (kind === 'directory' ? 'folder' : 'file') + ' "' + name + '"? This action cannot be undone.')) return;
    try { await currentDir().removeEntry(name, { recursive: kind === 'directory' }); await renderExplorer(); }
    catch (e) { notify('Could not delete item: ' + e.message); }
  }

  function mountFileManager() {
    const body = document.querySelector('#w-files .winbody');
    if (!body) return;
    body.innerHTML = '<h2>Files & Storage</h2><p>Real directory-backed file manager. Choose a folder you control; AWEWEBOS will not format a disk or modify files outside that folder.</p><div class="row" style="margin-bottom:10px"><button class="primary" id="aweFsChooseTop">📂 Choose folder / drive folder</button><button id="aweFsExport">Export AWEWEBOS settings</button></div><div id="aweFsStatus" class="item">No workspace connected yet.</div><div id="aweFsExplorer"></div>';
    $('aweFsChooseTop').onclick = chooseFolder;
    $('aweFsExport').onclick = () => {
      const blob = new Blob([JSON.stringify({ app: 'AWEWEBOS', exportedAt: new Date().toISOString(), settings: JSON.parse(localStorage.getItem('awewebos.v2') || '{}') }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'awewebos-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const selected = rootHandle || (typeof folder !== 'undefined' ? folder : null);
    if (selected) {
      rootHandle = selected;
      if (!stack.length || stack[0].handle !== selected) stack = [{ name: selected.name, handle: selected }];
      $('aweFsStatus').textContent = 'Connected: ' + selected.name;
    }
    renderExplorer();
  }

  const originalOpenApp = window.openApp;
  if (typeof originalOpenApp === 'function') {
    window.openApp = function (id) {
      originalOpenApp(id);
      if (id === 'files') queueMicrotask(mountFileManager);
    };
  }
  window.awewebosRefreshFiles = renderExplorer;
  window.awewebosChooseWorkspace = chooseFolder;
})();