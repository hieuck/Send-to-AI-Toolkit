export const PLATFORMS = [
    {
        key: "chatgpt",
        name: "platform_chatgpt",
        url: "https://chatgpt.com/",
        domainPatterns: ["chatgpt.com"],
        inputSelector: 'p.placeholder',
        sendSelector: '#composer-submit-button path',
    },
    {
        key: "gemini",
        name: "platform_gemini",
        url: "https://gemini.google.com/app",
        domainPatterns: ["gemini.google.com"],
        inputSelector: '.ql-editor > p',
        sendSelector: 'mat-icon.send-button-icon',
    },
    {
        key: "claude",
        name: "platform_claude",
        url: "https://claude.ai/new",
        domainPatterns: ["claude.ai"],
        inputSelector: 'p.is-empty',
        sendSelector: 'button.font-base-bold',
    },
    {
        key: "perplexity",
        name: "platform_perplexity",
        url: "https://www.perplexity.ai/",
        domainPatterns: ["perplexity.ai"],
        inputSelector: 'div[id="ask-input"]',
        sendSelector: 'button[data-testid="submit-button"]',
    },
    {
        key: "poe",
        name: "platform_poe",
        url: "https://poe.com/",
        domainPatterns: ["poe.com"],
        inputSelector: 'textarea.GrowingTextArea_textArea__ZWQbP',
        sendSelector: 'button.button_primary__Vo3KL',
    },
    {
        key: "deepseek",
        name: "platform_deepseek",
        url: "https://chat.deepseek.com/",
        domainPatterns: ["chat.deepseek.com"],
        inputSelector: 'textarea._27c9245',
        sendSelector: '._7436101 > .ds-icon-button__hover-bg',
    }
];


export const ACTIONS = [
    { key: 'answer', name: 'action_answer' },
    { key: 'rewrite', name: 'action_rewrite' },
    { key: 'translate', name: 'action_translate' },
    { key: 'code', name: 'action_code' },
    { key: 'summarize', name: 'action_summarize' }
];

export const DEFAULT_TEMPLATES = {
    answer: [
        { name: 'template_answer_quick', text: 'template_answer_quick_text' },
        { name: 'template_answer_short', text: 'template_answer_short_text' },
        { name: 'template_answer_detailed', text: 'template_answer_detailed_text' },
        { name: 'template_answer_reply_in_tone', text: 'template_answer_reply_in_tone_text' }
    ],
    rewrite: [
        { name: 'template_rewrite_quick', text: 'template_rewrite_quick_text' },
        { name: 'template_rewrite_short', text: 'template_rewrite_short_text' },
        { name: 'template_rewrite_detailed', text: 'template_rewrite_detailed_text' },
        { name: 'template_rewrite_tone', text: 'template_rewrite_tone_text' },
    ],
    translate: [
        { name: 'template_translate_quick', text: 'template_translate_quick_text' },
        { name: 'template_translate_formal', text: 'template_translate_formal_text' },
        { name: 'template_translate_casual', text: 'template_translate_casual_text' },
    ],
    code: [
        { name: 'template_code_explain', text: 'template_code_explain_text' },
    ],
    summarize: [
        { name: 'template_summarize_bullets', text: 'template_summarize_bullets_text' },
    ],
};
