// ================================================================
// ---- FREE TIER LIMITS ----
// ================================================================
const LIMITS = {
  folders: 3,
  sites: 50
}

// check if user is pro (stored in chrome.storage.sync)
function isPro() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['isPro'], (data) => {
      resolve(data.isPro === true)
    })
  })
}

// total sites across all folders
function totalSites(folders) {
  return folders.reduce((sum, f) => sum + f.sites.length, 0)
}

// ================================================================
// ---- STORAGE ----
// ================================================================
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
  },
  async addSite(folderId, site) {
    const folders = await this.getFolders()
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      folder.sites.push(site)
      await this.saveFolders(folders)
    }
    return folders
  },
  async deleteSite(folderId, siteId) {
    const folders = await this.getFolders()
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      folder.sites = folder.sites.filter(s => s.id !== siteId)
      await this.saveFolders(folders)
    }
    return folders
  }
}

// ================================================================
// ---- GET CURRENT TAB INFO ----
// ================================================================
function getCurrentTabInfo() {
  return {
    title: document.title || window.location.hostname,
    url: window.location.href,
    favicon: getFavicon(),
  }
}

function getFavicon() {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el && el.href) return el.href
  }
  return `${window.location.origin}/favicon.ico`
}

// ================================================================
// ---- FOLDER SVG ----
// ================================================================
function folderSVG() {
  return `
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="22" width="78" height="52" rx="5" fill="#5a6ea0" opacity="0.45"/>
      <rect x="3" y="18" width="78" height="52" rx="5" fill="#6a80bb" opacity="0.55"/>
      <rect x="0" y="24" width="78" height="50" rx="5" fill="#7b93d4"/>
      <path d="M0 24 Q0 14 10 14 L30 14 Q36 14 38 20 L78 20 Q78 20 78 24 Z" fill="#7b93d4"/>
      <rect x="0" y="24" width="78" height="50" rx="5" fill="#8faae8"/>
      <rect x="12" y="36" width="54" height="4" rx="2" fill="white" opacity="0.25"/>
      <rect x="12" y="46" width="42" height="4" rx="2" fill="white" opacity="0.18"/>
      <rect x="12" y="56" width="48" height="4" rx="2" fill="white" opacity="0.18"/>
      <rect x="2" y="24" width="74" height="2" rx="1" fill="white" opacity="0.15"/>
    </svg>
  `
}

// ================================================================
// ---- UPGRADE MODAL ----
// ================================================================
function showUpgradeModal(reason) {
  // remove existing if any
  const existing = document.getElementById('sv-upgrade-modal')
  if (existing) existing.remove()

  const messages = {
    folders: {
      title: 'Folder limit reached',
      body: `Free plan includes ${LIMITS.folders} folders. Upgrade to Pro for unlimited folders.`
    },
    sites: {
      title: 'Bookmark limit reached',
      body: `Free plan includes ${LIMITS.sites} saved sites. Upgrade to Pro for unlimited bookmarks.`
    }
  }

  const { title, body } = messages[reason] || messages.folders

  const modal = document.createElement('div')
  modal.id = 'sv-upgrade-modal'
  modal.innerHTML = `
    <div id="sv-upgrade-box">
      <div id="sv-upgrade-icon">🔒</div>
      <div id="sv-upgrade-title">${title}</div>
      <div id="sv-upgrade-body">${body}</div>
      <button id="sv-upgrade-cta">Upgrade to Pro — $4/mo</button>
      <button id="sv-upgrade-close">Maybe later</button>
    </div>
  `

  document.getElementById('sitevault-tab').appendChild(modal)

  modal.querySelector('#sv-upgrade-cta').addEventListener('click', () => {
    window.open('https://sitevault.app/pricing', '_blank')
    modal.remove()
  })

  modal.querySelector('#sv-upgrade-close').addEventListener('click', () => {
    modal.remove()
  })

  // also close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove()
  })
}

// ================================================================
// ---- ESCAPE HTML ----
// ================================================================
function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ================================================================
// ---- SEARCH FILTER ----
// ================================================================
function filterFolders(folders, query) {
  if (!query) return folders
  const q = query.toLowerCase()
  return folders.filter(f => f.name.toLowerCase().includes(q))
}

