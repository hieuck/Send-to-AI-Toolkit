
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

            // --- The Definitive Fix for ChatGPT & other complex SPAs ---
            // We simulate a 'paste' event, which is the most reliable way to inject text
            // as frameworks like React are built to handle this event natively.

            // 1. Create a 'paste' event.
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer(),
                bubbles: true,
                cancelable: true,
                composed: true
            });

            // 2. Set the data for the event.
            pasteEvent.clipboardData.setData('text/plain', prompt);

            // 3. Dispatch the event to the input element.
            inputEl.dispatchEvent(pasteEvent);

            // 4. Dispatch `input` and `change` events afterwards to ensure any listeners
            // for the send button's state are correctly triggered.
            inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            if (sendSelector) {
                setTimeout(() => {
                    const sendBtn = document.querySelector(sendSelector);
                    if (sendBtn && !sendBtn.disabled) {
                        sendBtn.click();
                    } else {
                        // Retry after a short delay, as the button might be re-enabled by the framework
                        setTimeout(() => {
                            const finalSendBtn = document.querySelector(sendSelector);
                            if (finalSendBtn && !finalSendBtn.disabled) {
                                finalSendBtn.click();
                            } else {
                                console.warn(`[Send-to-AI] Send button not found or disabled. Selector: "${sendSelector}"`);
                            }
                        }, 500);
                    }
                }, 700); 
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

// Injects the script into the tab, handling cases where the tab is still loading.
function injectScript(tabId, platform, prompt) {
    const listener = (updatedTabId, changeInfo, updatedTab) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete' && updatedTab.url) {
            try {
                const targetUrl = new URL(platform.url);
                const currentUrl = new URL(updatedTab.url);

                if (targetUrl.origin === currentUrl.origin && currentUrl.pathname.startsWith(targetUrl.pathname)) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: _do_in_page_script,
                        args: [platform, prompt],
                    }).catch(err => console.error('[Send-to-AI] Deferred script injection failed:', err));
                    
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            } catch (e) {
                console.error("[Send-to-AI] Error comparing URLs:", e);
                chrome.tabs.onUpdated.removeListener(listener);
            }
        }
    };
    chrome.tabs.onUpdated.addListener(listener);
}

export function openPlatformWithPrompt(platform, prompt) {
    const { url, inputSelector } = platform;

    if (!inputSelector) {
        let destUrl;
        if (url.includes('{{prompt}}')) {
            destUrl = url.replace('{{prompt}}', encodeURIComponent(prompt));
        } else {
            const separator = url.includes('?') ? '&' : '?';
            destUrl = `${url}${separator}prompt=${encodeURIComponent(prompt)}`;
        }
        chrome.tabs.create({ url: destUrl });
        return;
    }

    const targetOrigin = new URL(url).origin;

    chrome.tabs.query({ url: `${targetOrigin}/*` }, (tabs) => {
        const tabToUse = tabs.length > 0 ? tabs[0] : null;

        if (tabToUse) {
            chrome.tabs.update(tabToUse.id, { url: url, active: true }, (tab) => {
                if (tab) {
                    injectScript(tab.id, platform, prompt);
                } else if (chrome.runtime.lastError) {
                    chrome.tabs.create({ url: url, active: true }, (newTab) => {
                        injectScript(newTab.id, platform, prompt);
                    });
                }
            });
        } else {
            chrome.tabs.create({ url: url, active: true }, (tab) => {
                injectScript(tab.id, platform, prompt);
            });
        }
    });
}
