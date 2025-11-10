// menu.js
// Defines default platforms, actions and templates
export const PLATFORMS = [
  {
    key: "chatgpt",
    name: "platform_chatgpt",
    icon: "src/assets/icons/platforms/chatgpt.svg",
    url: "https://chatgpt.com/",
    domainPatterns: ["chatgpt.com", "chat.openai.com"]
  },
  {
    key: "gemini",
    name: "platform_gemini",
    icon: "src/assets/icons/platforms/gemini.svg",
    url: "https://gemini.google.com/",
    domainPatterns: ["gemini.google.com"]
  },
  {
    key: "claude",
    name: "platform_claude",
    icon: "src/assets/icons/platforms/claude.svg",
    url: "https://claude.ai/",
    domainPatterns: ["claude.ai"]
  },
  {
    key: "poe",
    name: "platform_poe",
    icon: "src/assets/icons/platforms/poe.svg",
    url: "https://poe.com/",
    domainPatterns: ["poe.com"]
  },
  {
    key: "perplexity",
    name: "platform_perplexity",
    icon: "src/assets/icons/platforms/perplexity.svg",
    url: "https://www.perplexity.ai/",
    domainPatterns: ["perplexity.ai"]
  },
  {
    key: "deepseek",
    name: "platform_deepseek",
    icon: "src/assets/icons/platforms/deepseek.svg",
    url: "https://deepseek.ai/",
    domainPatterns: ["deepseek.ai"]
  },
  {
    key: "grok",
    name: "platform_grok",
    icon: "src/assets/icons/platforms/grok.svg",
    url: "https://grok.com/",
    domainPatterns: ["grok.com"]
  }
];

export const ACTIONS = [
  { key: "answer", name: "action_answer", icon: "src/assets/icons/actions/answer.svg" },
  { key: "rewrite", name: "action_rewrite", icon: "src/assets/icons/actions/rewrite.svg" },
  { key: "translate", name: "action_translate", icon: "src/assets/icons/actions/translate.svg" }
];

// Default templates (category: action -> templates list)
export const DEFAULT_TEMPLATES = {
  answer: [
    { id: "quick", name: "template_answer_quick", text: "template_answer_quick_text" },
    { id: "short", name: "template_answer_short", text: "template_answer_short_text" },
    { id: "detailed", name: "template_answer_detailed", text: "template_answer_detailed_text" }
  ],
  rewrite: [
    { id: "quick", name: "template_rewrite_quick", text: "template_rewrite_quick_text" },
    { id: "short", name: "template_rewrite_short", text: "template_rewrite_short_text" },
    { id: "detailed", name: "template_rewrite_detailed", text: "template_rewrite_detailed_text" }
  ],
  translate: [
    { id: "quick", name: "template_translate_quick", text: "template_translate_quick_text" },
    { id: "formal", name: "template_translate_formal", text: "template_translate_formal_text" },
    { id: "casual", name: "template_translate_casual", text: "template_translate_casual_text" }
  ]
};
