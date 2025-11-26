'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

/**
 * Supported language codes for AI-generated summaries.
 * - ceb: Bisaya (Cebuano) - Default for BLGU users
 * - fil: Tagalog (Filipino)
 * - en: English
 */
export type LanguageCode = 'ceb' | 'fil' | 'en';

/**
 * Human-readable labels for each language code.
 */
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ceb: 'Bisaya (Cebuano)',
  fil: 'Tagalog (Filipino)',
  en: 'English',
};

/**
 * Short labels for compact display.
 */
export const LANGUAGE_SHORT_LABELS: Record<LanguageCode, string> = {
  ceb: 'Bisaya',
  fil: 'Tagalog',
  en: 'English',
};

interface LanguageContextType {
  /** Current preferred language for AI summaries */
  language: LanguageCode;
  /** Update the user's preferred language (persists to backend) */
  setLanguage: (lang: LanguageCode) => Promise<void>;
  /** Whether a language update is in progress */
  isUpdating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Hook to access the language context.
 * Must be used within a LanguageProvider.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for language preference management.
 *
 * Manages the user's preferred language for AI-generated content,
 * syncing with the backend when changes are made.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const { user, setUser } = useAuthStore();
  const [language, setLanguageState] = useState<LanguageCode>(
    (user?.preferred_language as LanguageCode) || 'ceb'
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync language state with user when user changes (e.g., after login)
  useEffect(() => {
    if (user?.preferred_language) {
      setLanguageState(user.preferred_language as LanguageCode);
    }
  }, [user?.preferred_language]);

  /**
   * Update the user's preferred language.
   * Persists to the backend and updates local state.
   */
  const setLanguage = useCallback(async (newLang: LanguageCode) => {
    if (newLang === language) return;

    setIsUpdating(true);
    try {
      const response = await api.patch(`/users/me/language?language=${newLang}`);

      if (response.status === 200) {
        const updatedUser = response.data;
        setUser(updatedUser);
        setLanguageState(newLang);
      }
    } catch (error) {
      console.error('Failed to update language preference:', error);
      // Optionally show a toast notification here
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [language, setUser]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isUpdating }}>
      {children}
    </LanguageContext.Provider>
  );
}
