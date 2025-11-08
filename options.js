// options.js - minimal options page logic
import { DEFAULT_TEMPLATES, PLATFORMS } from './menu.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English' } };

/* Toast helpers: non-blocking notifications and inline confirm toasts */
function _getMsg(key, fallback){ return (chrome && chrome.i18n) ? chrome.i18n.getMessage(key) || fallback : fallback; }
function _getToastContainer(){ let c = document.getElementById('toastContainer'); if(!c){ c = document.createElement('div'); c.id = 'toastContainer'; document.body.appendChild(c); } return c; }
function showToast(message, { type='info', timeout=3000 } = {}){
  const container = _getToastContainer();
  const t = document.createElement('div');
  t.className = 'toast' + (type==='success' ? ' success' : type==='error' ? ' error' : '');
  t.innerHTML = `<div class="toast-msg"></div><div class="toast-actions"></div>`;
  t.querySelector('.toast-msg').textContent = message;
  container.appendChild(t);
  // auto-dismiss
  if(timeout && timeout > 0){ setTimeout(()=>{ t.classList.add('dismiss'); try{ t.remove(); }catch(e){} }, timeout); }
  return t;
}

function confirmToast(message, { yesLabel=null, noLabel=null, timeout=0 } = {}){
  return new Promise((resolve)=>{
    const container = _getToastContainer();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="toast-msg"></div><div class="toast-actions"></div>`;
    t.querySelector('.toast-msg').textContent = message;
    const actions = t.querySelector('.toast-actions');
    const yes = document.createElement('button');
    yes.className = 'btn-inline primary';
    yes.textContent = yesLabel || _getMsg('toast_yes','Yes');
    const no = document.createElement('button');
    no.className = 'btn-inline';
    no.textContent = noLabel || _getMsg('toast_no','No');
    actions.appendChild(no);
    actions.appendChild(yes);
    container.appendChild(t);

    function cleanup(result){ try{ t.remove(); }catch(e){} resolve(result); }
    yes.addEventListener('click', ()=>cleanup(true));
    no.addEventListener('click', ()=>cleanup(false));
    if(timeout && timeout>0){ setTimeout(()=>cleanup(false), timeout); }
  });
}

async function load(){
  const store = await chrome.storage.local.get(defaultState);
  document.getElementById('defaultLang').value = (store.settings && store.settings.defaultLang) || 'English';
  // If no user-defined platforms exist yet, populate with built-in platforms so they can be edited
  let platforms = store.platforms || [];
  if(!platforms || platforms.length === 0){
    platforms = PLATFORMS.map(p=>({ ...p })); // clone
    // persist the built-in platforms so they appear in the Options UI for editing
    await chrome.storage.local.set({ platforms });
  }
  renderPlatforms(platforms);
  renderTemplates(store.templates || DEFAULT_TEMPLATES);
}

function renderPlatforms(list){
  const container = document.getElementById('platformList');
  container.innerHTML = '';
  list.forEach((p, idx)=>{
    const div = document.createElement('div');
    div.className = 'platform-item';
    const editLabel = (chrome && chrome.i18n) ? chrome.i18n.getMessage('edit_label') : 'Edit';
    const deleteLabel = (chrome && chrome.i18n) ? chrome.i18n.getMessage('delete_label') : 'Delete';
    div.innerHTML = `<strong>${p.name}</strong> (<code>${p.key}</code>) - <span class="muted">${p.url || ''}</span>
      <div class="actions"><button data-idx="${idx}" class="edit">${editLabel}</button>
      <button data-idx="${idx}" class="del">${deleteLabel}</button></div>`;
    container.appendChild(div);
  });
  // add handlers
  container.querySelectorAll('button.edit').forEach(b=>b.addEventListener('click', onEditPlatform));
  container.querySelectorAll('button.del').forEach(b=>b.addEventListener('click', onDeletePlatform));
}

function renderTemplates(map){
  const container = document.getElementById('templateList');
  container.innerHTML = '';
  for(const action of Object.keys(map)){
    const h = document.createElement('h3');
    const actionLabel = (chrome && chrome.i18n) ? chrome.i18n.getMessage('action_'+action) || action : action;
    h.textContent = actionLabel;
    container.appendChild(h);
    const ul = document.createElement('ul');
      (map[action]||[]).forEach((t, idx)=>{
      const li = document.createElement('li');
      const editLabel = (chrome && chrome.i18n) ? chrome.i18n.getMessage('edit_label') : 'Edit';
      const deleteLabel = (chrome && chrome.i18n) ? chrome.i18n.getMessage('delete_label') : 'Delete';
      li.innerHTML = `${t.name} - <code>${t.id}</code>
        <div class="actions"><button data-action="${action}" data-idx="${idx}" class="editT">${editLabel}</button>
        <button data-action="${action}" data-idx="${idx}" class="delT">${deleteLabel}</button></div>`;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
  container.querySelectorAll('button.editT').forEach(b=>b.addEventListener('click', onEditTemplate));
  container.querySelectorAll('button.delT').forEach(b=>b.addEventListener('click', onDeleteTemplate));
}

async function onEditPlatform(e){
  const idx = Number(e.target.dataset.idx);
  const store = await chrome.storage.local.get(defaultState);
  const platforms = store.platforms || [];
  const p = platforms[idx];
  // open modal editor for platform
  showModal('platform', { idx, platform: p });
}

async function onDeletePlatform(e){
  const idx = Number(e.target.dataset.idx);
  const store = await chrome.storage.local.get(defaultState);
  const platforms = store.platforms || [];
  const confirmMsg = (chrome && chrome.i18n) ? chrome.i18n.getMessage('delete_confirm_platform') : 'Delete platform?';
  if(await confirmToast(confirmMsg, { yesLabel: _getMsg('toast_yes','Yes'), noLabel: _getMsg('toast_no','No') })){
    platforms.splice(idx,1);
    await chrome.storage.local.set({platforms});
    load();
    showToast(_getMsg('settings_saved','Changes saved'), { type:'success' });
  }
}

async function onEditTemplate(e){
  const action = e.target.dataset.action;
  const idx = Number(e.target.dataset.idx);
  const store = await chrome.storage.local.get(defaultState);
  const map = store.templates || DEFAULT_TEMPLATES;
  const t = map[action][idx];
  // open modal editor for template
  showModal('template', { action, idx, template: t });
}

async function onDeleteTemplate(e){
  const action = e.target.dataset.action;
  const idx = Number(e.target.dataset.idx);
  const store = await chrome.storage.local.get(defaultState);
  const map = store.templates || DEFAULT_TEMPLATES;
  const confirmMsg = (chrome && chrome.i18n) ? chrome.i18n.getMessage('delete_confirm_template') : 'Delete template?';
  if(await confirmToast(confirmMsg, { yesLabel: _getMsg('toast_yes','Yes'), noLabel: _getMsg('toast_no','No') })){
    map[action].splice(idx,1);
    await chrome.storage.local.set({templates: map});
    load();
    showToast(_getMsg('settings_saved','Changes saved'), { type:'success' });
  }
}

async function init(){
  document.getElementById('saveSettings').addEventListener('click', async ()=>{
    const defaultLang = (document.getElementById('defaultLang').value || 'English');
    const store = await chrome.storage.local.get(defaultState);
    store.settings = store.settings || {};
    store.settings.defaultLang = defaultLang;
    await chrome.storage.local.set({settings: store.settings});
    const msg = _getMsg('settings_saved','Settings saved');
    showToast(msg, { type:'success' });
  });

  // Reset to built-in defaults
  const resetBtn = document.getElementById('resetSettings');
  if(resetBtn){
    resetBtn.addEventListener('click', async ()=>{
  const confirmMsg = _getMsg('confirm_reset','Reset all settings and templates to defaults?');
  if(!await confirmToast(confirmMsg, { yesLabel: _getMsg('toast_yes','Yes'), noLabel: _getMsg('toast_no','No') })) return;
      await chrome.storage.local.set(defaultState);
      load();
      const done = _getMsg('settings_reset','Settings reset to defaults');
      showToast(done, { type:'success' });
    });
  }

  document.getElementById('addPlatform').addEventListener('click', async ()=>{
    showModal('platform', { idx: null, platform: null });
  });

  document.getElementById('addTemplate').addEventListener('click', async ()=>{
    showModal('template', { action: null, idx: null, template: null });
  });

  load();
}

// Initialize after DOM is ready so modal and form elements exist
document.addEventListener('DOMContentLoaded', init);

/* Modal editor implementation */
function showModal(type, payload={}){
  const modal = document.getElementById('editorModal');
  modal.dataset.mode = type;
  modal.setAttribute('aria-hidden','false');
  modal.classList.remove('hidden');

  // fields
  const pf = document.getElementById('platformFields');
  const tf = document.getElementById('templateFields');
  if(type === 'platform'){
    pf.classList.remove('hidden');
    tf.classList.add('hidden');
    const titleKey = payload && payload.idx != null ? 'modal_edit_platform' : 'modal_add_platform';
    document.getElementById('modalTitle').textContent = (chrome && chrome.i18n) ? chrome.i18n.getMessage(titleKey) : (payload && payload.idx != null ? 'Edit Platform' : 'Add Platform');
    document.getElementById('modal_platform_key').value = (payload.platform && payload.platform.key) || '';
    document.getElementById('modal_platform_name').value = (payload.platform && payload.platform.name) || '';
    document.getElementById('modal_platform_url').value = (payload.platform && payload.platform.url) || '';
    document.getElementById('modal_platform_input_selector').value = (payload.platform && (payload.platform.inputSelector || payload.platform.input_selector)) || '';
    document.getElementById('modal_platform_send_selector').value = (payload.platform && (payload.platform.sendSelector || payload.platform.send_selector)) || '';
    modal.dataset.editIdx = payload.idx != null ? String(payload.idx) : '';
  }else{
    pf.classList.add('hidden');
    tf.classList.remove('hidden');
    const titleKey = payload && payload.idx != null ? 'modal_edit_template' : 'modal_add_template';
    document.getElementById('modalTitle').textContent = (chrome && chrome.i18n) ? chrome.i18n.getMessage(titleKey) : (payload && payload.idx != null ? 'Edit Template' : 'Add Template');
    document.getElementById('modal_template_action').value = payload.action || 'answer';
    document.getElementById('modal_template_id').value = (payload.template && payload.template.id) || '';
    document.getElementById('modal_template_name').value = (payload.template && payload.template.name) || '';
    document.getElementById('modal_template_text').value = (payload.template && payload.template.text) || '{{selectedText}}';
    modal.dataset.editAction = payload.action || '';
    modal.dataset.editIdx = payload.idx != null ? String(payload.idx) : '';
  }
}

function hideModal(){
  const modal = document.getElementById('editorModal');
  modal.dataset.mode = '';
  modal.dataset.editIdx = '';
  modal.dataset.editAction = '';
  modal.setAttribute('aria-hidden','true');
  modal.classList.add('hidden');
}

// modal button handlers
document.addEventListener('DOMContentLoaded', ()=>{
  const saveBtn = document.getElementById('modalSave');
  const cancelBtn = document.getElementById('modalCancel');
  const modal = document.getElementById('editorModal');
  if(cancelBtn) cancelBtn.addEventListener('click', hideModal);
  if(saveBtn) saveBtn.addEventListener('click', async ()=>{
    const mode = modal.dataset.mode;
    const editIdx = modal.dataset.editIdx !== '' ? Number(modal.dataset.editIdx) : null;
    if(mode === 'platform'){
      const key = document.getElementById('modal_platform_key').value.trim();
      const name = document.getElementById('modal_platform_name').value.trim();
      const url = document.getElementById('modal_platform_url').value.trim();
      const inputSelector = document.getElementById('modal_platform_input_selector').value.trim();
      const sendSelector = document.getElementById('modal_platform_send_selector').value.trim();
  if(!key || !name){ const msg = _getMsg('validation_key_name_required','Key and name required'); showToast(msg, { type:'error' }); return; }
      const store = await chrome.storage.local.get(defaultState);
      store.platforms = store.platforms || [];
      const existing = { key, name, url, urlTemplate: url, inputSelector: inputSelector || '', sendSelector: sendSelector || '' };
      if(editIdx != null){ store.platforms[editIdx] = existing; }
      else{ store.platforms.push(existing); }
      await chrome.storage.local.set({platforms: store.platforms});
      hideModal();
      load();
    }else if(mode === 'template'){
      const action = document.getElementById('modal_template_action').value;
      const id = document.getElementById('modal_template_id').value.trim();
      const name = document.getElementById('modal_template_name').value.trim();
      const text = document.getElementById('modal_template_text').value;
  if(!action || !id || !name){ const msg = _getMsg('validation_action_id_name_required','Action, id and name required'); showToast(msg, { type:'error' }); return; }
      const store = await chrome.storage.local.get(defaultState);
      store.templates = store.templates || DEFAULT_TEMPLATES;
      store.templates[action] = store.templates[action] || [];
      const entry = { id, name, text };
      if(editIdx != null){ store.templates[action][editIdx] = entry; }
      else{ store.templates[action].push(entry); }
      await chrome.storage.local.set({templates: store.templates});
      hideModal();
      load();
    }
  });

  // clicking backdrop hides modal
  const backdrop = document.querySelector('#editorModal .modal-backdrop');
  if(backdrop) backdrop.addEventListener('click', hideModal);
});
