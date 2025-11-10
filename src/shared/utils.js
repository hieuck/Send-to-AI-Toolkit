
export function getMsg(key, ...args) {
    if (chrome && chrome.i18n && chrome.i18n.getMessage) {
        return chrome.i18n.getMessage(key, args);
    }
    // Fallback for non-extension environments (or if i18n fails)
    let msg = key;
    if (args.length > 0) {
        msg += ': ' + args.join(',');
    }
    return msg;
}

export function assemblePrompt(template, data) {
    if (!template) return '';
    // A simple template engine: replaces {{key}} with data[key]
    return template.replace(/\{\{([\w\.]+)\}\}/g, (match, key) => {
        // support dot notation for nested objects
        const keys = key.split('.');
        let val = data;
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                return match; // key not found, return original placeholder
            }
        }
        return val;
    });
}

// This function will be injected into the target page
function _do_in_page_script(platform, prompt) {
    const inputEl = document.querySelector(platform.input_selector);
    if (!inputEl) {
        console.warn(`[Send-to-AI] Input element not found with selector: "${platform.input_selector}"`);
        return;
    }

    // To properly trigger framework-based UIs (like React), we need to simulate user input
    inputEl.value = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.focus();

    if (platform.send_selector) {
        // A small delay can help if the send button is initially disabled
        setTimeout(() => {
            const sendBtn = document.querySelector(platform.send_selector);
            if (sendBtn) {
                sendBtn.click();
            } else {
                console.warn(`[Send-to-AI] Send button not found with selector: "${platform.send_selector}"`);
            }
        }, 200);
    }
}


export function openPlatformWithPrompt(platform, prompt) {
    const { url, input_selector } = platform;

    // For platforms requiring DOM interaction, open a tab and inject a script
    if (input_selector) {
        chrome.tabs.create({ url: url }, (tab) => {
            // Ensure the tab is loaded before injecting the script
            const listener = (tabId, changeInfo, t) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    if (chrome.scripting && chrome.scripting.executeScript) {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            function: _do_in_page_script,
                            args: [platform, prompt],
                        });
                    } else {
                        console.error('[Send-to-AI] `chrome.scripting.executeScript` is not available. Check manifest permissions for "scripting".');
                    }
                    // unregister listener
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    } else {
        // For simple platforms, embed the prompt in the URL
        const destUrl = url.replace('{{prompt}}', encodeURIComponent(prompt));
        chrome.tabs.create({ url: destUrl });
    }
}