// ================================================================
// ---- VIEW: FOLDER GRID ----
// ================================================================
function renderFolders(folders, container) {
  container.innerHTML = ''

  const grid = document.createElement('div')
  grid.id = 'sv-folder-grid'
  container.appendChild(grid)

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

    card.addEventListener('click', async () => {
      const fresh = await Storage.getFolders()
      const f = fresh.find(x => x.id === folder.id)
      if (f) renderSites(f, container)
    })

    card.querySelector('.sv-rename-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      startRename(folder.id, card.querySelector('.sv-folder-name'), folders)
    })

    card.querySelector('.sv-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      card.style.opacity = '0.4'
      card.style.pointerEvents = 'none'
      const updated = await Storage.deleteFolder(folder.id)
      renderFolders(updated, container)
    })

    grid.appendChild(card)
  })

  // ---- ADD FOLDER CARD (with limit check) ----
  const atFolderLimit = folders.length >= LIMITS.folders
  const addCard = document.createElement('div')
  addCard.className = 'sv-folder-card sv-add-folder' + (atFolderLimit ? ' sv-locked' : '')
  addCard.innerHTML = atFolderLimit
    ? `
        <div class="sv-lock-icon">🔒</div>
        <div class="sv-folder-name" style="color: rgba(255,255,255,0.35)">Pro only</div>
        <div class="sv-folder-count">${folders.length}/${LIMITS.folders} folders used</div>
      `
    : `
        <div class="sv-add-icon">+</div>
        <div class="sv-folder-name" style="color: rgba(255,255,255,0.35)">New folder</div>
      `

  addCard.addEventListener('click', () => {
    if (atFolderLimit) {
      showUpgradeModal('folders')
    } else {
      startCreate(container, folders)
    }
  })

  grid.appendChild(addCard)

  // ---- FREE TIER USAGE BAR ----
  const allSites = totalSites(folders)
  const usageBar = document.createElement('div')
  usageBar.id = 'sv-usage-bar'
  usageBar.innerHTML = `
    <div id="sv-usage-row">
      <span class="sv-usage-label">Folders</span>
      <span class="sv-usage-count ${folders.length >= LIMITS.folders ? 'sv-usage-maxed' : ''}">${folders.length} / ${LIMITS.folders}</span>
    </div>
    <div id="sv-usage-row2">
      <span class="sv-usage-label">Bookmarks</span>
      <span class="sv-usage-count ${allSites >= LIMITS.sites ? 'sv-usage-maxed' : ''}">${allSites} / ${LIMITS.sites}</span>
    </div>
    <div id="sv-usage-track">
      <div id="sv-usage-fill" style="width: ${Math.min(100, (allSites / LIMITS.sites) * 100)}%"></div>
    </div>
    <div id="sv-upgrade-link">Upgrade to Pro for unlimited →</div>
  `

  usageBar.querySelector('#sv-upgrade-link').addEventListener('click', () => {
    window.open('https://sitevault.app/pricing', '_blank')
  })

  container.appendChild(usageBar)
}

// ================================================================
// ---- VIEW: SITES INSIDE A FOLDER ----
// ================================================================
function renderSites(folder, container) {
  container.innerHTML = ''

  const header = document.createElement('div')
  header.id = 'sv-sites-header'
  header.innerHTML = `
    <button id="sv-back-btn" title="Back to folders">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <span id="sv-folder-title">${escapeHTML(folder.name)}</span>
    <button id="sv-save-tab-btn" title="Save current tab to this folder">
      + Save tab
    </button>
  `
  container.appendChild(header)

  header.querySelector('#sv-back-btn').addEventListener('click', async () => {
    const folders = await Storage.getFolders()
    renderFolders(folders, container)
  })

  const saveBtn = header.querySelector('#sv-save-tab-btn')
  saveBtn.addEventListener('click', async () => {
    const info = getCurrentTabInfo()

    const fresh = await Storage.getFolders()
    const f = fresh.find(x => x.id === folder.id)

    // check duplicate
    if (f && f.sites.some(s => s.url === info.url)) {
      showToast('Already saved in this folder')
      return
    }

    // check sites limit
    const pro = await isPro()
    if (!pro && totalSites(fresh) >= LIMITS.sites) {
      showUpgradeModal('sites')
      return
    }

    saveBtn.textContent = 'Saving...'
    saveBtn.disabled = true

    const site = {
      id: 's_' + Date.now(),
      title: info.title,
      url: info.url,
      favicon: info.favicon,
      savedAt: Date.now()
    }

    const updated = await Storage.addSite(folder.id, site)
    const updatedFolder = updated.find(x => x.id === folder.id)
    renderSites(updatedFolder, container)
  })

  const list = document.createElement('div')
  list.id = 'sv-sites-list'
  container.appendChild(list)

  if (folder.sites.length === 0) {
    list.innerHTML = `
      <div id="sv-empty-state">
        <div id="sv-empty-icon">🔖</div>
        <div id="sv-empty-text">No sites saved yet</div>
        <div id="sv-empty-sub">Click "+ Save tab" to save this page</div>
      </div>
    `
    return
  }

  folder.sites.forEach(site => {
    const row = document.createElement('div')
    row.className = 'sv-site-row'
    row.innerHTML = `
      <img class="sv-site-favicon" src="${escapeHTML(site.favicon)}" alt="" />
      <div class="sv-site-info">
        <div class="sv-site-title">${escapeHTML(site.title)}</div>
        <div class="sv-site-url">${escapeHTML(site.url)}</div>
      </div>
      <button class="sv-site-delete-btn" title="Remove">✕</button>
    `

    const img = row.querySelector('.sv-site-favicon')
    img.addEventListener('error', () => {
      img.style.display = 'none'
      const fallback = document.createElement('div')
      fallback.className = 'sv-site-favicon-fallback'
      fallback.textContent = site.title.charAt(0).toUpperCase()
      img.parentNode.insertBefore(fallback, img)
    })

    row.addEventListener('click', (e) => {
      if (e.target.closest('.sv-site-delete-btn')) return
      window.open(site.url, '_blank')
    })

    row.querySelector('.sv-site-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      row.style.opacity = '0.4'
      row.style.pointerEvents = 'none'
      const updated = await Storage.deleteSite(folder.id, site.id)
      const updatedFolder = updated.find(x => x.id === folder.id)
      renderSites(updatedFolder, container)
    })

    list.appendChild(row)
  })
}

