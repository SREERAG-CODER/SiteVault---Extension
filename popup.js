document.addEventListener('DOMContentLoaded', () => {

  const themeToggle = document.getElementById('theme-toggle')
  const importBtn = document.getElementById('import-btn')
  const importStatus = document.getElementById('import-status')

  // ---- LOAD SAVED SETTINGS ----
  chrome.storage.sync.get(['lightMode'], (data) => {
    themeToggle.checked = data.lightMode === true
  })

  // ---- THEME TOGGLE ----
  themeToggle.addEventListener('change', () => {
    const value = themeToggle.checked
    chrome.storage.sync.set({ lightMode: value })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setTheme', value })
      }
    })
  })

  // ---- IMPORT BOOKMARKS ----
  importBtn.addEventListener('click', async () => {
    importBtn.disabled = true
    importBtn.textContent = 'Importing...'
    importStatus.textContent = ''
    importStatus.className = ''

    try {
      // ask background script to read the bookmarks tree
      const response = await chrome.runtime.sendMessage({ action: 'getBookmarks' })

      if (!response || !response.folders) {
        throw new Error('No bookmarks found')
      }

      const importedFolders = response.folders

      if (importedFolders.length === 0) {
        importStatus.textContent = 'No bookmark folders found to import.'
        importStatus.className = ''
        importBtn.disabled = false
        importBtn.textContent = 'Import'
        return
      }

      // merge into existing SiteVault storage
      const existing = await chrome.storage.local.get(['folders'])
      const currentFolders = existing.folders || []

      // avoid duplicate folder names — skip folders that already exist by name
      const existingNames = new Set(currentFolders.map(f => f.name.toLowerCase()))
      const newFolders = importedFolders.filter(f => !existingNames.has(f.name.toLowerCase()))
      const skipped = importedFolders.length - newFolders.length

      const merged = [...currentFolders, ...newFolders]
      await chrome.storage.local.set({ folders: merged })

      // build status message
      const totalSites = newFolders.reduce((sum, f) => sum + f.sites.length, 0)
      let msg = `Imported ${newFolders.length} folder${newFolders.length !== 1 ? 's' : ''} and ${totalSites} bookmark${totalSites !== 1 ? 's' : ''}.`
      if (skipped > 0) msg += ` Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}.`

      importStatus.textContent = msg
      importStatus.className = 'success'
      importBtn.textContent = 'Import again'

    } catch (err) {
      importStatus.textContent = 'Import failed. Try again.'
      importStatus.className = 'error'
      importBtn.textContent = 'Import'
      console.error('SiteVault import error:', err)
    }

    importBtn.disabled = false
  })

})