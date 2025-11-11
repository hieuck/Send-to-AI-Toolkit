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
        if (index === 0) {
            setTimeout(() => btn.click(), 0);
        }
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

        const mainBtn = document.createElement('button');
        mainBtn.className = 'action-btn';
        mainBtn.textContent = getMessage(`action_${action.key}`);
        mainBtn.dataset.action = action.key;
        actionWrapper.appendChild(mainBtn);

        const templateList = document.createElement('div');
        templateList.className = 'template-list';
        templateList.style.display = 'none'; // Initially hidden
        actionWrapper.appendChild(templateList);

        const actionTemplates = templates[action.key] || [];
        if (actionTemplates.length > 0) {
            actionTemplates.forEach(template => {
                const templateBtn = document.createElement('button');
                templateBtn.className = 'template-btn';
                templateBtn.textContent = getMessage(template.name) || template.name;
                templateList.appendChild(templateBtn);

                templateBtn.addEventListener('click', () => {
                    if (!selectedPlatform) return;
                    const text = document.getElementById('inputText').value.trim();
                    if (!text) {
                        document.getElementById('inputText').focus();
                        return;
                    }

                    const templateText = getMessage(template.text) || template.text;
                    const prompt = assemblePrompt(templateText, {
                        selectedText: text,
                        targetLang: settings.defaultLang || 'English'
                    });
                    openPlatformWithPrompt(selectedPlatform, prompt);
                });
            });
        } else {
          mainBtn.disabled = true; // Disable main button if no templates exist
        }

        // Toggle template list on main button click
        mainBtn.addEventListener('click', () => {
            // Close other open template lists
            document.querySelectorAll('.template-list').forEach(list => {
                if (list !== templateList) {
                    list.style.display = 'none';
                }
            });
            // Toggle current list
            templateList.style.display = templateList.style.display === 'none' ? 'flex' : 'none';
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
