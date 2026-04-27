import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface MDCAuthContextProps {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const MDCAuthContext = createContext<MDCAuthContextProps | undefined>(undefined);

export const MDCAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mdc_token');
    if (stored) setToken(stored);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('mdc_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('mdc_token');
    setToken(null);
  };

  return (
    <MDCAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        login,
        logout,
      }}
    >
      {children}
    </MDCAuthContext.Provider>
  );
};

export const useMDCAuth = () => {
  const context = useContext(MDCAuthContext);
  if (!context) {
    throw new Error('useMDCAuth must be used within MDCAuthProvider');
  }
  return context;
};
