// i18n helper: replace elements with data-i18n and data-i18n-placeholder

// Get current locale from storage, then apply translations
async function initI18n(){
  if(typeof chrome === 'undefined' || !chrome.i18n) return;

  // Get locale from storage, fallback to browser lang, then 'en'
  const store = await chrome.storage.sync.get({ settings: { locale: '' }});
  let currentLocale = (store.settings && store.settings.locale) || chrome.i18n.getUILanguage().split('-')[0] || 'en';

  // Set the lang attribute of the document
  document.documentElement.lang = currentLocale;

  applyI18n();
}

function applyI18n(){
  if(typeof chrome === 'undefined' || !chrome.i18n) return;

  // set document title if element exists
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    try{
      const msg = chrome.i18n.getMessage(key) || '';
      const tag = el.tagName.toLowerCase();
      // Inputs and textareas: set placeholder
      if(tag === 'input' || tag === 'textarea'){
        el.placeholder = msg;
        return;
      }
      // If the element contains interactive children (input/select/textarea/button),
      // don't replace innerHTML/textContent (that would remove those children).
      const interactiveChild = el.querySelector && el.querySelector('input,textarea,select,button');
      if(interactiveChild){
        // remove any bare text nodes (e.g., English label text) so we don't show both languages
        Array.from(el.childNodes).forEach(n => {
          if(n.nodeType === Node.TEXT_NODE && /\S/.test(n.nodeValue || '')){
            n.remove();
          }
        });
        // place translated text into a dedicated span.i18n-label at the start of the element
        let span = el.querySelector('.i18n-label');
        if(!span){
          span = document.createElement('span');
          span.className = 'i18n-label';
          el.insertBefore(span, el.firstChild);
        }
        span.textContent = msg;
      }else{
        el.textContent = msg;
      }
    }catch(e){ /* ignore */ }
  });

  // placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    try{ el.placeholder = chrome.i18n.getMessage(key) || ''; }catch(e){}
  });

  // titles
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    const key = el.getAttribute('data-i18n-title');
    try{ el.title = chrome.i18n.getMessage(key) || ''; }catch(e){}
  });

  // set document.title from data-i18n-title or data-i18n on <title>
  const titleEl = document.querySelector('title[data-i18n]');
  if(titleEl){
    try{ document.title = chrome.i18n.getMessage(titleEl.getAttribute('data-i18n')) || document.title; }catch(e){}
  }
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initI18n);
else initI18n();
