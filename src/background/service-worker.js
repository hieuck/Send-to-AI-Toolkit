import { PLATFORMS, ACTIONS, DEFAULT_TEMPLATES } from '../shared/menu.js';
import { geti18n, __ } from '../shared/i18n.js';

// --- Menu Creation ---

function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'send-to-ai-toolkit',
            title: 'Send to AI Toolkit',
            contexts: ['selection']
        });

        PLATFORMS.forEach(platform => {
            const parentId = `platform-${platform.key}`;
            chrome.contextMenus.create({
                id: parentId,
                parentId: 'send-to-ai-toolkit',
                title: __(platform.name),
                contexts: ['selection']
            });

            ACTIONS.forEach(action => {
                chrome.contextMenus.create({
                    id: `${parentId}-${action.key}`,
                    parentId: parentId,
                    title: __(action.name),
                    contexts: ['selection']
                });
            });
        });
    });
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const { menuItemId, selectionText } = info;
    const [platformId, actionKey] = menuItemId.replace('platform-', '').split('-');

    const platform = PLATFORMS.find(p => p.key === platformId);

    if (platform && selectionText) {
		let text = selectionText;
        const action = ACTIONS.find(a => a.key === actionKey);
        if (action) {
            const template = DEFAULT_TEMPLATES[action.key][0];
            if (template) {
                text = __(template.text, selectionText);
            }
        }
		
        // Create the tab
        chrome.tabs.create({ url: platform.url }, newTab => {
            // We need to wait for the tab to be fully loaded before sending the message
            const listener = (tabId, changeInfo, tab) => {
                if (tabId === newTab.id && changeInfo.status === 'complete') {
                    console.log(`[Send-to-AI] Tab ${tabId} loaded. Sending execute message.`);
                    
                    // Send the message to the content script
                    chrome.tabs.sendMessage(tabId, {
                        action: 'execute',
                        text: text,
                        inputSelector: platform.inputSelector,
                        sendSelector: platform.sendSelector
                    });

                    // Remove the listener to avoid it firing again
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });
    }
});