chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-sitevault') {
        console.log('Toggling SiteVault panel');
    }    
});