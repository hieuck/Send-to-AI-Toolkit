// options.js - UI logic for the options page
import { DEFAULT_TEMPLATES, PLATFORMS } from '../shared/menu.js';
import { fetchMessages, getMessage, localizePage } from '../shared/i18n.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English', locale: 'en' } };

// Helper function to notify the service worker to rebuild the context menu
function notifyServiceWorker() {
    chrome.runtime.sendMessage({ action: "rebuildMenu" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending rebuildMenu message:", chrome.runtime.lastError.message);
        }
    });
}

/* --- Toast notification helpers --- */
function showToast(messageKey, { type='info', timeout=3000 } = {}){
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='success' ? 'success' : type==='error' ? 'error' : '');
  t.innerHTML = `<div class="toast-msg">${getMessage(messageKey, messageKey)}</div>`; // Translate the message
  container.appendChild(t);
  if(timeout > 0){ setTimeout(()=>{ t.remove(); }, timeout); }
  return t;
}

function confirmToast(messageKey, { yesLabel=null, noLabel=null, timeout=8000 } = {}){
  return new Promise((resolve)=>{
    const t = showToast(messageKey, { timeout:0 });
    const actions = document.createElement('div');
    actions.className = 'toast-actions';
    const yes = document.createElement('button');
    yes.className = 'btn-inline primary';
    yes.textContent = yesLabel || getMessage('toast_yes','Yes');
    const no = document.createElement('button');
    no.className = 'btn-inline';
    no.textContent = noLabel || getMessage('toast_no','No');
    actions.appendChild(no);
    actions.appendChild(yes);
    t.appendChild(actions);

    function cleanup(result){ t.remove(); resolve(result); }
    yes.addEventListener('click', ()=>cleanup(true));
    no.addEventListener('click', ()=>cleanup(false));
    if(timeout > 0){ setTimeout(()=>cleanup(false), timeout); }
  });
}

/* --- Data Loading and Rendering --- */
async function load(){
  const store = await chrome.storage.sync.get(defaultState);
  document.getElementById('defaultLang').value = (store.settings && store.settings.defaultLang) || 'English';
  
  let platforms = store.platforms || [];
  if(platforms.length === 0){
    platforms = PLATFORMS.map(p=>({ ...p }));
    await chrome.storage.sync.set({ platforms });
  }
  
  // Merge default templates with stored templates to ensure new defaults are added
  const templates = store.templates || {};
  let templatesModified = false;
  for (const action in DEFAULT_TEMPLATES) {
    if (!templates[action]) {
      templates[action] = [];
    }
    const existingNames = new Set(templates[action].map(t => t.name));
    const newDefaults = DEFAULT_TEMPLATES[action].filter(t => !existingNames.has(t.name));
    if (newDefaults.length > 0) {
      templates[action].push(...newDefaults.map(t => ({...t}))); // Push copies
      templatesModified = true;
    }
  }

  if (templatesModified) {
    await chrome.storage.sync.set({ templates });
  }

  renderPlatforms(platforms);
  renderTemplates(templates);
}

