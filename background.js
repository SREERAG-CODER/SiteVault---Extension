// ---- TOGGLE PANEL SHORTCUT ----
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sitevault') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' })
      }
    })
  }
})

// ---- IMPORT CHROME BOOKMARKS ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getBookmarks') {
    chrome.bookmarks.getTree((tree) => {
      // Chrome's bookmark tree:
      // tree[0] = root
      //   children[0] = "Bookmarks Bar"
      //   children[1] = "Other Bookmarks"
      //   children[2] = "Mobile Bookmarks" (sometimes)

      const folders = []

      function processNode(node, parentName) {
        // it's a folder if it has children
        if (node.children) {
          // skip root and the top-level Chrome system folders by name
          const skipNames = ['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks', '']
          const folderName = node.title || parentName

          const sites = []
          const subFolders = []

          node.children.forEach(child => {
            if (child.url) {
              // it's a bookmark
              sites.push({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                title: child.title || child.url,
                url: child.url,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(child.url).hostname}&sz=32`,
                savedAt: child.dateAdded || Date.now()
              })
            } else if (child.children) {
              // it's a subfolder — recurse
              subFolders.push(child)
            }
          })

          // add this folder if it has sites OR if it's not a skip-name
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
            // for system folders (Bookmarks Bar, Other), promote their direct bookmarks
            // into a "Bookmarks Bar" / "Other Bookmarks" folder only if they have sites
            if (sites.length > 0 && node.title) {
              folders.push({
                id: 'f_import_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                name: node.title,
                sites,
                createdAt: Date.now()
              })
            }
          }

          // always recurse into subfolders
          subFolders.forEach(sub => processNode(sub, sub.title))

        }
      }

      // start from root's children (the system-level folders)
      if (tree[0] && tree[0].children) {
        tree[0].children.forEach(node => processNode(node, node.title))
      }

      sendResponse({ folders })
    })

    return true // keep message channel open for async response
  }
})