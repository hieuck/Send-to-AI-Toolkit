import { PLATFORMS, ACTIONS, DEFAULT_TEMPLATES } from '../shared/menu.js';
import { assemblePrompt, openPlatformWithPrompt } from '../shared/utils.js';

const ROOT_ID = 'send_to_ai_root';
let isBuilding = false;

async function buildContextMenus() {
    if (isBuilding) return;
    isBuilding = true;

    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({ 
        id: ROOT_ID, 
        title: chrome.i18n.getMessage('extension_name') || 'Send to AI', 
        contexts: ['selection', 'link'] 
    });

    const store = await chrome.storage.sync.get({ platforms: PLATFORMS, templates: DEFAULT_TEMPLATES });

    if (!store.platforms || store.platforms.length === 0) {
        chrome.contextMenus.create({ 
            id: 'no_platform', 
            title: chrome.i18n.getMessage('no_platforms_configured'), 
            parentId: ROOT_ID, 
            contexts: ['selection', 'link'] 
        });
        isBuilding = false;
        return;
    }

    store.platforms.forEach(platform => {
        const pId = `platform:${platform.key}`;
        const pName = platform.name.startsWith('platform_') 
            ? chrome.i18n.getMessage(platform.name) 
            : platform.name;

        chrome.contextMenus.create({ 
            id: pId, 
            title: pName || platform.key, 
            parentId: ROOT_ID, 
            contexts: ['selection', 'link'] 
        });

        ACTIONS.forEach(action => {
            const aId = `action:${platform.key}|${action.key}`;
            const aName = chrome.i18n.getMessage(action.name) || action.key;

            chrome.contextMenus.create({ 
                id: aId, 
                title: aName, 
                parentId: pId, 
                contexts: ['selection', 'link'] 
            });

            const actionTemplates = (store.templates && store.templates[action.key]) || [];
            if (actionTemplates.length > 0) {
                actionTemplates.slice(0, 8).forEach(t => {
                    const tId = `template:${platform.key}|${action.key}|${t.id}`;
                    const tName = chrome.i18n.getMessage(t.name) || t.name;
                    chrome.contextMenus.create({ 
                        id: tId, 
                        title: tName, 
                        parentId: aId, 
                        contexts: ['selection', 'link']
                    });
                });
            }
        });
    });

    isBuilding = false;
}

chrome.runtime.onInstalled.addListener(buildContextMenus);
chrome.storage.onChanged.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(buildContextMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const id = info.menuItemId;
    if (id === 'no_platform') {
        chrome.runtime.openOptionsPage();
        return;
    }

    const content = info.selectionText ? info.selectionText.trim() : (info.linkUrl || '');
    const store = await chrome.storage.sync.get({ platforms: PLATFORMS, templates: DEFAULT_TEMPLATES, settings: {} });

    if (typeof id === 'string' && id.startsWith('template:')) {
        const [, payload] = id.split(':');
        const [platformKey, actionKey, templateId] = payload.split('|');

        const platform = store.platforms.find(p => p.key === platformKey);
        if (!platform) return;

        console.log('---DEBUG (background.js)--- Platform found:', JSON.stringify(platform));

        let templateText = '{{selectedText}}';
        if (store.templates && store.templates[actionKey]) {
            const template = store.templates[actionKey].find(t => t.id === templateId);
            if (template) {
                templateText = chrome.i18n.getMessage(template.text) || template.text;
            }
        }

        const prompt = assemblePrompt(templateText, {
            selectedText: content,
            url: info.pageUrl,
            targetLang: store.settings.defaultLang || 'English'
        });

        openPlatformWithPrompt(platform, prompt);
    } else if (typeof id === 'string' && id.startsWith('action:')) {
        const [, payload] = id.split(':');
        const [platformKey, actionKey] = payload.split('|');

        const platform = store.platforms.find(p => p.key === platformKey);
        if (!platform) return;
        
        console.log('---DEBUG (background.js)--- Platform found:', JSON.stringify(platform));

        // Find the action to get the default template
        const action = ACTIONS.find(a => a.key === actionKey);
        if (!action) return;

        // Use a generic prompt for direct actions
        const prompt = assemblePrompt("{{selectedText}}", {
            selectedText: content,
            url: info.pageUrl,
            targetLang: store.settings.defaultLang || 'English'
        });

        openPlatformWithPrompt(platform, prompt);
    }
});
