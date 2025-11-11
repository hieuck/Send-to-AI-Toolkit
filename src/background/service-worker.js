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
            const platformId = `platform-${platform.key}`;
            chrome.contextMenus.create({
                id: platformId,
                parentId: 'send-to-ai-toolkit',
                title: getMessage(platform.name),
                contexts: ['selection']
            });

            ACTIONS.forEach(action => {
                const actionId = `${platformId}-${action.key}`;
                chrome.contextMenus.create({
                    id: actionId,
                    parentId: platformId,
                    title: getMessage(action.name),
                    contexts: ['selection']
                });

                const templates = DEFAULT_TEMPLATES[action.key];
                templates.forEach((template, index) => {
                    chrome.contextMenus.create({
                        id: `${actionId}-template-${index}`,
                        parentId: actionId,
                        title: getMessage(template.name),
                        contexts: ['selection']
                    });
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
    chrome.storage.sync.get(null, (items) => {
        console.log('[AI Toolkit] Storage dump:', items);
        if (items.settings && items.settings.urlBase) {
            console.log('[AI Toolkit] Saved base URL from storage:', items.settings.urlBase);
        } else {
            console.log('[AI Toolkit] Saved base URL from storage is null or not set.');
        }
    });

    const { menuItemId, selectionText } = info;
    const parts = menuItemId.replace('platform-', '').split('-');
    const [platformKey, actionKey, _, templateIndex] = parts;

    const platform = PLATFORMS.find(p => p.key === platformKey);

    if (platform) {
        console.log('[AI Toolkit] Platform found:', platform);
        console.log('[AI Toolkit] Default platform URL:', platform.url);
    } else {
        console.log('[AI Toolkit] Platform not found for key:', platformKey);
    }

    if (platform && selectionText) {
		let text = selectionText;
        const action = ACTIONS.find(a => a.key === actionKey);

        if (action && templateIndex !== undefined) {
            const template = DEFAULT_TEMPLATES[action.key][templateIndex];
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