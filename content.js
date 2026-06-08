// ================================================================
// ---- FREE TIER LIMITS ----
// ================================================================
const LIMITS = {
  folders: 3,
  sites: 50
}

// ================================================================
// ---- GLOBAL STATE ----
// ================================================================
let allFolders = []

function isPro() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['isPro'], (data) => {
      resolve(data.isPro === true)
    })
  })
}

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
// ---- AUTH ----
// ================================================================
const API_URL = 'https://your-app-name.onrender.com' // <- update after deploying

const Auth = {
  getSession() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['authToken', 'authUser'], (data) => {
        resolve({ token: data.authToken || null, user: data.authUser || null })
      })
    })
  },
  setSession(token, user) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ authToken: token, authUser: user }, resolve)
    })
  },
  clearSession() {
    return new Promise((resolve) => {
      chrome.storage.sync.remove(['authToken', 'authUser'], resolve)
    })
  }
}

// ================================================================
// ---- HEADER VISIBILITY HELPERS ----
// ================================================================
function hideHeader() {
  const header = document.getElementById('sitevault-header')
  if (header) header.style.display = 'none'
}

function showHeader() {
  const header = document.getElementById('sitevault-header')
  if (header) header.style.display = ''
}

// ================================================================
// ---- RENDER AUTH SCREEN ----
// ================================================================
function renderAuthScreen(container) {
  container.innerHTML = ''

  // Hide the top header bar on the login screen
  hideHeader()

  const bar = document.getElementById('sv-usage-bar')
  if (bar) bar.remove()

  let mode = 'login'

  function buildScreen() {
    container.innerHTML = `
      <div id="sv-auth-screen">

        <div id="sv-auth-logo">🗄️</div>
        <div id="sv-auth-title">SiteVault</div>
        <div id="sv-auth-subtitle">Sign in to save and sync your bookmarks</div>

        <button id="sv-google-btn">
          <svg class="sv-google-icon" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div id="sv-auth-divider"><span>or ${mode === 'login' ? 'sign in' : 'sign up'} with email</span></div>

        <div id="sv-auth-form">
          ${mode === 'signup' ? `<input class="sv-auth-input" id="sv-auth-name" type="text" placeholder="Your name" autocomplete="name" />` : ''}
          <input class="sv-auth-input" id="sv-auth-email" type="email" placeholder="Email address" autocomplete="email" />
          <input class="sv-auth-input" id="sv-auth-password" type="password" placeholder="Password${mode === 'signup' ? ' (min 8 chars)' : ''}" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" />
          <div id="sv-auth-error"></div>
          <button class="sv-auth-btn" id="sv-auth-submit">
            ${mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div id="sv-auth-toggle">
          ${mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button id="sv-auth-toggle-btn">${mode === 'login' ? 'Sign up' : 'Sign in'}</button>
        </div>

        <button id="sv-skip-btn">Skip for now →</button>

      </div>
    `

    const errorEl = document.getElementById('sv-auth-error')
    const submitBtn = document.getElementById('sv-auth-submit')

    function setError(msg) { errorEl.textContent = msg }
    function setLoading(on) {
      submitBtn.disabled = on
      submitBtn.textContent = on ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')
    }

    function onSuccess(user) {
      showHeader()
      renderMainPanel(container, user)
    }

    document.getElementById('sv-google-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      const btn = document.getElementById('sv-google-btn')
      btn.disabled = true
      setError('')
      chrome.runtime.sendMessage({ action: 'googleSignIn' }, (res) => {
        btn.disabled = false
        if (res?.error) { setError(res.error); return }
        if (res?.success) onSuccess(res.user)
      })
    })

    document.getElementById('sv-auth-submit').addEventListener('click', async (e) => {
      e.stopPropagation()
      setError('')

      const email = document.getElementById('sv-auth-email')?.value.trim()
      const password = document.getElementById('sv-auth-password')?.value
      const name = document.getElementById('sv-auth-name')?.value.trim()

      if (!email || !password) { setError('Please fill in all fields'); return }

      setLoading(true)

      try {
        const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
        const body = mode === 'login' ? { email, password } : { email, password, name }

        const res = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const data = await res.json()

        if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }

        await Auth.setSession(data.token, data.user)
        onSuccess(data.user)
      } catch {
        setError('Network error — check your connection')
        setLoading(false)
      }
    })

    container.querySelectorAll('.sv-auth-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('sv-auth-submit').click()
        e.stopPropagation()
      })
    })

    document.getElementById('sv-auth-toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      mode = mode === 'login' ? 'signup' : 'login'
      buildScreen()
    })

    document.getElementById('sv-skip-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      showHeader()
      renderMainPanel(container, { name: 'Local User', email: '', avatar_url: null })
    })
  }

  buildScreen()
}

