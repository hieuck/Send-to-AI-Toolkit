import { PLATFORMS, ACTIONS, DEFAULT_TEMPLATES } from '../shared/menu.js';
import { assemblePrompt } from '../shared/utils.js';
import { fetchMessages, getMessage } from '../shared/i18n.js';

// --- Menu Creation ---

async function createContextMenu() {
    const store = await chrome.storage.sync.get({ settings: { locale: 'en' } });
    await fetchMessages(store.settings.locale || 'en');

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'send-to-ai-toolkit',
            title: getMessage('send_to_ai_toolkit'),
            contexts: ['selection']
        });

        PLATFORMS.forEach(platform => {
            const parentId = `platform-${platform.key}`;
            chrome.contextMenus.create({
                id: parentId,
                parentId: 'send-to-ai-toolkit',
                title: getMessage(platform.name),
                contexts: ['selection']
            });

            ACTIONS.forEach(action => {
                chrome.contextMenus.create({
                    id: `${parentId}-${action.key}`,
                    parentId: parentId,
                    title: getMessage(action.name),
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const { menuItemId, selectionText } = info;
    const [platformId, actionKey] = menuItemId.replace('platform-', '').split('-');

    const platform = PLATFORMS.find(p => p.key === platformId);

    if (platform && selectionText) {
		let text = selectionText;
        const action = ACTIONS.find(a => a.key === actionKey);
        if (action) {
            const template = DEFAULT_TEMPLATES[action.key][0];
            if (template) {
                const store = await chrome.storage.sync.get({ settings: { defaultLang: 'English', locale: 'en' } });
                await fetchMessages(store.settings.locale || 'en');
                const targetLang = store.settings.defaultLang;
                const templateText = getMessage(template.text);
                text = assemblePrompt(templateText, { selectedText: selectionText, targetLang: targetLang });
            }
        }
		
        // Create the tab
        chrome.tabs.create({ url: platform.url }, newTab => {
            const listener = (tabId, changeInfo) => {
                if (tabId === newTab.id && changeInfo.status === 'complete') {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'execute',
                        text: text,
                        inputSelector: platform.inputSelector,
                        sendSelector: platform.sendSelector
                    });
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
});