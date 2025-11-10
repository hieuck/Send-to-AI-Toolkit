
// i18n.js

let messages = {};

// Fetches messages from the appropriate locale file
async function fetchMessages(locale = 'en') {
  try {
    const messagesUrl = chrome.runtime.getURL(`/_locales/${locale}/messages.json`);
    const response = await fetch(messagesUrl);
    if (!response.ok) {
      throw new Error(`Failed to load messages for locale: ${locale}`);
    }
    const json = await response.json();
    messages = {}; // Clear old messages
    for (const key in json) {
      messages[key] = json[key].message;
    }
    return true;
  } catch (error) {
    console.error(error);
    // Fallback to English if the chosen locale fails
    if (locale !== 'en') {
      return await fetchMessages('en');
    }
    return false;
  }
}

// Gets a message by key, similar to chrome.i18n.getMessage
function getMessage(key, fallback = '') {
  return messages[key] || fallback || key;
}

// Applies localization to the current document's DOM
function localizePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = getMessage(key);
        if (text !== key) {
           const targetAttr = el.getAttribute('data-i18n-target');
           if (targetAttr) {
               el.setAttribute(targetAttr, text);
           } else {
               el.textContent = text;
           }
        }
    });
}

export { fetchMessages, getMessage, localizePage };
