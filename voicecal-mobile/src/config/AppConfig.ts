export const AppConfig = {
  llm: {
    baseUrl: 'https://api.deepseek.com',
    apiKey: 'sk-c33c4fa7b24e47e29bd88bed1ce0a066',
    model: 'deepseek-v4-flash',
    temperature: 0.1,
    maxTokens: 1000,
  },
  calendar: {
    defaultEventDurationMinutes: 60,
    requireConfirmationForDestructive: true,
    maxRecurringInstances: 365,
  },
  voice: {
    language: 'zh-CN',
    speechRate: 0.5,
  },
  database: {
    name: 'voicecal.db',
    version: 1,
  },
};
