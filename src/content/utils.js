
/**
 * Waits for an element to appear in the DOM.
 * @param {string} selector - The CSS selector of the element.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 * @returns {Promise<Element>} A promise that resolves with the element or rejects on timeout.
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let timeWaited = 0;

        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else {
                timeWaited += intervalTime;
                if (timeWaited >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`Element with selector "${selector}" not found after ${timeout}ms.`));
                }
            }
        }, intervalTime);
    });
}

/**
 * Simulates a user typing text into an input field or contenteditable element.
 * @param {Element} element - The target element.
 * @param {string} text - The text to type.
 */
function simulateTyping(element, text) {
    if (element.value !== undefined) {
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } 
    else if (element.isContentEditable) {
        element.focus();
        element.innerText = text;
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
}

/**
 * Simulates a user clicking on an element.
 * @param {Element} element - The target element.
 */
function simulateClick(element) {
    element.focus();
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/**
 * The main action function that chains the simulation steps.
 * @param {string} text - The text to send.
 * @param {string} inputSelector - The CSS selector for the input field.
 * @param {string} sendSelector - The CSS selector for the send button.
 */
async function executeAction(text, inputSelector, sendSelector) {
    try {
        console.log(`[Send-to-AI] 1. Waiting for input: ${inputSelector}`);
        const inputElement = await waitForElement(inputSelector);
        
        console.log('[Send-to-AI] 2. Typing text.');
        simulateTyping(inputElement, text);

        await new Promise(resolve => setTimeout(resolve, 200));

        console.log(`[Send-to-AI] 3. Waiting for send button: ${sendSelector}`);
        const sendButton = await waitForElement(sendSelector);
        
        console.log('[Send-to-AI] 4. Clicking send button.');
        simulateClick(sendButton);

        console.log('[Send-to-AI] 5. Action complete.');
    } catch (error) {
        console.error('[Send-to-AI] Action failed:', error);
    }
}
