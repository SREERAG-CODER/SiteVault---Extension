// ---- STORAGE ----
const Storage = {
  getFolders() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['folders'], (data) => {
        resolve(data.folders || [])
      })
    })
  },
  saveFolders(folders) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ folders }, resolve)
    })
  },
  async createFolder(name) {
    const folders = await this.getFolders()
    folders.push({ id: 'f_' + Date.now(), name: name.trim(), sites: [], createdAt: Date.now() })
    await this.saveFolders(folders)
    return folders
  },
  async renameFolder(id, newName) {
    const folders = await this.getFolders()
    const f = folders.find(f => f.id === id)
    if (f) { f.name = newName.trim(); await this.saveFolders(folders) }
    return folders
  },
  async deleteFolder(id) {
    const folders = (await this.getFolders()).filter(f => f.id !== id)
    await this.saveFolders(folders)
    return folders
  }
}

// ---- FOLDER SVG ----
function folderSVG() {
  return `
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- back shadow layer 3 (deepest) -->
      <rect x="6" y="22" width="78" height="52" rx="5" fill="#5a6ea0" opacity="0.45"/>
      <!-- back shadow layer 2 -->
      <rect x="3" y="18" width="78" height="52" rx="5" fill="#6a80bb" opacity="0.55"/>
      <!-- folder back (tab + body back) -->
      <rect x="0" y="24" width="78" height="50" rx="5" fill="#7b93d4"/>
      <!-- tab -->
      <path d="M0 24 Q0 14 10 14 L30 14 Q36 14 38 20 L78 20 Q78 20 78 24 Z" fill="#7b93d4"/>
      <!-- folder face -->
      <rect x="0" y="24" width="78" height="50" rx="5" fill="#8faae8"/>
      <!-- link line rows on face -->
      <rect x="12" y="36" width="54" height="4" rx="2" fill="white" opacity="0.25"/>
      <rect x="12" y="46" width="42" height="4" rx="2" fill="white" opacity="0.18"/>
      <rect x="12" y="56" width="48" height="4" rx="2" fill="white" opacity="0.18"/>
      <!-- subtle shine on top edge -->
      <rect x="2" y="24" width="74" height="2" rx="1" fill="white" opacity="0.15"/>
    </svg>
  `
}

// ---- RENDER FOLDERS ----
function renderFolders(folders, container) {
  container.innerHTML = ''

  const grid = document.createElement('div')
  grid.id = 'sv-folder-grid'
  container.appendChild(grid)

  // render each folder card
  folders.forEach(folder => {
    const card = document.createElement('div')
    card.className = 'sv-folder-card'
    card.dataset.id = folder.id
    card.innerHTML = `
      <div class="sv-folder-icon">${folderSVG()}</div>
      <div class="sv-folder-name">${escapeHTML(folder.name)}</div>
      <div class="sv-folder-count">${folder.sites.length} ${folder.sites.length === 1 ? 'site' : 'sites'}</div>
      <div class="sv-folder-actions">
        <button class="sv-folder-btn sv-rename-btn" title="Rename">✎</button>
        <button class="sv-folder-btn sv-delete-btn" title="Delete">✕</button>
      </div>
    `

    // rename
    card.querySelector('.sv-rename-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      startRename(folder.id, card.querySelector('.sv-folder-name'), folders)
    })

    // delete
    card.querySelector('.sv-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      card.style.opacity = '0.4'
      card.style.pointerEvents = 'none'
      const updated = await Storage.deleteFolder(folder.id)
      renderFolders(updated, container)
    })

    grid.appendChild(card)
  })

  // add folder button (dashed)
  const addCard = document.createElement('div')
  addCard.className = 'sv-folder-card sv-add-folder'
  addCard.innerHTML = `
    <div class="sv-add-icon">+</div>
    <div class="sv-folder-name" style="color: rgba(255,255,255,0.35)">New folder</div>
  `
  addCard.addEventListener('click', () => startCreate(container, folders))
  grid.appendChild(addCard)
}

