// content.js - injected into AI sites to listen for fill messages and attempt to auto-send
(function(){
  const SEND_LABEL_RE = /(send|submit|enter|ask|reply|gửi|enviar|发送|发送消息|发送讯息)/i;

  function tryClickSend(){
    // Candidate selectors for send buttons
    const btnSelectors = [
      "button[type=submit]",
      "input[type=submit]",
      "button[aria-label]",
      "button[role=button]",
      "div[role=button]",
      "button"
    ];

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

    // Try forms with submit
    const forms = Array.from(document.querySelectorAll('form'));
    for(const f of forms){
      try{
        if(typeof f.requestSubmit === 'function'){ f.requestSubmit(); return true; }
        if(typeof f.submit === 'function'){ f.submit(); return true; }
      }catch(e){}
    }
    return false;
  }

  function simulateEnter(el){
    try{
      const ev = new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true});
      el.dispatchEvent(ev);
      const ev2 = new KeyboardEvent('keyup', {key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true});
      el.dispatchEvent(ev2);
      return true;
    }catch(e){ return false; }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResp)=>{
    if(msg && msg.type === 'fill' && msg.prompt){
      const text = msg.prompt;
      // Try to fill typical input areas
      const selectors = ["textarea", "input[type=text]", "input[type=search]", "div[contenteditable=true]"];
      let filled = false;
      let targetEl = null;
      for(const sel of selectors){
        const el = document.querySelector(sel);
        if(el){
          try{
            if(el.isContentEditable || el.tagName === 'DIV'){
              el.innerText = text;
            } else {
              el.value = text;
            }
            el.dispatchEvent(new Event('input', {bubbles:true}));
            el.focus();
            filled = true;
            targetEl = el;
            break;
          }catch(e){ /* ignore fill errors */ }
        }
      }

      // After filling, attempt to auto-send
      let clicked = false;
      try{
        clicked = tryClickSend();
        if(!clicked && targetEl) clicked = simulateEnter(targetEl);
      }catch(e){}

      sendResp({filled, autoSent: clicked});
    }
  });
})();
