window.addEventListener('load', () => {

  // ---- CREATE OVERLAY ----
  const overlay = document.createElement('div')
  overlay.id = 'sitevault-overlay'
  document.body.appendChild(overlay)

  // ---- CREATE TAB (morphs into panel) ----
  const tab = document.createElement('div')
  tab.id = 'sitevault-tab'
  tab.innerHTML = `
    <span id="sitevault-label">SiteVault</span>
    <div id="sitevault-content">
      <div id="sitevault-header">
        <h1>SiteVault</h1>
      </div>
      <div id="sitevault-body">
        Your folders will appear here.
      </div>
    </div>
  `
  document.body.appendChild(tab)

  // ---- OPEN / CLOSE ----
  let isOpen = false

  function openPanel() {
    tab.classList.add('open')
    overlay.classList.add('open')
    isOpen = true
  }

  function closePanel() {
    tab.classList.remove('open')
    overlay.classList.remove('open')
    isOpen = false
  }

  // click tab to open only when closed
  tab.addEventListener('click', () => {
    if (!isOpen) openPanel()
  })

  // click overlay to close
  overlay.addEventListener('click', () => {
    closePanel()
  })

  // listen for settings changes from popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'setPanelSize') {
      if (isOpen) tab.style.width = message.value + 'vw'
    }
  })

})