// ---- INLINE CREATE ----
function startCreate(container, folders) {
  // replace add card with an input card
  const grid = container.querySelector('#sv-folder-grid')
  const addCard = grid.querySelector('.sv-add-folder')

  const inputCard = document.createElement('div')
  inputCard.className = 'sv-folder-card sv-naming-card'
  inputCard.innerHTML = `
    <div class="sv-folder-icon">${folderSVG()}</div>
    <input class="sv-folder-input" type="text" placeholder="Folder name" maxlength="32" />
  `
  grid.replaceChild(inputCard, addCard)

  const input = inputCard.querySelector('.sv-folder-input')
  input.focus()

  async function confirm() {
    const name = input.value.trim()
    if (name) {
      const updated = await Storage.createFolder(name)
      renderFolders(updated, container)
    } else {
      renderFolders(folders, container)
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') renderFolders(folders, container)
    e.stopPropagation()
  })

  input.addEventListener('blur', () => {
    setTimeout(confirm, 150)
  })
}

// ---- INLINE RENAME ----
function startRename(id, nameEl, folders) {
  const current = nameEl.textContent
  const input = document.createElement('input')
  input.className = 'sv-folder-input'
  input.value = current
  input.maxLength = 32
  nameEl.replaceWith(input)
  input.focus()
  input.select()

  async function confirm() {
    const name = input.value.trim() || current
    const updated = await Storage.renameFolder(id, name)
    const body = document.getElementById('sitevault-body')
    renderFolders(updated, body)
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') {
      input.replaceWith(nameEl)
    }
    e.stopPropagation()
  })

  input.addEventListener('blur', () => setTimeout(confirm, 150))
}

// ---- ESCAPE HTML ----
function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ---- SEARCH FILTER ----
function filterFolders(folders, query) {
  if (!query) return folders
  const q = query.toLowerCase()
  return folders.filter(f => f.name.toLowerCase().includes(q))
}

// ---- MAIN ----
window.addEventListener('load', () => {

  const overlay = document.createElement('div')
  overlay.id = 'sitevault-overlay'
  document.body.appendChild(overlay)

  const tab = document.createElement('div')
  tab.id = 'sitevault-tab'
  tab.innerHTML = `
    <span id="sitevault-label">SiteVault</span>
    <div id="sitevault-content">

      <div id="sitevault-header">
        <div id="sync-icon">
          <svg id="sync-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
          </svg>
        </div>
        <div id="sitevault-header-right">
          <input type="text" id="sitevault-search" placeholder="Search folders..." />
          <span id="pro-tab">PRO</span>
        </div>
      </div>

      <div id="sitevault-body"></div>

    </div>
  `
  document.body.appendChild(tab)

  // ---- INIT FOLDERS ----
  const body = document.getElementById('sitevault-body')
  let allFolders = []

  Storage.getFolders().then(folders => {
    allFolders = folders
    renderFolders(allFolders, body)
  })

  // ---- SEARCH ----
  const searchInput = document.getElementById('sitevault-search')
  searchInput.addEventListener('input', () => {
    const filtered = filterFolders(allFolders, searchInput.value)
    renderFolders(filtered, body)
  })
  searchInput.addEventListener('click', e => e.stopPropagation())

  // ---- PRO TAB ----
  document.getElementById('pro-tab').addEventListener('click', (e) => {
    e.stopPropagation()
    window.open('https://sitevault.app/pricing', '_blank')
  })

  // ---- SYNC ICON ----
  const syncIcon = document.getElementById('sync-icon')
  const syncSvg = document.getElementById('sync-svg')
  syncIcon.addEventListener('click', async (e) => {
    e.stopPropagation()
    syncSvg.classList.add('spinning')
    allFolders = await Storage.getFolders()
    renderFolders(allFolders, body)
    setTimeout(() => syncSvg.classList.remove('spinning'), 800)
  })

  // ---- OPEN / CLOSE ----
  let isOpen = false

  function openPanel() {
    tab.classList.add('open')
    overlay.classList.add('open')
    isOpen = true
    // refresh folders on open
    Storage.getFolders().then(folders => {
      allFolders = folders
      renderFolders(allFolders, body)
    })
  }

  function closePanel() {
    tab.classList.remove('open')
    overlay.classList.remove('open')
    isOpen = false
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'togglePanel') {
      isOpen ? closePanel() : openPanel()
    }
  })

  tab.addEventListener('click', () => { if (!isOpen) openPanel() })
  overlay.addEventListener('click', () => closePanel())

})