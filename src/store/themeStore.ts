import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.body.classList.toggle('light', newTheme === 'light');
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        document.body.classList.toggle('light', theme === 'light');
        return set({ theme });
      },
    }),
    {
      name: 'identitychain-theme',
    }
  )
);
