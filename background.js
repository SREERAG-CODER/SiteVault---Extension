// ================================================================
// CONFIG — update this after deploying to Render
// ================================================================
const API_URL = 'https://your-app-name.onrender.com' // ← change this

const GOOGLE_CLIENT_ID = '100246703007-0vri94jk829bdntumivv2br7e13oihqs.apps.googleusercontent.com'

// ================================================================
// TOGGLE PANEL SHORTCUT
// ================================================================
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sitevault') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' })
      }
    })
  }
})

// ================================================================
// MESSAGE HANDLER
// ================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ---- IMPORT CHROME BOOKMARKS ----
  if (message.action === 'getBookmarks') {
    chrome.bookmarks.getTree((tree) => {
      const folders = []

      function processNode(node, parentName) {
        if (node.children) {
          const skipNames = ['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks', '']
          const folderName = node.title || parentName
          const sites = []
          const subFolders = []

          node.children.forEach(child => {
            if (child.url) {
              sites.push({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                title: child.title || child.url,
                url: child.url,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(child.url).hostname}&sz=32`,
                savedAt: child.dateAdded || Date.now()
              })
            } else if (child.children) {
              subFolders.push(child)
            }
          })

          if (!skipNames.includes(node.title)) {
            if (sites.length > 0) {
              folders.push({
                id: 'f_import_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                name: folderName,
                sites,
                createdAt: Date.now()
              })
            }
          } else {
            if (sites.length > 0 && node.title) {
              folders.push({
                id: 'f_import_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                name: node.title,
                sites,
                createdAt: Date.now()
              })
            }
          }
          subFolders.forEach(sub => processNode(sub, sub.title))
        }
      }

      if (tree[0] && tree[0].children) {
        tree[0].children.forEach(node => processNode(node, node.title))
      }

      sendResponse({ folders })
    })
    return true
  }

  // ---- GOOGLE SIGN IN ----
  if (message.action === 'googleSignIn') {
    const redirectUri = chrome.identity.getRedirectURL()
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${GOOGLE_CLIENT_ID}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}`

    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        sendResponse({ error: chrome.runtime.lastError?.message || 'Google sign-in cancelled' })
        return
      }

      const params = new URLSearchParams(new URL(responseUrl).hash.substring(1))
      const token = params.get('access_token')
      if (!token) {
        sendResponse({ error: 'No access token returned' })
        return
      }

      try {
        const res = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token })
        })
        const data = await res.json()
        if (!res.ok) {
          sendResponse({ error: data.error || 'Google sign-in failed' })
          return
        }

        await chrome.storage.sync.set({ authToken: data.token, authUser: data.user })
        sendResponse({ success: true, user: data.user })
      } catch (err) {
        sendResponse({ error: 'Network error — check your connection' })
      }
    })
    return true
  }

  // ---- SIGN OUT ----
  if (message.action === 'signOut') {
    chrome.storage.sync.remove(['authToken', 'authUser'], () => {
      sendResponse({ success: true })
    })
    return true
  }

})