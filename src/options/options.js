// options.js - UI logic for the options page
import { DEFAULT_TEMPLATES, PLATFORMS } from '../shared/menu.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English' } };

/* --- Toast notification helpers --- */
function _getMsg(key, fallback){ return (chrome && chrome.i18n) ? chrome.i18n.getMessage(key) || fallback : fallback; }
function _getToastContainer(){ let c = document.getElementById('toastContainer'); if(!c){ c = document.createElement('div'); c.id = 'toastContainer'; document.body.appendChild(c); } return c; }
function showToast(message, { type='info', timeout=3000 } = {}){
  const container = _getToastContainer();
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='success' ? 'success' : type==='error' ? 'error' : '');
  t.innerHTML = `<div class="toast-msg">${message}</div>`;
  container.appendChild(t);
  if(timeout > 0){ setTimeout(()=>{ t.remove(); }, timeout); }
  return t;
}

function confirmToast(message, { yesLabel=null, noLabel=null, timeout=8000 } = {}){
  return new Promise((resolve)=>{
    const t = showToast(message, { timeout:0 });
    const actions = document.createElement('div');
    actions.className = 'toast-actions';
    const yes = document.createElement('button');
    yes.className = 'btn-inline primary';
    yes.textContent = yesLabel || _getMsg('toast_yes','Yes');
    const no = document.createElement('button');
    no.className = 'btn-inline';
    no.textContent = noLabel || _getMsg('toast_no','No');
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
  renderPlatforms(platforms);
  renderTemplates(store.templates || DEFAULT_TEMPLATES);
}

function renderPlatforms(list){
  const container = document.getElementById('platformList');
  container.innerHTML = '';
  if(!list || list.length === 0){ container.innerHTML = `<p class="muted">${_getMsg('no_platforms_configured', 'No platforms configured.')}</p>`; return; }
  list.forEach((p, idx)=>{
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="list-item-details">
        <div class="list-item-title">${p.name}</div>
        <div class="list-item-desc">${p.url || ''}</div>
      </div>
      <div class="actions">
        <button data-idx="${idx}" class="edit secondary">${_getMsg('edit_label', 'Edit')}</button>
        <button data-idx="${idx}" class="del secondary">${_getMsg('delete_label', 'Delete')}</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('button.edit').forEach(b=>b.addEventListener('click', onEditPlatform));
  container.querySelectorAll('button.del').forEach(b=>b.addEventListener('click', onDeletePlatform));
}

function renderTemplates(map){
  const container = document.getElementById('templateList');
  container.innerHTML = '';
  if(!map || Object.keys(map).length === 0){ container.innerHTML = `<p class="muted">${_getMsg('no_templates_configured', 'No templates configured.')}</p>`; return; }
  for(const action of Object.keys(map)){
    (map[action]||[]).forEach((t, idx)=>{
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-details">
          <div class="list-item-title">${t.name}</div>
          <div class="list-item-desc">Action: <strong>${action}</strong></div>
        </div>
        <div class="actions">
          <button data-action="${action}" data-idx="${idx}" class="editT secondary">${_getMsg('edit_label', 'Edit')}</button>
          <button data-action="${action}" data-idx="${idx}" class="delT secondary">${_getMsg('delete_label', 'Delete')}</button>
        </div>`;
      container.appendChild(div);
    });
  }
  container.querySelectorAll('button.editT').forEach(b=>b.addEventListener('click', onEditTemplate));
  container.querySelectorAll('button.delT').forEach(b=>b.addEventListener('click', onDeleteTemplate));
}

/* --- Event Handlers --- */
async function onEditPlatform(e){ showModal('platform', { idx: Number(e.target.dataset.idx) }); }
async function onEditTemplate(e){ showModal('template', { action: e.target.dataset.action, idx: Number(e.target.dataset.idx) }); }

async function onDeletePlatform(e){
  const idx = Number(e.target.dataset.idx);
  if(await confirmToast(_getMsg('delete_confirm_platform', 'Delete this platform?'))){
    const store = await chrome.storage.sync.get(defaultState);
    store.platforms.splice(idx,1);
    await chrome.storage.sync.set({platforms: store.platforms});
    load();
    showToast(_getMsg('settings_saved','Changes saved'), { type:'success' });
  }
}

async function onDeleteTemplate(e){
  const { action, idx } = e.target.dataset;
  if(await confirmToast(_getMsg('delete_confirm_template', 'Delete this template?'))){
    const store = await chrome.storage.sync.get(defaultState);
    store.templates[action].splice(Number(idx),1);
    await chrome.storage.sync.set({templates: store.templates});
    load();
    showToast(_getMsg('settings_saved','Changes saved'), { type:'success' });
  }
}

/* --- Initialization --- */
function init(){
  // General settings handlers
  document.getElementById('saveSettings').addEventListener('click', async ()=>{
    const store = await chrome.storage.sync.get(defaultState);
    store.settings.defaultLang = document.getElementById('defaultLang').value || 'English';
    await chrome.storage.sync.set({settings: store.settings});
    showToast(_getMsg('settings_saved','Settings saved'), { type:'success' });
  });

  document.getElementById('resetSettings').addEventListener('click', async ()=>{
    if(!await confirmToast(_getMsg('confirm_reset','Reset all settings to defaults?'))) return;
    await chrome.storage.sync.set(defaultState);
    load();
    showToast(_getMsg('settings_reset','Settings reset to defaults'), { type:'success' });
  });

  // "Add" button handlers
  document.getElementById('addPlatform').addEventListener('click', () => showModal('platform'));
  document.getElementById('addTemplate').addEventListener('click', () => showModal('template'));

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

      contentTitle.textContent = item.textContent + ' ' + _getMsg('settings_suffix', 'Settings');
    });
  });

  // Load initial data
  load();
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

  if(type === 'platform'){
    pf.style.display = 'block';
    tf.style.display = 'none';
    const p = (payload.idx != null) ? store.platforms[payload.idx] : null;
    document.getElementById('modalTitle').textContent = _getMsg(p ? 'modal_edit_platform' : 'modal_add_platform');
    document.getElementById('modal_platform_name').value = (p && p.name) || '';
    document.getElementById('modal_platform_url').value = (p && p.url) || '';
    document.getElementById('modal_platform_input_selector').value = (p && (p.inputSelector || p.input_selector)) || '';
    document.getElementById('modal_platform_send_selector').value = (p && (p.sendSelector || p.send_selector)) || '';
  } else { // template
    pf.style.display = 'none';
    tf.style.display = 'block';
    const t = (payload.idx != null && payload.action) ? store.templates[payload.action][payload.idx] : null;
    document.getElementById('modalTitle').textContent = _getMsg(t ? 'modal_edit_template' : 'modal_add_template');
    document.getElementById('modal_template_action').value = payload.action || 'answer';
    document.getElementById('modal_template_name').value = (t && t.name) || '';
    document.getElementById('modal_template_text').value = (t && t.text) || '{{selectedText}}';
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

    if(mode === 'platform'){
      const name = document.getElementById('modal_platform_name').value.trim();
      if (!name) { showToast(_getMsg('validation_name_required', 'Name is required.'), { type: 'error' }); return; }

      let platform;
      if (editIdx !== '') {
        platform = store.platforms[Number(editIdx)];
      } else {
        platform = {
          key: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36).slice(-4)
        };
        store.platforms.push(platform);
      }
      platform.name = name;
      platform.url = document.getElementById('modal_platform_url').value.trim();
      platform.inputSelector = document.getElementById('modal_platform_input_selector').value.trim();
      platform.sendSelector = document.getElementById('modal_platform_send_selector').value.trim();

      await chrome.storage.sync.set({platforms: store.platforms});
    } else if(mode === 'template'){
      const name = document.getElementById('modal_template_name').value.trim();
      const action = document.getElementById('modal_template_action').value;
      if (!name) { showToast(_getMsg('validation_name_required', 'Name is required.'), { type: 'error' }); return; }

      const templateText = document.getElementById('modal_template_text').value;
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
      await chrome.storage.sync.set({templates: store.templates});
    }
    showToast(_getMsg('settings_saved', 'Changes saved'), { type: 'success' });
    hideModal();
    load();
  });

  // General modal close handlers
  document.getElementById('modalCancel').addEventListener('click', hideModal);
  document.getElementById('modalClose').addEventListener('click', hideModal);
  document.querySelector('#editorModal .modal-backdrop').addEventListener('click', hideModal);
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', ()=>{
  init();
  initModal();
});
