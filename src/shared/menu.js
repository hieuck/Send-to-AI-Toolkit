// menu.js
// Defines default platforms, actions and templates
export const PLATFORMS = [
  {
    key: "chatgpt",
    name: "ChatGPT",
    url: "https://chat.openai.com/",
    // urlTemplate if platform supports prompt via URL; many web UIs don't — this is a best-effort
    urlTemplate: "https://chat.openai.com/?q={{prompt}}",
    domainPatterns: ["chat.openai.com"]
  },
  {
    key: "gemini",
    name: "Gemini",
    url: "https://gemini.google.com/",
    urlTemplate: "https://gemini.google.com/?q={{prompt}}",
    domainPatterns: ["gemini.google.com"]
  },
  {
    key: "claude",
    name: "Claude",
    url: "https://claude.ai/",
    urlTemplate: "https://claude.ai/?q={{prompt}}",
    domainPatterns: ["claude.ai"]
  },
  {
    key: "poe",
    name: "POE",
    url: "https://poe.com/",
    urlTemplate: "https://poe.com/",
    domainPatterns: ["poe.com"]
  },
  {
    key: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    urlTemplate: "https://www.perplexity.ai/search?q={{prompt}}",
    domainPatterns: ["perplexity.ai"]
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    url: "https://deepseek.ai/",
    urlTemplate: "https://deepseek.ai/?q={{prompt}}",
    domainPatterns: ["deepseek.ai"]
  }
];

export const ACTIONS = [
  { key: "answer", name: "Answer" },
  { key: "rewrite", name: "Rewrite" },
  { key: "translate", name: "Translate" }
];

// Default templates (category: action -> templates list)
export const DEFAULT_TEMPLATES = {
  answer: [
    { id: "quick", name: "Quick version", text: "Answer concisely: {{selectedText}}" },
    { id: "short", name: "Short version", text: "Provide a short answer for: {{selectedText}}" },
    { id: "detailed", name: "Detailed version", text: "Provide a detailed, step-by-step answer for: {{selectedText}}" }
  ],
  rewrite: [
    { id: "quick", name: "Quick version", text: "Rewrite concisely: {{selectedText}}" },
    { id: "short", name: "Short version", text: "Rewrite in a short style: {{selectedText}}" },
    { id: "detailed", name: "Detailed version", text: "Rewrite with expanded detail and polish: {{selectedText}}" }
  ],
  translate: [
    { id: "quick", name: "Quick version", text: "Translate to {{targetLang}}: {{selectedText}}" },
    { id: "formal", name: "Formal", text: "Translate to {{targetLang}} in a formal tone: {{selectedText}}" },
    { id: "casual", name: "Casual", text: "Translate to {{targetLang}} in a casual tone: {{selectedText}}" }
  ]
};
