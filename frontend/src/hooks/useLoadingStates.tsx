import { useState, useCallback } from 'react';

export type LoadingState = {
  page: boolean;
  assessment: boolean;
  booking: boolean;
  providers: boolean;
  history: boolean;
  [key: string]: boolean;
};

type LoadingActions = {
  setLoading: (key: keyof LoadingState, loading: boolean) => void;
  startLoading: (key: keyof LoadingState) => void;
  stopLoading: (key: keyof LoadingState) => void;
  isLoading: (key: keyof LoadingState) => boolean;
  isAnyLoading: () => boolean;
  resetAll: () => void;
};

const initialLoadingState: LoadingState = {
  page: false,
  assessment: false,
  booking: false,
  providers: false,
  history: false,
};

export const useLoadingStates = (initialState: Record<string, boolean> = {}): [LoadingState, LoadingActions] => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    ...initialLoadingState,
    ...initialState,
  });

  const setLoading = useCallback((key: keyof LoadingState, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const startLoading = useCallback((key: keyof LoadingState) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: keyof LoadingState) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const isLoading = useCallback((key: keyof LoadingState) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  const resetAll = useCallback(() => {
    setLoadingStates(initialLoadingState);
  }, []);

  const actions: LoadingActions = {
    setLoading,
    startLoading,
    stopLoading,
    isLoading,
    isAnyLoading,
    resetAll,
  };

  return [loadingStates, actions];
};