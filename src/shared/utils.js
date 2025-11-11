
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
            
            // Step 1: Focus the input element.
            inputEl.focus();

            // Step 2: Simulate a robust 'paste' event.
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer(),
                bubbles: true,
                cancelable: true,
                composed: true
            });
            pasteEvent.clipboardData.setData('text/plain', prompt);
            inputEl.dispatchEvent(pasteEvent);

            // Step 3: Dispatch an 'input' event to ensure frameworks recognize the change.
            inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            
            // Step 4: Dispatch a 'change' event for final confirmation.
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

    // Query for all tabs matching the origin
    chrome.tabs.query({ url: `${targetOrigin}/*` }, (tabs) => {
        // Find an active tab in the current window first. This is the best candidate.
        const activeTabInCurrentWindow = tabs.find(t => t.active && t.windowId === chrome.windows.WINDOW_ID_CURRENT);
        
        // If no active tab, fall back to the first tab found in any window.
        const tabToUse = activeTabInCurrentWindow || (tabs.length > 0 ? tabs[0] : null);

        if (tabToUse) {
            // We found a tab to reuse. Update its URL and make it active.
            chrome.tabs.update(tabToUse.id, { url: url, active: true }, (updatedTab) => {
                if (updatedTab) {
                    // Inject the script into the now-updated and active tab.
                    injectScript(updatedTab.id, platform, prompt);
                } else if (chrome.runtime.lastError) {
                    // This can happen if the tab was closed between query and update.
                    // In this case, create a new tab as a fallback.
                    console.warn(`[Send-to-AI] Failed to update tab ${tabToUse.id}. It may have been closed. Creating a new one.`);
                    chrome.tabs.create({ url: url, active: true }, (newTab) => {
                        injectScript(newTab.id, platform, prompt);
                    });
                }
            });
        } else {
            // No suitable tab found, so create a new one.
            chrome.tabs.create({ url: url, active: true }, (newTab) => {
                injectScript(newTab.id, platform, prompt);
            });
        }
    });
}
