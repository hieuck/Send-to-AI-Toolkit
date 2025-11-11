import { PLATFORMS, ACTIONS, DEFAULT_TEMPLATES } from '../shared/menu.js';
import { assemblePrompt } from '../shared/utils.js';
import { fetchMessages, getMessage } from '../shared/i18n.js';

// --- Menu Creation ---

async function createContextMenu() {
    // Load user's settings, platforms, and templates from storage, with defaults
    const store = await chrome.storage.sync.get({
        platforms: PLATFORMS,
        templates: DEFAULT_TEMPLATES,
        settings: { locale: 'en' }
    });
    await fetchMessages(store.settings.locale || 'en');

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'send-to-ai-toolkit',
            title: getMessage('send_to_ai_toolkit'),
            contexts: ['selection'],
            icons: {
                '16': 'src/assets/icons/icon16.svg'
            }
        });

        // Build menu from user-configured platforms
        store.platforms.forEach(platform => {
            const platformId = `platform-${platform.key}`;
            const platformName = platform.name.startsWith('platform_') ? getMessage(platform.name) : platform.name;

            chrome.contextMenus.create({
                id: platformId,
                parentId: 'send-to-ai-toolkit',
                title: platformName,
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

                const templates = store.templates[action.key] || [];
                templates.forEach((template, index) => {
                    chrome.contextMenus.create({
                        id: `${actionId}-template-${index}`,
                        parentId: actionId,
                        title: getMessage(template.name, template.name),
                        contexts: ['selection']
                    });
                });
            });
        });
    });
}

// --- Event Listeners ---

// Rebuild menu on install or update
chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

// Listen for changes from the options page to rebuild the context menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'rebuildMenu') {
        createContextMenu();
        sendResponse({ status: 'ok' });
    }
    return true; // Required for async sendResponse
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const { menuItemId, selectionText } = info;
    if (!selectionText || !menuItemId.startsWith('platform-')) {
        return;
    }

    const parts = menuItemId.replace('platform-', '').split('-');
    const [platformKey, actionKey, _, templateIndex] = parts;

    // Load latest data from storage to ensure we have the correct URL and templates
    const store = await chrome.storage.sync.get({
        platforms: PLATFORMS,
        templates: DEFAULT_TEMPLATES,
        settings: { defaultLang: 'English', locale: 'en' }
    });

    const platform = store.platforms.find(p => p.key === platformKey);

    if (platform) {
        let text = selectionText;
        const action = ACTIONS.find(a => a.key === actionKey);

        if (action && templateIndex !== undefined) {
            const template = (store.templates[action.key] || [])[Number(templateIndex)];
            if (template) {
                await fetchMessages(store.settings.locale || 'en');
                const targetLang = store.settings.defaultLang;
                const templateText = getMessage(template.text, template.text);
                text = assemblePrompt(templateText, { selectedText: selectionText, targetLang: targetLang });
            }
        }

        // Create the tab using the URL from the user-configured platform
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
