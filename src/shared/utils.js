
export function getMsg(key, ...args) {
    if (chrome && chrome.i18n && chrome.i18n.getMessage) {
        return chrome.i18n.getMessage(key, args);
    }
    let msg = key;
    if (args.length > 0) {
        msg += ': ' + args.join(',');
    }
    return msg;
}

export function assemblePrompt(template, data) {
    if (!template) return '';
    return template.replace(/\{\{([\w\.]+)\}\}/g, (match, key) => {
        const keys = key.split('.');
        let val = data;
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                return match;
            }
        }
        return val;
    });
}

// This function is injected into the target page to interact with the DOM.
function _do_in_page_script(platform, prompt) {
    const inputEl = document.querySelector(platform.inputSelector);
    if (!inputEl) {
        console.warn(`[Send-to-AI] Input element not found with selector: "${platform.inputSelector}"`);
        return;
    }

    inputEl.focus();

    // Use a robust method to set the input value, compatible with modern frameworks.
    const isContentEditable = inputEl.hasAttribute('contenteditable') && inputEl.getAttribute('contenteditable').toLowerCase() !== 'false';

    if (isContentEditable) {
        inputEl.innerText = prompt;
    } else {
        // This approach reliably sets the value for <input> and <textarea> elements,
        // bypassing framework state management (like React) and then triggering the necessary events.
        const elementPrototype = Object.getPrototypeOf(inputEl);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(elementPrototype, 'value').set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputEl, prompt);
        } else {
            // Fallback for edge cases
            inputEl.value = prompt;
        }
    }

    // Dispatch events to ensure the page's JavaScript framework detects the change.
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    if (platform.sendSelector) {
        setTimeout(() => {
            const sendBtn = document.querySelector(platform.sendSelector);
            if (sendBtn && !sendBtn.disabled) {
                sendBtn.click();
            } else if (sendBtn) {
                console.warn(`[Send-to-AI] Send button is disabled for selector: "${platform.sendSelector}"`);
            } else {
                console.warn(`[Send-to-AI] Send button not found with selector: "${platform.sendSelector}"`);
            }
        }, 200);
    }
}


export function openPlatformWithPrompt(platform, prompt) {
    const { url, inputSelector } = platform;

    if (inputSelector) {
        chrome.tabs.create({ url: url }, (tab) => {
            const listener = (tabId, changeInfo) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: _do_in_page_script,
                        args: [platform, prompt],
                    }).catch(err => console.error('[Send-to-AI] Script injection failed:', err));
                    
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    } else {
        const destUrl = url.replace('{{prompt}}', encodeURIComponent(prompt));
        chrome.tabs.create({ url: destUrl });
    }
}
