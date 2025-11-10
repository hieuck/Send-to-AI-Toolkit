import { getMsg, openPlatformWithPrompt, assemblePrompt } from '../shared/utils.js';
import { fetchMessages, getMessage, localizePage } from '../shared/i18n.js';
import { DEFAULT_TEMPLATES, PLATFORMS, ACTIONS } from '../shared/menu.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English', locale: 'en' } };
let selectedPlatform = null;

async function load() {
    const store = await chrome.storage.sync.get(defaultState);
    await fetchMessages(store.settings.locale || 'en');
    localizePage();

    renderPlatforms(store.platforms);
    renderActionButtons(store.templates, store.settings);

    const lastInput = await chrome.storage.local.get('lastInput');
    if (lastInput.lastInput) {
        document.getElementById('inputText').value = lastInput.lastInput;
    }
}

function renderPlatforms(platforms) {
    const grid = document.getElementById('platformGrid');
    grid.innerHTML = '';
    if (!platforms || platforms.length === 0) {
        grid.innerHTML = `<p class="muted">${getMessage('no_platforms_configured')}</p>`;
        return;
    }

    platforms.forEach((p, index) => {
        const btn = document.createElement('button');
        btn.className = 'platform-item';
        btn.role = 'radio';
        btn.setAttribute('aria-checked', 'false');
        const name = p.name.startsWith('platform_') ? getMessage(p.name) : p.name;
        btn.textContent = name;
        btn.dataset.platformKey = p.key;

        btn.addEventListener('click', () => {
            document.querySelectorAll('#platformGrid .platform-item').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');
            selectedPlatform = p;
            document.getElementById('actionContainer').style.opacity = '1';
            document.getElementById('actionContainer').style.pointerEvents = 'auto';
        });

        grid.appendChild(btn);
        if (index === 0) btn.click();
    });
}

function renderActionButtons(templates, settings) {
    const container = document.getElementById('actionContainer');
    container.innerHTML = '';
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';

    ACTIONS.forEach(action => {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'action-wrapper';

        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = getMessage(`action_${action.key}`);
        btn.dataset.action = action.key;
        actionWrapper.appendChild(btn);

        const templateList = document.createElement('div');
        templateList.className = 'template-list';
        actionWrapper.appendChild(templateList);

        if (templates[action.key] && templates[action.key].length > 0) {
            templates[action.key].forEach(template => {
                const tplBtn = document.createElement('button');
                tplBtn.className = 'template-btn';
                tplBtn.textContent = getMessage(template.name) || template.name;
                tplBtn.addEventListener('click', () => {
                    if (!selectedPlatform) return;
                    const text = document.getElementById('inputText').value.trim();
                    const prompt = assemblePrompt(template.text, { 
                        selectedText: text, 
                        targetLang: settings.defaultLang || 'English' 
                    });
                    openPlatformWithPrompt(selectedPlatform, prompt);
                });
                templateList.appendChild(tplBtn);
            });
        } else {
            templateList.innerHTML = `<p class="muted-small">${getMessage('no_templates_configured')}</p>`;
        }

        btn.addEventListener('click', () => {
            document.querySelectorAll('.template-list').forEach(list => {
                if (list !== templateList) list.classList.remove('expanded');
            });
            templateList.classList.toggle('expanded');
        });

        container.appendChild(actionWrapper);
    });
}

function saveInput() {
    const text = document.getElementById('inputText').value;
    chrome.storage.local.set({ lastInput: text });
}

document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
    document.getElementById('inputText').addEventListener('input', saveInput);
});
