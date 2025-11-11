/**
 * This script is injected into the web page.
 * It listens for messages from the background script and executes actions.
 */

// The functions from utils.js are available globally because they are loaded
// in the manifest.json before this script.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is for executing an action
    if (request.action === 'execute') {
        console.log('[Send-to-AI] Received execute command:', request);

        const { text, inputSelector, sendSelector } = request;

        // Call the main action function from utils.js
        executeAction(text, inputSelector, sendSelector)
            .then(() => {
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                sendResponse({ status: 'error', message: error.message });
            });

        // Return true to indicate that the response will be sent asynchronously
        return true;
    }
});
