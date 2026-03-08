export type ResponseLength = 'concise' | 'detailed';

export type AIAssistantPreferences = {
  voiceLanguage: 'en-IN' | 'hi-IN' | 'en-US';
  voiceName: string;
  preferIndianAccent: boolean;
  responseLength: ResponseLength;
};

export const AI_ASSISTANT_PREFS_KEY = 'manas360-ai-assistant-prefs-v1';

export const defaultAIAssistantPreferences: AIAssistantPreferences = {
  voiceLanguage: 'en-IN',
  voiceName: '',
  preferIndianAccent: true,
  responseLength: 'concise',
};

export const readAIAssistantPreferences = (): AIAssistantPreferences => {
  try {
    const raw = localStorage.getItem(AI_ASSISTANT_PREFS_KEY);
    if (!raw) return defaultAIAssistantPreferences;
    const parsed = JSON.parse(raw) as Partial<AIAssistantPreferences>;
    return {
      ...defaultAIAssistantPreferences,
      ...parsed,
      voiceLanguage: (parsed?.voiceLanguage || defaultAIAssistantPreferences.voiceLanguage) as AIAssistantPreferences['voiceLanguage'],
      responseLength: (parsed?.responseLength || defaultAIAssistantPreferences.responseLength) as ResponseLength,
      voiceName: String(parsed?.voiceName || ''),
      preferIndianAccent: typeof parsed?.preferIndianAccent === 'boolean' ? parsed.preferIndianAccent : defaultAIAssistantPreferences.preferIndianAccent,
    };
  } catch {
    return defaultAIAssistantPreferences;
  }
};

export const saveAIAssistantPreferences = (prefs: AIAssistantPreferences): void => {
  localStorage.setItem(AI_ASSISTANT_PREFS_KEY, JSON.stringify(prefs));
};
