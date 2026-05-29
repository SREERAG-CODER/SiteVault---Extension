document.addEventListener('DOMContentLoaded', () => {

  const themeToggle = document.getElementById('theme-toggle')

  // load saved settings
  chrome.storage.sync.get(['lightMode'], (data) => {
    themeToggle.checked = data.lightMode === true
  })

  // when theme toggle changes — save and tell content script
  themeToggle.addEventListener('change', () => {
    const value = themeToggle.checked
    chrome.storage.sync.set({ lightMode: value })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setTheme', value })
      }
    })
  })

})