function renderPlatforms(list){
  const container = document.getElementById('platformList');
  container.innerHTML = '';
  if(!list || list.length === 0){ container.innerHTML = `<p class="muted">${getMessage('no_platforms_configured', 'No platforms configured.')}</p>`; return; }
  list.forEach((p, idx)=>{
    const div = document.createElement('div');
    div.className = 'list-item';
    const name = p.name.startsWith('platform_') ? getMessage(p.name) : p.name;
    div.innerHTML = `
      <div class="list-item-details">
        <div class="list-item-title">${name}</div>
        <div class="list-item-desc">${p.url || ''}</div>
      </div>
      <div class="actions">
        <button data-idx="${idx}" class="open secondary">${getMessage('open_label', 'Open')}</button>
        <button data-idx="${idx}" class="edit secondary">${getMessage('edit_label', 'Edit')}</button>
        <button data-idx="${idx}" class="del secondary">${getMessage('delete_label', 'Delete')}</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('button.open').forEach(b=>b.addEventListener('click', onOpenPlatform));
  container.querySelectorAll('button.edit').forEach(b=>b.addEventListener('click', onEditPlatform));
  container.querySelectorAll('button.del').forEach(b=>b.addEventListener('click', onDeletePlatform));
}

function renderTemplates(map){
  const container = document.getElementById('templateList');
  container.innerHTML = '';
  if(!map || Object.keys(map).length === 0){ container.innerHTML = `<p class="muted">${getMessage('no_templates_configured', 'No templates configured.')}</p>`; return; }
  for(const action of Object.keys(map)){
    (map[action]||[]).forEach((t, idx)=>{
      const div = document.createElement('div');
      div.className = 'list-item';
      const name = getMessage(t.name) || t.name;
      div.innerHTML = `
        <div class="list-item-details">
          <div class="list-item-title">${name}</div>
          <div class="list-item-desc">${getMessage('modal_label_action', 'Action')}: <strong>${getMessage('action_'+action, action)}</strong></div>
        </div>
        <div class="actions">
          <button data-action="${action}" data-idx="${idx}" class="editT secondary">${getMessage('edit_label', 'Edit')}</button>
          <button data-action="${action}" data-idx="${idx}" class="delT secondary">${getMessage('delete_label', 'Delete')}</button>
        </div>`;
      container.appendChild(div);
    });
  }
  container.querySelectorAll('button.editT').forEach(b=>b.addEventListener('click', onEditTemplate));
  container.querySelectorAll('button.delT').forEach(b=>b.addEventListener('click', onDeleteTemplate));
}

/* --- Event Handlers --- */
async function onOpenPlatform(e){
  const idx = Number(e.target.dataset.idx);
  const store = await chrome.storage.sync.get(defaultState);
  const platform = store.platforms[idx];
  if (platform && platform.url) {
    window.open(platform.url, '_blank');
  }
}
async function onEditPlatform(e){ showModal('platform', { idx: Number(e.target.dataset.idx) }); }
async function onEditTemplate(e){ showModal('template', { action: e.target.dataset.action, idx: Number(e.target.dataset.idx) }); }

async function onDeletePlatform(e){
  const idx = Number(e.target.dataset.idx);
  if(await confirmToast('delete_confirm_platform')){
    const store = await chrome.storage.sync.get(defaultState);
    store.platforms.splice(idx,1);
    await chrome.storage.sync.set({platforms: store.platforms});
    load();
    showToast('settings_saved', { type:'success' });
    notifyServiceWorker();
  }
}

async function onDeleteTemplate(e){
  const { action, idx } = e.target.dataset;
  if(await confirmToast('delete_confirm_template')){
    const store = await chrome.storage.sync.get(defaultState);
    store.templates[action].splice(Number(idx),1);
    await chrome.storage.sync.set({templates: store.templates});
    load();
    showToast('settings_saved', { type:'success' });
    notifyServiceWorker();
  }
}

/* --- Import/Export --- */
async function exportTemplates() {
  const store = await chrome.storage.sync.get(defaultState);
  const templatesToExport = {};

  // Only export user-defined templates, not default ones.
  for (const action in store.templates) {
    templatesToExport[action] = store.templates[action].filter(template => 
      !Object.values(DEFAULT_TEMPLATES).flat().some(defaultTpl => defaultTpl.name === template.name)
    );
  }

  const blob = new Blob([JSON.stringify(templatesToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'send-to-ai-templates.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTemplates(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedTemplates = JSON.parse(e.target.result);
      const store = await chrome.storage.sync.get(defaultState);

      for (const action in importedTemplates) {
        if (!store.templates[action]) {
          store.templates[action] = [];
        }

        const existingNames = new Set(store.templates[action].map(t => t.name));
        const newTemplates = importedTemplates[action].filter(t => !existingNames.has(t.name));
        store.templates[action].push(...newTemplates);
      }

      await chrome.storage.sync.set({ templates: store.templates });
      load();
      showToast('templates_imported_success', { type: 'success' });
      notifyServiceWorker();
    } catch (error) {
      console.error("Error importing templates:", error);
      showToast('template_import_error', { type: 'error' });
    }

    // Reset file input so the same file can be loaded again
    event.target.value = '';
  };

  reader.readAsText(file);
}


/* --- Initialization --- */
async function init(){
  // Load locale and localize page
  const store = await chrome.storage.sync.get(defaultState);
  await fetchMessages(store.settings.locale || 'en');
  localizePage();

  // General settings handlers
  document.getElementById('saveSettings').addEventListener('click', async ()=>{
    const store = await chrome.storage.sync.get(defaultState);
    store.settings.defaultLang = document.getElementById('defaultLang').value || 'English';
    await chrome.storage.sync.set({settings: store.settings});
    showToast('settings_saved', { type:'success' });
    // No need to notify service worker as this doesn't affect menu structure
  });

  document.getElementById('resetSettings').addEventListener('click', async ()=>{
    if(!await confirmToast('confirm_reset')) return;
    await chrome.storage.sync.set(defaultState);
    load();
    showToast('settings_reset', { type:'success' });
    notifyServiceWorker();
  });

  // "Add" button handlers
  document.getElementById('addPlatform').addEventListener('click', () => showModal('platform'));
  document.getElementById('addTemplate').addEventListener('click', () => showModal('template'));

  // Import/Export Handlers
  document.getElementById('exportTemplates').addEventListener('click', exportTemplates);
  document.getElementById('importTemplates').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', importTemplates);


  // Setup navigation between sections
  const navItems = document.querySelectorAll('.options-nav .nav-item');
  const sections = document.querySelectorAll('.content-section');
  const contentTitle = document.getElementById('content-title');

  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const targetId = item.getAttribute('href').substring(1);

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      contentTitle.textContent = getMessage(item.getAttribute('data-i18n')) + ' ' + getMessage('settings_suffix', 'Settings');
    });
  });

  // Load initial data
  load();
  initLocaleSwitcher();
}

/* Helper to insert variable into textarea at cursor */
function insertVariable(textarea, variable) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    textarea.value = before + variable + after;
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    textarea.focus();
}

/* --- Modal editor implementation --- */
async function showModal(type, payload={}){
    const modal = document.getElementById('editorModal');
    modal.dataset.mode = type;
    modal.dataset.editIdx = payload.idx != null ? String(payload.idx) : '';
    modal.dataset.editAction = payload.action || '';
    modal.classList.remove('hidden');

    const store = await chrome.storage.sync.get(defaultState);
    const pf = document.getElementById('platformFields');
    const tf = document.getElementById('templateFields');
    const nameInput = document.getElementById('modal_platform_name');
    const toneField = document.getElementById('modal_template_tone_label');

    if (type === 'platform') {
        pf.style.display = 'block';
        tf.style.display = 'none';
        const p = (payload.idx != null) ? store.platforms[payload.idx] : null;
        document.getElementById('modalTitle').textContent = getMessage(p ? 'modal_edit_platform' : 'modal_add_platform');
        
        const isDefaultPlatform = p && p.name.startsWith('platform_');
        nameInput.value = isDefaultPlatform ? getMessage(p.name) : (p ? p.name : '');
        nameInput.disabled = isDefaultPlatform;

        document.getElementById('modal_platform_url').value = (p && p.url) || '';
        document.getElementById('modal_platform_input_selector').value = (p && (p.inputSelector || p.input_selector)) || '';
        document.getElementById('modal_platform_send_selector').value = (p && (p.sendSelector || p.send_selector)) || '';
    } else { // template
        pf.style.display = 'none';
        tf.style.display = 'block';
        const t = (payload.idx != null && payload.action) ? store.templates[payload.action][payload.idx] : null;
        document.getElementById('modalTitle').textContent = getMessage(t ? 'modal_edit_template' : 'modal_add_template');
        document.getElementById('modal_template_action').value = payload.action || 'answer';
        document.getElementById('modal_template_name').value = t ? (getMessage(t.name) || t.name) : '';
        const templateText = t ? t.text : '{{selectedText}}';
        const templateTextEl = document.getElementById('modal_template_text');
        templateTextEl.value = getMessage(templateText, templateText);

        const updateToneField = () => {
            if (templateTextEl.value.includes('{{tone}}')) {
                toneField.style.display = 'block';
            } else {
                toneField.style.display = 'none';
            }
        };

        templateTextEl.addEventListener('input', updateToneField);
        updateToneField();
        document.getElementById('modal_template_tone').value = (t && t.tone) || '';
    }
}

function hideModal(){
  const modal = document.getElementById('editorModal');
  modal.classList.add('hidden');
}

function initModal(){
  document.getElementById('modalSave').addEventListener('click', async ()=>{
    const modal = document.getElementById('editorModal');
    const { mode, editIdx, editAction } = modal.dataset;
    const store = await chrome.storage.sync.get(defaultState);

    let changed = false;
    if(mode === 'platform'){
      const name = document.getElementById('modal_platform_name').value.trim();
      if (!name) { showToast('validation_name_required', { type: 'error' }); return; }

      let platform;
      if (editIdx !== '') {
        platform = store.platforms[Number(editIdx)];
        // Only update name if it's not a default platform
        if (!platform.name.startsWith('platform_')) {
            platform.name = name;
        }
      } else {
        platform = {
          key: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36).slice(-4)
        };
        store.platforms.push(platform);
        platform.name = name;
      }
      
      platform.url = document.getElementById('modal_platform_url').value.trim();
      platform.inputSelector = document.getElementById('modal_platform_input_selector').value.trim();
      platform.sendSelector = document.getElementById('modal_platform_send_selector').value.trim();

      await chrome.storage.sync.set({platforms: store.platforms});
      changed = true;
    } else if(mode === 'template'){
      const name = document.getElementById('modal_template_name').value.trim();
      const action = document.getElementById('modal_template_action').value;
      if (!name) { showToast('validation_name_required', { type: 'error' }); return; }

      const templateText = document.getElementById('modal_template_text').value;
      const tone = document.getElementById('modal_template_tone').value.trim();

      let template;

      if (editIdx !== '' && editAction === action) {
        template = store.templates[action][Number(editIdx)];
        template.name = name;
        template.text = templateText;
      } else {
        template = {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36).slice(-4),
          name: name,
          text: templateText
        };
        store.templates[action] = store.templates[action] || [];
        store.templates[action].push(template);
        if (editIdx !== '' && editAction !== action) {
          store.templates[editAction]?.splice(Number(editIdx), 1);
        }
      }

      if (templateText.includes('{{tone}}')) {
        template.tone = tone;
      } else {
        delete template.tone;
      }

      await chrome.storage.sync.set({templates: store.templates});
      changed = true;
    }
    
    if (changed) {
        showToast('settings_saved', { type: 'success' });
        hideModal();
        load();
        notifyServiceWorker();
    }
  });

  // General modal close handlers
  document.getElementById('modalCancel').addEventListener('click', hideModal);
  document.getElementById('modalClose').addEventListener('click', hideModal);
  document.querySelector('#editorModal .modal-backdrop').addEventListener('click', hideModal);
  document.getElementById('modal_open_url').addEventListener('click', ()=>{
    const url = document.getElementById('modal_platform_url').value;
    if(url){ window.open(url, '_blank'); }
  });

  // Add listeners for the variable chips
  document.querySelectorAll('.variable-chips .chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
          const textarea = document.getElementById('modal_template_text');
          const variable = e.target.dataset.variable;
          insertVariable(textarea, variable);
          // Manually trigger input event to update tone field visibility
          textarea.dispatchEvent(new Event('input'));
      });
  });
}

async function initLocaleSwitcher(){
    const switcher = document.getElementById('locale-switcher');
    const icon = switcher.querySelector('.icon');
    const label = switcher.querySelector('.label');

    async function updateUI(locale) {
        await fetchMessages(locale);
        icon.textContent = locale === 'en' ? '🇻🇳' : '🇬🇧';
        label.textContent = getMessage(locale === 'en' ? 'lang_vi' : 'lang_en');
        localizePage();
        load(); 
    }

    switcher.addEventListener('click', async () => {
        const store = await chrome.storage.sync.get(defaultState);
        const newLocale = store.settings.locale === 'en' ? 'vi' : 'en';
        store.settings.locale = newLocale;
        await chrome.storage.sync.set({ settings: store.settings });
        await updateUI(newLocale);
        notifyServiceWorker(); // Rebuild menu for new language
    });

    const store = await chrome.storage.sync.get(defaultState);
    await updateUI(store.settings.locale || 'en');
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', ()=>{
  init();
  initModal();
});
