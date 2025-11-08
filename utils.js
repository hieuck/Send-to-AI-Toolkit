// utils.js - helper functions for prompt assembly and opening targets

export function encodeForUrl(s){
  return encodeURIComponent(s || "");
}

export function assemblePrompt(templateText, data){
  if(!templateText) return "";
  // Replace placeholders like {{selectedText}} {{url}} {{targetLang}} etc.
  return templateText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key)=>{
    return (data && data[key] !== undefined) ? data[key] : m;
  });
}

// Open platform with prompt. platformConfig expects {url, urlTemplate}
export async function openPlatformWithPrompt(platformConfig, prompt){
  const urlTemplate = platformConfig.urlTemplate || platformConfig.url || "about:blank";
  if(urlTemplate.includes("{{prompt}}")){
    const url = urlTemplate.replace(/{{\s*prompt\s*}}/g, encodeForUrl(prompt));
    const tab = await chrome.tabs.create({url});
    return tab;
  }

  // Otherwise open platform url and inject the prompt into a likely input
  const tab = await chrome.tabs.create({url: platformConfig.url || urlTemplate});
  // After tab is loaded, inject a small script to fill the first textarea/input/contenteditable
  const tabId = tab.id;
  // Wait for the tab to finish loading, then send a message to the content script to fill and try to send
  const trySendToTab = ()=>{
    try{
      chrome.tabs.sendMessage(tabId, {type: 'fill', prompt}, (resp)=>{
        if(chrome.runtime.lastError){
          // content script may not be injected; fallback to direct injection
          try{
            chrome.scripting.executeScript({
              target: {tabId},
              func: (p)=>{
                const fill = (text)=>{
                  const selectors = ["textarea", "input[type=text]", "input[type=search]", "div[contenteditable=true]"];
                  for(const sel of selectors){
                    const el = document.querySelector(sel);
                    if(el){
                      try{
                        if(el.isContentEditable || el.tagName === 'DIV') el.innerText = text;
                        else el.value = text;
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                        el.focus();
                        return true;
                      }catch(e){}
                    }
                  }
                  return false;
                };
                // attempt click/send similar to content script
                const tryClickSend = ()=>{
                  const SEND_LABEL_RE = /(send|submit|enter|ask|reply|gửi|enviar|发送|发送消息|发送讯息)/i;
                  const btnSelectors = ["button[type=submit]","input[type=submit]","button[aria-label]","button[role=button]","div[role=button]","button"];
                  for(const sel of btnSelectors){
                    const nodes = Array.from(document.querySelectorAll(sel));
                    for(const n of nodes){
                      const text = (n.innerText || n.getAttribute('aria-label') || n.value || '').trim();
                      if(!text) continue;
                      if(SEND_LABEL_RE.test(text)){
                        try{ n.click(); return true; }catch(e){}
                      }
                    }
                  }
                  const forms = Array.from(document.querySelectorAll('form'));
                  for(const f of forms){
                    try{ if(typeof f.requestSubmit === 'function'){ f.requestSubmit(); return true; } if(typeof f.submit === 'function'){ f.submit(); return true; } }catch(e){}
                  }
                  return false;
                };
                const filled = fill(p);
                if(filled) tryClickSend();
              },
              args: [prompt]
            });
          }catch(e){ console.warn('Injection fallback failed', e); }
        }
      });
    }catch(e){ console.warn('sendMessage failed', e); }
  };

  // If the tab finishes loading, try immediately; otherwise try after short delay
  const onUpdated = (updatedTabId, changeInfo)=>{
    if(updatedTabId === tabId && changeInfo.status === 'complete'){
      trySendToTab();
      chrome.tabs.onUpdated.removeListener(onUpdated);
    }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
  // fallback: try after 800ms in case onUpdated didn't fire
  setTimeout(()=>{ trySendToTab(); chrome.tabs.onUpdated.removeListener(onUpdated); }, 900);
  return tab;
}
