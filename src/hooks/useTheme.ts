import { useContext } from 'react';
import { ThemeContext, Theme } from '../components/ThemeProvider';

export type { Theme };

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
