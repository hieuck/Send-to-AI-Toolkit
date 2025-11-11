import { getMsg, openPlatformWithPrompt, assemblePrompt } from '../shared/utils.js';
import { fetchMessages, getMessage, localizePage } from '../shared/i18n.js';
import { DEFAULT_TEMPLATES, PLATFORMS, ACTIONS } from '../shared/menu.js';

const defaultState = { platforms: [], templates: DEFAULT_TEMPLATES, settings: { defaultLang: 'English', locale: 'en' } };
let selectedPlatform = null;

async function load() {
    const store = await chrome.storage.sync.get(defaultState);
    await fetchMessages(store.settings.locale || 'en');
    localizePage();

    // Fix: Render actions first, then platforms to ensure proper UI state on load.
    renderActionButtons(store.templates, store.settings);
    renderPlatforms(store.platforms);

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
        // Auto-select the first platform
        if (index === 0) {
            // Use a small timeout to ensure all elements are ready before simulating the click
            setTimeout(() => btn.click(), 0);
        }
    });
}

function renderActionButtons(templates, settings) {
    const container = document.getElementById('actionContainer');
    container.innerHTML = '';
    // Set initial disabled state
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

        // Fix: Action buttons now trigger the action directly with the default template.
        btn.addEventListener('click', () => {
            if (!selectedPlatform) return; // a platform must be selected
            
            const text = document.getElementById('inputText').value.trim();
            if (!text) {
                document.getElementById('inputText').focus();
                return; // require text input
            }

            const actionTemplates = templates[action.key] || [];
            let templateText = '{{selectedText}}'; // Fallback template

            if (actionTemplates.length > 0) {
                // Use the first template as the default for the action button
                const defaultTemplate = actionTemplates[0];
                templateText = getMessage(defaultTemplate.text) || defaultTemplate.text;
            }

            const prompt = assemblePrompt(templateText, { 
                selectedText: text, 
                targetLang: settings.defaultLang || 'English' 
            });

            openPlatformWithPrompt(selectedPlatform, prompt);
        });

        // The template list can be re-introduced later if needed, 
        // but for now, this directly solves the user's reported issue.

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
