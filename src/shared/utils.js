
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

function _do_in_page_script(platform, prompt) {
    const { inputSelector, sendSelector } = platform;
    let attempt = 0;
    const maxAttempts = 20; 
    const interval = 300;

    const intervalId = setInterval(() => {
        const inputEl = document.querySelector(inputSelector);
        if (inputEl) {
            clearInterval(intervalId);
            inputEl.focus();

            const isContentEditable = inputEl.contentEditable === 'true';

            if (isContentEditable) {
                inputEl.innerHTML = prompt.replace(/\n/g, '<br>');
            } else {
                inputEl.value = prompt;
            }

            inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            if (sendSelector) {
                setTimeout(() => {
                    const sendBtn = document.querySelector(sendSelector);
                    if (sendBtn && !sendBtn.disabled) {
                        sendBtn.click();
                    } else {
                        console.warn(`[Send-to-AI] Send button not found or disabled for selector: "${sendSelector}"`);
                    }
                }, 500);
            }
        } else {
            attempt++;
            if (attempt >= maxAttempts) {
                clearInterval(intervalId);
                console.warn(`[Send-to-AI] Input element not found after ${maxAttempts} attempts. Selector: "${inputSelector}"`);
            }
        }
    }, interval);
}

function injectScript(tabId, platform, prompt) {
    // First, check the status of the tab
    chrome.tabs.get(tabId, (tab) => {
        if (tab.status === 'complete') {
            // If the tab is already loaded, inject the script immediately
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: _do_in_page_script,
                args: [platform, prompt],
            }).catch(err => console.error('[Send-to-AI] Immediate script injection failed:', err));
        } else {
            // If the tab is still loading, add a listener to inject when it's complete
            const listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: _do_in_page_script,
                        args: [platform, prompt],
                    }).catch(err => console.error('[Send-to-AI] Deferred script injection failed:', err));
                    
                    chrome.tabs.onUpdated.removeListener(listener); // Clean up the listener
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        }
    });
}

export function openPlatformWithPrompt(platform, prompt) {
    const { url, inputSelector } = platform;

    if (!inputSelector) {
        const destUrl = url.replace('{{prompt}}', encodeURIComponent(prompt));
        chrome.tabs.create({ url: destUrl });
        return;
    }

    // Check if a tab for the platform is already open
    chrome.tabs.query({ url: `${new URL(url).origin}/*` }, (tabs) => {
        const existingTab = tabs.find(t => t.url.startsWith(url));

        if (existingTab) {
            chrome.tabs.update(existingTab.id, { active: true }, (tab) => {
                injectScript(tab.id, platform, prompt);
            });
        } else {
            chrome.tabs.create({ url: url, active: true }, (tab) => {
                injectScript(tab.id, platform, prompt);
            });
        }
    });
}
