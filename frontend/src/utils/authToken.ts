/**
 * Shared authentication token management across all API clients
 */

const TOKEN_KEY = 'token';
const DEFAULT_DEMO_TOKEN = 'demo-token';

/**
 * Get authorization token from localStorage with fallback to demo token
 */
export const getAuthToken = (): string => {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      localStorage.setItem(TOKEN_KEY, DEFAULT_DEMO_TOKEN);
      token = DEFAULT_DEMO_TOKEN;
    }
    return token;
  } catch (error) {
    console.warn('Failed to access localStorage, using demo token', error);
    return DEFAULT_DEMO_TOKEN;
  }
};

/**
 * Get Authorization header object with Bearer token
 */
export const getAuthHeaders = (): Record<string, string> => {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
  };
};
