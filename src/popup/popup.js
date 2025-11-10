const defaultState = { platforms: [], templates: {}, settings: { defaultLang: 'English' } };

function showStatus(msg, success = false) {
  const s = document.getElementById('status');
  s.textContent = msg;
  s.style.color = success ? 'green' : '#333';
  setTimeout(() => { s.textContent = '' }, 2500);
}

function openPlatform(platform, text) {
  const url = platform.url || 'about:blank';
  navigator.clipboard.writeText(text || '').then(() => {
    const base = getMsg('status_copied_opening');
    showStatus(`${base} ${platform.name}`);
    window.open(url, '_blank');
  }).catch(() => {
    window.open(url, '_blank');
    const opened = getMsg('status_opened');
    showStatus(`${opened} ${platform.name}`);
  });
}

async function load() {
  const store = await chrome.storage.sync.get(defaultState);
  renderPlatforms(store.platforms);
  renderTemplates(store.templates);
}

function renderPlatforms(platforms) {
  const grid = document.getElementById('platformGrid');
  grid.innerHTML = '';
  if (!platforms || platforms.length === 0) {
    grid.innerHTML = `<p class="muted">${getMsg('no_platforms_configured')}</p>`;
    return;
  }
  platforms.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'platform-item';
    const name = p.name.startsWith('platform_') ? p.name : `platform_${p.name}`;
    btn.textContent = getMsg(name);
    btn.addEventListener('click', () => {
      const input = document.getElementById('inputText').value.trim();
      openPlatform(p, input);
    });
    grid.appendChild(btn);
  });
}

function renderTemplates(templates) {
  const select = document.getElementById('templateSelect');
  select.innerHTML = `<option value="">${getMsg('choose_template')}</option>`;
  if (!templates) return;

  for (const action in templates) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = getMsg(`action_${action}`);
    templates[action].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.text;
      opt.textContent = getMsg(t.name);
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('inputText').value = '';
  });

  document.getElementById('templateSelect').addEventListener('change', (e) => {
    const text = e.target.value;
    if (!text) return;
    const input = document.getElementById('inputText');
    input.value = text.replace('{{selectedText}}', input.value);
  });

  load();
});
