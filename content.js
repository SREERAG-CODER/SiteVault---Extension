//Run Only After Page Load
window.addEventListener('load', () => {
    //Create Overlay Element
    const overlay = document.createElement('div'); 
    overlay.id = 'sitevault-overlay'; 
    document.body.appendChild(overlay);
    //Create Panel Element
    const panel = document.createElement('div');
    panel.id = 'sitevault-panel';
    panel.innerHTML = `
        <div id="sitevault-header">
            <h1>SiteVault</h1>
        </div>
        <div id="sitevault-body">
            Your folders will appear here.
        </div>
    `;
    document.body.appendChild(panel);
    //Create The Floating  Tab On The Left Side
    const tab = document.createElement('div');
    tab.id = 'sitevault-tab'; 
    tab.innerHTML = '<span id="sitevault-label">SiteVault</span>';
    document.body.appendChild(tab); 
    //Track Panel State
    let isOpen = false;
    //Toggle Panel Function
    function openPanel() {
        panel.classList.add('open');
        overlay.classList.add('open');
        isOpen = true;
    }
    function closePanel() {
        panel.classList.remove('open');
        overlay.classList.remove('open');
        isOpen = false;
    }
    //Tab Click Event To Toggle Panel
    tab.addEventListener('click', () => {
        if (isOpen) {
            closePanel();
        } else {
            openPanel();
        }
    
    });
    //Close Panel When Clicking Outside
    Overlay.addEventListener('click', () => {
        closePanel();
    });

})    