import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ColorScheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    gradient: string[];
  };
  features: {
    darkMode: boolean;
    highContrast: boolean;
    autoAdapt: boolean;
  };
}

export const colorSchemes: ColorScheme[] = [
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Sleek dark theme with blue accents',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      border: '#334155',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      gradient: ['#3B82F6', '#1E40AF']
    },
    features: {
      darkMode: true,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    description: 'Vibrant purple theme with gradient effects',
    colors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA',
      background: '#0C0A09',
      surface: '#1C1917',
      text: '#FAFAF9',
      textSecondary: '#D6D3D1',
      border: '#44403C',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#8B5CF6',
      gradient: ['#8B5CF6', '#EC4899', '#F59E0B']
    },
    features: {
      darkMode: true,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool blue and teal theme inspired by the ocean',
    colors: {
      primary: '#06B6D4',
      secondary: '#0891B2',
      accent: '#22D3EE',
      background: '#0C4A6E',
      surface: '#164E63',
      text: '#F0F9FF',
      textSecondary: '#BAE6FD',
      border: '#155E75',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#06B6D4',
      gradient: ['#06B6D4', '#3B82F6', '#8B5CF6']
    },
    features: {
      darkMode: true,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    description: 'Warm orange and red theme with sunset vibes',
    colors: {
      primary: '#F97316',
      secondary: '#EA580C',
      accent: '#FB923C',
      background: '#7C2D12',
      surface: '#9A3412',
      text: '#FEF7ED',
      textSecondary: '#FED7AA',
      border: '#C2410C',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#F97316',
      gradient: ['#F97316', '#EF4444', '#EC4899']
    },
    features: {
      darkMode: true,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'forest-fresh',
    name: 'Forest Fresh',
    description: 'Natural green theme inspired by nature',
    colors: {
      primary: '#16A34A',
      secondary: '#15803D',
      accent: '#4ADE80',
      background: '#14532D',
      surface: '#166534',
      text: '#F0FDF4',
      textSecondary: '#BBF7D0',
      border: '#16A34A',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#16A34A',
      gradient: ['#16A34A', '#22C55E', '#84CC16']
    },
    features: {
      darkMode: true,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Clean and minimal light theme',
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#6B7280',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      gradient: ['#1F2937', '#6B7280']
    },
    features: {
      darkMode: false,
      highContrast: false,
      autoAdapt: true
    }
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    description: 'Electric neon theme for gaming and streaming',
    colors: {
      primary: '#00FFFF',
      secondary: '#FF00FF',
      accent: '#39FF14',
      background: '#000000',
      surface: '#111111',
      text: '#00FFFF',
      textSecondary: '#FF00FF',
      border: '#00FFFF',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000',
      info: '#00FFFF',
      gradient: ['#00FFFF', '#FF00FF', '#39FF14', '#FF0080']
    },
    features: {
      darkMode: true,
      highContrast: true,
      autoAdapt: false
    }
  },
  {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    description: 'Futuristic cyberpunk aesthetic',
    colors: {
      primary: '#FF0080',
      secondary: '#8000FF',
      accent: '#00FF80',
      background: '#0A0A0A',
      surface: '#1A1A1A',
      text: '#FF0080',
      textSecondary: '#00FF80',
      border: '#8000FF',
      success: '#00FF80',
      warning: '#FFFF00',
      error: '#FF0000',
      info: '#FF0080',
      gradient: ['#FF0080', '#8000FF', '#00FF80']
    },
    features: {
      darkMode: true,
      highContrast: true,
      autoAdapt: false
    }
  }
];

interface ThemeContextType {
  currentTheme: ColorScheme;
  setTheme: (themeId: string) => void;
  themes: ColorScheme[];
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'modern-dark'
}) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(defaultTheme);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('stream-platform-theme');
    if (savedTheme && colorSchemes.find(t => t.id === savedTheme)) {
      setCurrentThemeId(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const theme = colorSchemes.find(t => t.id === currentThemeId) || colorSchemes[0];
    
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-warning', theme.colors.warning);
    root.style.setProperty('--theme-error', theme.colors.error);
    root.style.setProperty('--theme-info', theme.colors.info);
    
    // Apply gradient
    theme.colors.gradient.forEach((color, index) => {
      root.style.setProperty(`--theme-gradient-${index + 1}`, color);
    });

    // Add theme class to body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme.id}`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.primary);
    }
  }, [currentThemeId]);

  const setTheme = (themeId: string) => {
    if (colorSchemes.find(t => t.id === themeId)) {
      setCurrentThemeId(themeId);
      localStorage.setItem('stream-platform-theme', themeId);
    }
  };

  const currentTheme = colorSchemes.find(t => t.id === currentThemeId) || colorSchemes[0];
  const isDarkMode = currentTheme.features.darkMode;

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        themes: colorSchemes,
        isDarkMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};