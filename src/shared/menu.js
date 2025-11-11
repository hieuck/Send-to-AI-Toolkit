export const PLATFORMS = [
    {
        key: "chatgpt",
        name: "platform_chatgpt",
        url: "https://chatgpt.com/",
        domainPatterns: ["chatgpt.com"],
        inputSelector: '#prompt-textarea',
        sendSelector: 'button[data-testid="send-button"]',
    },
    {
        key: "gemini",
        name: "platform_gemini",
        url: "https://gemini.google.com/app",
        domainPatterns: ["gemini.google.com"],
        inputSelector: '.ql-editor[contenteditable="true"]',
        sendSelector: 'button.send-button',
    },
    {
        key: "claude",
        name: "platform_claude",
        url: "https://claude.ai/new",
        domainPatterns: ["claude.ai"],
        inputSelector: 'div[contenteditable="true"]',
        sendSelector: 'button[aria-label="Send Message"]',
    },
    {
        key: "perplexity",
        name: "platform_perplexity",
        url: "https://www.perplexity.ai/",
        domainPatterns: ["perplexity.ai"],
        inputSelector: 'textarea[placeholder*="Ask anything"]',
        sendSelector: 'button[aria-label*="Submit"]',
    },
    {
        key: "poe",
        name: "platform_poe",
        url: "https://poe.com/",
        domainPatterns: ["poe.com"],
        inputSelector: 'textarea[class*="GrowingTextArea_textArea"]',
        sendSelector: 'button[class*="sendButton"]',
    },
    {
        key: "deepseek",
        name: "platform_deepseek",
        url: "https://chat.deepseek.com/",
        domainPatterns: ["chat.deepseek.com"],
        inputSelector: '#chat-input',
        sendSelector: 'div[role="button"][aria-disabled="false"]',
    }
];


export const ACTIONS = [
    { key: 'answer', name: 'action_answer' },
    { key: 'rewrite', name: 'action_rewrite' },
    { key: 'translate', name: 'action_translate' }
];

export const DEFAULT_TEMPLATES = {
    answer: [
        { name: 'template_answer_quick', text: 'template_answer_quick_text' },
        { name: 'template_answer_short', text: 'template_answer_short_text' },
        { name: 'template_answer_detailed', text: 'template_answer_detailed_text' },
    ],
    rewrite: [
        { name: 'template_rewrite_quick', text: 'template_rewrite_quick_text' },
        { name: 'template_rewrite_short', text: 'template_rewrite_short_text' },
        { name: 'template_rewrite_professional', text: 'template_rewrite_professional_text' },
        { name: 'template_rewrite_casual', text: 'template_rewrite_casual_text' },
    ],
    translate: [
        { name: 'template_translate_default', text: 'default_translate_template' },
    ],
};
