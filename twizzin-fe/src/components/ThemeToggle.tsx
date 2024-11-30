'use client';
import { useTheme } from '@/hooks/useTheme';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
  );
};

export default ThemeToggle;
