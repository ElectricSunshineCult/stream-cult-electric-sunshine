import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Sun, 
  Moon, 
  Eye, 
  Zap, 
  Monitor, 
  Smartphone,
  Check,
  Sparkles,
  Shirt
} from "lucide-react";
import { useTheme, colorSchemes, ColorScheme } from './ThemeProvider';
import { toast } from "@/hooks/use-toast";

// Individual theme card component
const ThemeCard: React.FC<{
  theme: ColorScheme;
  isActive: boolean;
  onSelect: (theme: ColorScheme) => void;
}> = ({ theme, isActive, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getThemeIcon = (themeId: string) => {
    const iconMap = {
      'modern-dark': Monitor,
      'purple-dream': Sparkles,
      'ocean-breeze': Sun,
      'sunset-glow': Sparkles,
      'forest-fresh': Monitor,
      'minimal-light': Shirt,
      'neon-glow': Zap,
      'cyber-punk': Zap
    };
    const IconComponent = iconMap[themeId as keyof typeof iconMap] || Monitor;
    return <IconComponent className="h-4 w-4" />;
  };

  const getPreviewGradient = (colors: string[]) => {
    if (colors.length === 2) {
      return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    }
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isActive ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={() => onSelect(theme)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Theme Preview Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getThemeIcon(theme.id)}
              <span className="font-medium text-sm">{theme.name}</span>
              {isActive && (
                <Badge 
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.text
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
            
            {/* Feature badges */}
            <div className="flex gap-1">
              {theme.features.darkMode && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5"
                  style={{ 
                    borderColor: theme.colors.accent,
                    color: theme.colors.accent
                  }}
                >
                  <Moon className="h-3 w-3" />
                </Badge>
              )}
              {theme.features.highContrast && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5"
                  style={{ 
                    borderColor: theme.colors.accent,
                    color: theme.colors.accent
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>

          {/* Color Palette Preview */}
          <div className="flex gap-1 h-8 rounded overflow-hidden">
            {theme.colors.gradient.map((color, index) => (
              <div
                key={index}
                className="flex-1 h-full"
                style={{ backgroundColor: color }}
                title={`Color ${index + 1}: ${color}`}
              />
            ))}
          </div>

          {/* Theme Description */}
          <p 
            className="text-xs leading-relaxed"
            style={{ color: theme.colors.textSecondary }}
          >
            {theme.description}
          </p>

          {/* Color Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <span style={{ color: theme.colors.textSecondary }}>Primary</span>
            </div>
            <div className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.surface }}
                style={{ 
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`
                }}
              />
              <span style={{ color: theme.colors.textSecondary }}>Surface</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Theme Selector Component
const ThemeSelector: React.FC<{
  onThemeChange?: (theme: ColorScheme) => void;
}> = ({ onThemeChange }) => {
  const { currentTheme, setTheme, themes, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'dark' | 'light' | 'gaming'>('all');

  const filteredThemes = themes.filter(theme => {
    switch (selectedCategory) {
      case 'dark':
        return theme.features.darkMode;
      case 'light':
        return !theme.features.darkMode;
      case 'gaming':
        return theme.features.highContrast || theme.id.includes('neon') || theme.id.includes('cyber');
      default:
        return true;
    }
  });

  const handleThemeSelect = (theme: ColorScheme) => {
    setTheme(theme.id);
    onThemeChange?.(theme);
    toast({
      title: "Theme Updated",
      description: `Switched to ${theme.name} theme`,
    });
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      all: Palette,
      dark: Moon,
      light: Sun,
      gaming: Zap
    };
    const IconComponent = iconMap[category as keyof typeof iconMap] || Palette;
    return <IconComponent className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colorMap = {
      all: currentTheme.colors.primary,
      dark: currentTheme.colors.info,
      light: currentTheme.colors.warning,
      gaming: currentTheme.colors.error
    };
    return colorMap[category as keyof typeof colorMap] || currentTheme.colors.primary;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: currentTheme.colors.text }}>
          Choose Your Theme
        </h2>
        <p style={{ color: currentTheme.colors.textSecondary }}>
          Personalize your streaming experience with beautiful color schemes
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex justify-center">
        <div 
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: currentTheme.colors.surface }}
        >
          {(['all', 'dark', 'light', 'gaming'] as const).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-2 capitalize"
              style={{
                backgroundColor: selectedCategory === category ? currentTheme.colors.primary : 'transparent',
                color: selectedCategory === category ? currentTheme.colors.text : currentTheme.colors.textSecondary
              }}
            >
              {getCategoryIcon(category)}
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Theme Info */}
      <Card 
        className="border-l-4"
        style={{ 
          borderLeftColor: currentTheme.colors.primary,
          backgroundColor: currentTheme.colors.surface
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getThemeIcon(currentTheme.id)}
            Current Theme: {currentTheme.name}
          </CardTitle>
          <CardDescription>
            {currentTheme.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 h-6">
              {currentTheme.colors.gradient.map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.text
                }}
              >
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </Badge>
              {currentTheme.features.highContrast && (
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: currentTheme.colors.accent,
                    color: currentTheme.colors.accent
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  High Contrast
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onSelect={handleThemeSelect}
          />
        ))}
      </div>

      {/* Additional Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            // Auto-adapt based on system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const autoTheme = prefersDark ? 'modern-dark' : 'minimal-light';
            setTheme(autoTheme);
            toast({
              title: "Auto Theme Applied",
              description: `Set to ${autoTheme} based on system preference`,
            });
          }}
          className="flex items-center gap-2"
          style={{ borderColor: currentTheme.colors.border }}
        >
          <Monitor className="h-4 w-4" />
          Auto-Adapt
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            // Cycle through themes
            const currentIndex = themes.findIndex(t => t.id === currentTheme.id);
            const nextIndex = (currentIndex + 1) % themes.length;
            setTheme(themes[nextIndex].id);
            toast({
              title: "Next Theme",
              description: `Switched to ${themes[nextIndex].name}`,
            });
          }}
          className="flex items-center gap-2"
          style={{ borderColor: currentTheme.colors.border }}
        >
          <Sparkles className="h-4 w-4" />
          Random Theme
        </Button>
      </div>
    </div>
  );
};

export default ThemeSelector;