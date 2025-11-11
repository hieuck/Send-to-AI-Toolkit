
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
                return match; // Keep {{...}} if data not found
            }
        }
        return val;
    });
}

// This function is injected into the target page to interact with the DOM
function _do_in_page_script(platform, prompt) {
    const { inputSelector, sendSelector } = platform;
    let attempt = 0;
    const maxAttempts = 40; // Try for up to 16 seconds
    const interval = 400;

    const intervalId = setInterval(() => {
        const inputEl = document.querySelector(inputSelector);
        if (inputEl) {
            clearInterval(intervalId);
            inputEl.focus();

            // For modern web apps (React, etc.), setting .value directly doesn't always work.
            // We need to simulate a user input event more reliably.
            const isContentEditable = inputEl.contentEditable === 'true';

            if (isContentEditable) {
                // This method works well for contentEditable divs
                inputEl.innerHTML = prompt.replace(/\n/g, '<br>');
            } else {
                // **This is the key fix for React-based inputs (like ChatGPT)**
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 
                    'value'
                ).set;
                nativeInputValueSetter.call(inputEl, prompt);
            }

            // Dispatch events to make the page's framework (React, etc.) recognize the change
            inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            // A short delay before clicking send allows the web app to process the input
            if (sendSelector) {
                setTimeout(() => {
                    const sendBtn = document.querySelector(sendSelector);
                    if (sendBtn && !sendBtn.disabled) {
                        sendBtn.click();
                    } else {
                        // Sometimes the button is found but not clickable yet, retry once.
                        setTimeout(() => {
                            const finalSendBtn = document.querySelector(sendSelector);
                            if (finalSendBtn && !finalSendBtn.disabled) {
                                finalSendBtn.click();
                            }
                        }, 500);
                    }
                }, 700); 
            }
        } else {
            attempt++;
            if (attempt >= maxAttempts) {
                clearInterval(intervalId);
                console.warn(`[Send-to-AI] Input element not found after ${maxAttempts} attempts. Selector: \"${inputSelector}\"`);
            }
        }
    }, interval);
}

// Injects the script into the tab, handling cases where the tab is still loading.
function injectScript(tabId, platform, prompt) {
    const listener = (updatedTabId, changeInfo, updatedTab) => {
        // Inject script only when the tab has finished loading and has a URL
        if (updatedTabId === tabId && changeInfo.status === 'complete' && updatedTab.url) {
            try {
                const targetUrl = new URL(platform.url);
                const currentUrl = new URL(updatedTab.url);

                // **Robust URL Check:** 
                // 1. Origins must match (e.g., https://gemini.google.com)
                // 2. The current page's path must START WITH the configured path (e.g., /app/p/123 starts with /app)
                if (targetUrl.origin === currentUrl.origin && currentUrl.pathname.startsWith(targetUrl.pathname)) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: _do_in_page_script,
                        args: [platform, prompt],
                    }).catch(err => console.error('[Send-to-AI] Deferred script injection failed:', err));
                    
                    chrome.tabs.onUpdated.removeListener(listener); // Clean up the listener to prevent memory leaks
                }
            } catch (e) {
                console.error("[Send-to-AI] Error comparing URLs:", e);
                chrome.tabs.onUpdated.removeListener(listener); // Clean up on error too
            }
        }
    };
    chrome.tabs.onUpdated.addListener(listener);
}

export function openPlatformWithPrompt(platform, prompt) {
    const { url, inputSelector } = platform;

    // Case 1: No input selector. Append the prompt to the URL.
    if (!inputSelector) {
        let destUrl;
        if (url.includes('{{prompt}}')) {
            destUrl = url.replace('{{prompt}}', encodeURIComponent(prompt));
        } else {
            // **Robust URL Appending:** Check if URL already has params.
            const separator = url.includes('?') ? '&' : '?';
            destUrl = `${url}${separator}prompt=${encodeURIComponent(prompt)}`;
        }
        chrome.tabs.create({ url: destUrl });
        return;
    }

    // Case 2: An input selector is defined. Open a tab and inject a script.
    const targetOrigin = new URL(url).origin;

    // Find a tab with the same origin to reuse, which is more efficient.
    chrome.tabs.query({ url: `${targetOrigin}/*` }, (tabs) => {
        const tabToUse = tabs.length > 0 ? tabs[0] : null;

        if (tabToUse) {
            // A tab with the same origin exists. Reuse it by updating its URL and activating it.
            chrome.tabs.update(tabToUse.id, { url: url, active: true }, (tab) => {
                if (tab) {
                    injectScript(tab.id, platform, prompt);
                } else if (chrome.runtime.lastError) {
                     // Fallback to creating a new tab if update fails (e.g., tab was closed by user)
                    chrome.tabs.create({ url: url, active: true }, (newTab) => {
                        injectScript(newTab.id, platform, prompt);
                    });
                }
            });
        } else {
            // No tab with this origin exists. Create a new one.
            chrome.tabs.create({ url: url, active: true }, (tab) => {
                injectScript(tab.id, platform, prompt);
            });
        }
    });
}