// ================================================================
// ---- TOAST NOTIFICATION ----
// ================================================================
function showToast(message) {
  const existing = document.getElementById('sv-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'sv-toast'
  toast.textContent = message
  document.getElementById('sitevault-tab').appendChild(toast)

  setTimeout(() => toast.classList.add('visible'), 10)
  setTimeout(() => {
    toast.classList.remove('visible')
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}

// ================================================================
// ---- INLINE CREATE ----
// ================================================================
function startCreate(container, folders) {
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

  let confirmed = false

  async function confirm() {
    if (confirmed) return
    confirmed = true
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
    if (e.key === 'Escape') {
      confirmed = true
      renderFolders(folders, container)
    }
    e.stopPropagation()
  })

  input.addEventListener('blur', () => {
    setTimeout(confirm, 150)
  })
}

// ================================================================
// ---- INLINE RENAME ----
// ================================================================
function startRename(id, nameEl, folders) {
  const current = nameEl.textContent
  const input = document.createElement('input')
  input.className = 'sv-folder-input'
  input.value = current
  input.maxLength = 32
  nameEl.replaceWith(input)
  input.focus()
  input.select()

  let confirmed = false

  async function confirm() {
    if (confirmed) return
    confirmed = true
    const name = input.value.trim() || current
    const updated = await Storage.renameFolder(id, name)
    const body = document.getElementById('sitevault-body')
    renderFolders(updated, body)
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') {
      confirmed = true
      input.replaceWith(nameEl)
    }
    e.stopPropagation()
  })

  input.addEventListener('blur', () => setTimeout(confirm, 150))
}

// ================================================================
// ---- MAIN ----
// ================================================================
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

  const body = document.getElementById('sitevault-body')
  let allFolders = []

  Storage.getFolders().then(folders => {
    allFolders = folders
    renderFolders(allFolders, body)
  })

  const searchInput = document.getElementById('sitevault-search')
  searchInput.addEventListener('input', () => {
    if (body.querySelector('#sv-folder-grid')) {
      const filtered = filterFolders(allFolders, searchInput.value)
      renderFolders(filtered, body)
    }
  })
  searchInput.addEventListener('click', e => e.stopPropagation())

  document.getElementById('pro-tab').addEventListener('click', (e) => {
    e.stopPropagation()
    window.open('https://sitevault.app/pricing', '_blank')
  })

  const syncIcon = document.getElementById('sync-icon')
  const syncSvg = document.getElementById('sync-svg')
  syncIcon.addEventListener('click', async (e) => {
    e.stopPropagation()
    syncSvg.classList.add('spinning')
    allFolders = await Storage.getFolders()
    if (body.querySelector('#sv-folder-grid')) {
      renderFolders(allFolders, body)
    }
    setTimeout(() => syncSvg.classList.remove('spinning'), 800)
  })

  let isOpen = false

  function openPanel() {
    tab.classList.add('open')
    overlay.classList.add('open')
    isOpen = true
    searchInput.value = ''
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