import { PLATFORMS, ACTIONS, DEFAULT_TEMPLATES } from '../shared/menu.js';
import { assemblePrompt, openPlatformWithPrompt } from '../shared/utils.js';

// background service worker
const ROOT_ID = 'send_to_ai_root';

let _buildingMenus = false;
async function buildContextMenus(){
  if(_buildingMenus) return; // already running — skip duplicate invocation
  _buildingMenus = true;
  try{
    // Clear existing
    try{ await chrome.contextMenus.removeAll(); }catch(e){}

    // Helper to create with safe callback to suppress duplicate-id noise
    const safeCreate = (opts)=>{
      try{
        chrome.contextMenus.create(opts, ()=>{
          if(chrome.runtime.lastError){
            // ignore duplicate id errors, log others
            const msg = chrome.runtime.lastError.message || '';
            if(!/duplicate id/.test(msg)) console.warn('contextMenus.create error:', msg, opts.id);
          }
        });
      }catch(e){ console.warn('contextMenus.create threw', e, opts && opts.id); }
    };

    safeCreate({ id: ROOT_ID, title: chrome.i18n.getMessage('extension_name'), contexts: ['selection','link'], icons: { '16': 'src/assets/icons/icon.svg' } });

    // Load user-defined platforms & templates from storage
    const store = await chrome.storage.sync.get({ platforms: [], templates: {}, settings: {} });
    const userPlatforms = store.platforms || [];
    const templates = Object.assign({}, DEFAULT_TEMPLATES, store.templates || {});

    const allPlatforms = [...PLATFORMS, ...userPlatforms];

    // For each platform create menu
    allPlatforms.forEach(platform =>{
      const pId = `platform:${platform.key}`;
      safeCreate({ id: pId, title: chrome.i18n.getMessage(platform.name) || platform.name, parentId: ROOT_ID, contexts: ['selection','link'], icons: { '16': platform.icon } });

      // actions under platform
      ACTIONS.forEach(action =>{
        const aId = `action:${platform.key}|${action.key}`;
        safeCreate({ id: aId, title: chrome.i18n.getMessage(action.name) || action.name, parentId: pId, contexts: ['selection','link'], icons: { '16': action.icon } });

        // templates under action
        if (templates && templates[action.key]) {
          const tList = (templates[action.key] || []).slice(0,8); // limit for menu sanity
          tList.forEach(t =>{
            const tId = `template:${platform.key}|${action.key}|${t.id}`;
            safeCreate({ id: tId, title: chrome.i18n.getMessage(t.name) || t.name, parentId: aId, contexts: ['selection','link'] });
          });
        }

        // allow a 'Custom...' entry
        const customId = `template:${platform.key}|${action.key}|_custom`;
        safeCreate({ id: customId, title: chrome.i18n.getMessage('custom_template_menu'), parentId: aId, contexts: ['selection','link'] });
      });
    });

    // fallback if no platform
    if(allPlatforms.length === 0){
      safeCreate({ id: 'no_platform', title: chrome.i18n.getMessage('no_platforms_configured'), parentId: ROOT_ID, contexts: ['selection','link'] });
    }
  }finally{
    _buildingMenus = false;
  }
}

// Build menus on install and when storage changes
chrome.runtime.onInstalled.addListener(buildContextMenus);
chrome.storage.onChanged.addListener((changes, area)=>{ buildContextMenus(); });

// Also build on startup
buildContextMenus();

chrome.contextMenus.onClicked.addListener(async (info, tab)=>{
  const id = info.menuItemId;
  if(id === 'no_platform'){
    chrome.runtime.openOptionsPage();
    return;
  }

  // parse ids
  // template:<platformKey>|<actionKey>|<templateId>
  if(typeof id === 'string' && id.startsWith('template:')){
    const payload = id.replace('template:', '');
    const [platformKey, actionKey, templateId] = payload.split('|');

    // get selection or link. Prioritize selection, fallback to link
    const mainContent = info.selectionText ? info.selectionText.trim() : (info.linkUrl || '');
    const sourceUrl = info.linkUrl || info.pageUrl || '';

    // load user data
    const store = await chrome.storage.sync.get({ platforms: [], templates: {}, settings: {} });
    const userPlatforms = store.platforms || [];
    const templates = Object.assign({}, DEFAULT_TEMPLATES, store.templates || {});
    const settings = store.settings || {};

    const allPlatforms = [...PLATFORMS, ...userPlatforms];
    const platform = allPlatforms.find(p=>p.key === platformKey) || { key: platformKey, name: platformKey, url: '' };

    // find template
    let template = null;
    if (templates && templates[actionKey]) {
      const tList = templates[actionKey] || [];
      template = tList.find(t=>t.id === templateId);
    }

    if(templateId === '_custom'){
      // Open a small prompt window to get custom template from user
      // Use chrome.windows.create to open options page with query to create custom template
      chrome.runtime.openOptionsPage();
      return;
    }

    // Fallback template if not found
    if(!template){
      template = { id: 'default', name: chrome.i18n.getMessage('default_template_name'), text: (actionKey === 'translate') ? 'Translate to {{targetLang}}: {{selectedText}}' : '{{selectedText}}' };
    }

    // assemble prompt data
    const data = {
      selectedText: mainContent,
      url: sourceUrl,
      targetLang: (settings.defaultLang || 'English'),
      action: actionKey,
      platform: platformKey
    };
    const prompt = assemblePrompt(template.text, data);

    // open platform with prompt
    openPlatformWithPrompt(platform, prompt);
  }
});