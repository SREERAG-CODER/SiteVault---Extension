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
        <div id="sync-icon">
          <svg id="sync-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
          </svg>
        </div>
        <div id="sitevault-header-right">
          <input type="text" id="sitevault-search" placeholder="Search..." />
          <span id="pro-tab">PRO</span>
        </div>
      </div>

      <div id="sitevault-body">
        Your folders will appear here.
      </div>

    </div>
  `
  document.body.appendChild(tab)

  // ---- PRO TAB CLICK ----
  const proTab = document.getElementById('pro-tab')
  proTab.addEventListener('click', (e) => {
    e.stopPropagation()
    window.open('https://sitevault.app/pricing', '_blank')
  })

  // ---- SYNC ICON CLICK (simulate sync animation) ----
  const syncIcon = document.getElementById('sync-icon')
  const syncSvg = document.getElementById('sync-svg')
  syncIcon.addEventListener('click', (e) => {
    e.stopPropagation()
    syncSvg.classList.add('spinning')
    setTimeout(() => syncSvg.classList.remove('spinning'), 1500)
  })

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

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'togglePanel') {
      if (isOpen) {
        closePanel()
      } else {
        openPanel()
      }
    }
  })

  tab.addEventListener('click', () => {
    if (!isOpen) openPanel()
  })

  overlay.addEventListener('click', () => {
    closePanel()
  })

})