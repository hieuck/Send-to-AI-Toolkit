document.getElementById('openOptions').addEventListener('click', (e)=>{
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function showStatus(msg, success = false){
  const s = document.getElementById('status');
  s.textContent = msg;
  s.style.color = success ? '' : '';
  setTimeout(()=>{ s.textContent = '' }, 2500);
}

const PLATFORM_URLS = {
  chatgpt: 'https://chat.openai.com/',
  gemini: 'https://ai.google/',
  claude: 'https://www.anthropic.com/',
  poe: 'https://poe.com/',
  perplexity: 'https://perplexity.ai/',
  deepseek: 'https://deepseek.ai/'
};

function openPlatform(platform, text){
  // Basic behavior: open platform home and copy text to clipboard
  const url = PLATFORM_URLS[platform] || 'about:blank';
  navigator.clipboard.writeText(text || '').then(()=>{
    const base = (chrome && chrome.i18n) ? chrome.i18n.getMessage('status_copied_opening') : 'Text copied to clipboard — opening';
    showStatus(base + ' ' + platform);
    window.open(url, '_blank');
  }).catch(()=>{
    // fallback: still open
    window.open(url, '_blank');
    const opened = (chrome && chrome.i18n) ? chrome.i18n.getMessage('status_opened') : 'Opened';
    showStatus(opened + ' ' + platform);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  const input = document.getElementById('inputText');
  document.querySelectorAll('.platform-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openPlatform(btn.dataset.platform, input.value.trim());
    });
  });

  document.getElementById('clearBtn').addEventListener('click', ()=>{
    input.value = '';
  });

  document.getElementById('templateSelect').addEventListener('change', (e)=>{
    const v = e.target.value;
    if(v === 'summarize') input.value = 'Please summarize the following text:\n\n';
    else if(v === 'translate_vi') input.value = 'Translate the following text to Vietnamese:\n\n';
    else if(v === 'qa') input.value = 'Read the following and answer questions about it:\n\n';
  });
});
