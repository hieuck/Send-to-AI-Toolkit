import { getMsg, openPlatformWithPrompt, assemblePrompt } from '../shared/utils.js';
import { fetchMessages, getMessage, localizePage } from '../shared/i18n.js';
import { DEFAULT_TEMPLATES, PLATFORMS, ACTIONS } from '../shared/menu.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English', locale: 'en' } };

function showStatus(msg, success = false) {
    const s = document.getElementById('status');
    s.textContent = msg;
    s.style.color = success ? 'green' : '#333';
    setTimeout(() => { s.textContent = ''; }, 2500);
}

async function load() {
    const store = await chrome.storage.sync.get(defaultState);
    await fetchMessages(store.settings.locale || 'en');
    localizePage();

    renderActionButtons(store.templates, store.platforms, store.settings);
    renderPlatforms(store.platforms);
    renderTemplates(store.templates);

    // Restore last input text if available
    const lastInput = await chrome.storage.local.get('lastInput');
    if (lastInput.lastInput) {
        document.getElementById('inputText').value = lastInput.lastInput;
    }
}

function renderActionButtons(templates, platforms, settings) {
    const container = document.getElementById('actionButtons');
    container.innerHTML = '';

    ACTIONS.slice(0, 4).forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = getMessage(`action_${action.key}`);
        btn.dataset.action = action.key;

        btn.addEventListener('click', () => {
            const platform = platforms[0] || PLATFORMS[0];
            if (!platform) {
                showStatus(getMessage('no_platforms_configured'), false);
                return;
            }

            const text = document.getElementById('inputText').value.trim();
            const defaultTemplate = (templates[action.key] && templates[action.key][0]) 
                ? templates[action.key][0].text 
                : (action.key === 'translate') 
                    ? getMessage('default_translate_template') 
                    : '{{selectedText}}';

            const prompt = assemblePrompt(defaultTemplate, {
                selectedText: text,
                targetLang: settings.defaultLang || 'English',
            });

            openPlatformWithPrompt(platform, prompt);
        });

        container.appendChild(btn);
    });
}

function renderPlatforms(platforms) {
    const grid = document.getElementById('platformGrid');
    grid.innerHTML = '';
    if (!platforms || platforms.length === 0) {
        grid.innerHTML = `<p class="muted">${getMessage('no_platforms_configured')}</p>`;
        return;
    }

    platforms.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'platform-item';
        const name = p.name.startsWith('platform_') ? getMessage(p.name) : p.name;
        btn.textContent = name;

        btn.addEventListener('click', () => {
            const text = document.getElementById('inputText').value.trim();
            openPlatformWithPrompt(p, text);
        });

        grid.appendChild(btn);
    });
}

function renderTemplates(templates) {
    const select = document.getElementById('templateSelect');
    select.innerHTML = `<option value="">${getMessage('choose_template')}</option>`;
    if (!templates) return;

    for (const action in templates) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = getMessage(`action_${action}`);
        templates[action].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.text;
            opt.textContent = getMessage(t.name);
            optgroup.appendChild(opt);
        });
        select.appendChild(optgroup);
    }
}

function saveInput() {
    const text = document.getElementById('inputText').value;
    chrome.storage.local.set({ lastInput: text });
}

document.addEventListener('DOMContentLoaded', () => {
    load();

    document.getElementById('openOptions').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        document.getElementById('inputText').value = '';
        saveInput();
    });

    document.getElementById('templateSelect').addEventListener('change', e => {
        const text = e.target.value;
        if (!text) return;
        const input = document.getElementById('inputText');
        const currentText = input.value.trim();
        
        const prompt = assemblePrompt(text, {
            selectedText: currentText,
            targetLang: 'English' // This could be made dynamic in the future
        });

        input.value = prompt;
        saveInput();
    });

    document.getElementById('inputText').addEventListener('input', saveInput);
});