// ================================================================
// ---- RENDER MAIN PANEL (called after successful auth) ----
// ================================================================
function renderMainPanel(container, user) {
  showHeader()

  const headerRight = document.getElementById('sitevault-header-right')
  if (headerRight) {
    const avatarHTML = user.avatar_url
      ? `<img id="sv-user-avatar" src="${escapeHTML(user.avatar_url)}" alt="" />`
      : `<div id="sv-user-avatar-fallback">${(user.name || user.email || '?').charAt(0).toUpperCase()}</div>`

    headerRight.innerHTML = `
      <input type="text" id="sitevault-search" placeholder="Search folders..." />
      <div id="sv-user-area">
        ${avatarHTML}
        <button id="sv-signout-btn">Sign out</button>
      </div>
    `

    document.getElementById('sv-signout-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      chrome.runtime.sendMessage({ action: 'signOut' }, () => {
        renderAuthScreen(container)
      })
    })

    bindSearch(container)
  }

  Storage.getFolders().then(folders => {
    allFolders = folders
    renderFolders(allFolders, container)
  })
}

// ================================================================
// ---- BIND SEARCH ----
// ================================================================
function bindSearch(container) {
  const searchInput = document.getElementById('sitevault-search')
  if (!searchInput) return
  searchInput.addEventListener('input', () => {
    if (container.querySelector('#sv-folder-grid')) {
      const filtered = filterFolders(allFolders, searchInput.value)
      renderFolders(filtered, container)
    }
  })
  searchInput.addEventListener('click', e => e.stopPropagation())
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
  modal.querySelector('#sv-upgrade-close').addEventListener('click', () => modal.remove())
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })
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
  const existingUsageBar = document.getElementById('sv-usage-bar')
  if (existingUsageBar) existingUsageBar.remove()

  container.innerHTML = ''

  const folderView = document.createElement('div')
  folderView.id = 'sv-folder-view'
  container.appendChild(folderView)

  const grid = document.createElement('div')
  grid.id = 'sv-folder-grid'
  folderView.appendChild(grid)

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
    if (atFolderLimit) showUpgradeModal('folders')
    else startCreate(container, folders)
  })

  grid.appendChild(addCard)

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

  document.getElementById('sitevault-content').appendChild(usageBar)
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

    if (f && f.sites.some(s => s.url === info.url)) {
      showToast('Already saved in this folder')
      return
    }

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
    if (e.key === 'Escape') { confirmed = true; renderFolders(folders, container) }
    e.stopPropagation()
  })

  input.addEventListener('blur', () => setTimeout(confirm, 150))
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
    if (e.key === 'Escape') { confirmed = true; input.replaceWith(nameEl) }
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

  // ---- AUTH-AWARE STARTUP ----
  Auth.getSession().then(({ token, user }) => {
    if (token && user) {
      renderMainPanel(body, user)
    } else {
      renderAuthScreen(body)
    }
  })

  document.getElementById('sitevault-search').addEventListener('click', e => e.stopPropagation())

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
    const si = document.getElementById('sitevault-search')
    if (si) si.value = ''
    Auth.getSession().then(({ token, user }) => {
      if (token && user) {
        renderMainPanel(body, user)
      } else {
        renderAuthScreen(body)
      }
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