import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Search, 
  Grid, 
  List, 
  Download, 
  Share2, 
  Star, 
  Eye, 
  Moon, 
  Sun, 
  Zap, 
  Monitor, 
  Smartphone,
  Shuffle,
  Filter,
  Heart,
  Bookmark,
  Copy
} from "lucide-react";
import { useTheme, colorSchemes, ColorScheme } from './ThemeProvider';
import { toast } from "@/hooks/use-toast";

// Theme preview component
const ThemePreview: React.FC<{
  theme: ColorScheme;
  isActive: boolean;
  onSelect: (theme: ColorScheme) => void;
  viewMode: 'grid' | 'list';
  showDetails: boolean;
}> = ({ theme, isActive, onSelect, viewMode, showDetails }) => {
  const { currentTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getThemeIcon = (themeId: string) => {
    const iconMap = {
      'modern-dark': Monitor,
      'purple-dream': Star,
      'ocean-breeze': Sun,
      'sunset-glow': Heart,
      'forest-fresh': Bookmark,
      'minimal-light': Shuffle,
      'neon-glow': Zap,
      'cyber-punk': Zap
    };
    const IconComponent = iconMap[themeId as keyof typeof iconMap] || Palette;
    return IconComponent;
  };

  const getFeatureIcons = () => {
    const icons = [];
    if (theme.features.darkMode) icons.push({ icon: Moon, label: 'Dark Mode' });
    if (theme.features.highContrast) icons.push({ icon: Eye, label: 'High Contrast' });
    if (theme.features.autoAdapt) icons.push({ icon: Sun, label: 'Auto Adapt' });
    return icons;
  };

  const getUsageRecommendation = () => {
    const recommendations = {
      'modern-dark': 'Best for long streaming sessions',
      'purple-dream': 'Perfect for creative content',
      'ocean-breeze': 'Ideal for gaming streams',
      'sunset-glow': 'Great for warm, cozy atmosphere',
      'forest-fresh': 'Perfect for educational content',
      'minimal-light': 'Excellent for professional streams',
      'neon-glow': 'Best for tech/cyber content',
      'cyber-punk': 'Perfect for futuristic gaming'
    };
    return recommendations[theme.id as keyof typeof recommendations] || 'Versatile theme for any content';
  };

  const previewComponent = (
    <div 
      className={`relative group cursor-pointer transition-all duration-300 ${
        viewMode === 'grid' ? 'hover:scale-105' : 'hover:shadow-lg'
      } ${isActive ? 'ring-2 ring-primary shadow-lg' : ''}`}
      onClick={() => onSelect(theme)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text,
        borderWidth: '1px',
        borderRadius: '8px',
        padding: viewMode === 'grid' ? '16px' : '12px',
        marginBottom: '8px'
      }}
    >
      {viewMode === 'grid' ? (
        // Grid view
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {React.createElement(getThemeIcon(theme.id), {
                className: "h-4 w-4",
                style: { color: theme.colors.primary }
              })}
              <span className="font-medium text-sm">{theme.name}</span>
              {isActive && (
                <Badge 
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.text
                  }}
                >
                  Active
                </Badge>
              )}
            </div>
            
            {/* Feature badges */}
            <div className="flex gap-1">
              {getFeatureIcons().map(({ icon: Icon, label }, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5"
                  style={{ 
                    borderColor: theme.colors.accent,
                    color: theme.colors.accent
                  }}
                  title={label}
                >
                  <Icon className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Color Palette Preview */}
          <div className="grid grid-cols-4 gap-1 h-16 rounded overflow-hidden">
            {theme.colors.gradient.map((color, index) => (
              <div
                key={index}
                className="h-full flex items-center justify-center text-xs font-medium"
                style={{ 
                  backgroundColor: color,
                  color: index < 2 ? '#FFFFFF' : '#000000'
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>

          {/* Theme Preview UI */}
          <div className="space-y-2" style={{ 
            backgroundColor: theme.colors.background,
            padding: '8px',
            borderRadius: '4px'
          }}>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div 
                className="flex-1 h-2 rounded"
                style={{ backgroundColor: theme.colors.secondary }}
              />
              <Badge 
                className="text-xs"
                style={{ 
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.text
                }}
              >
                Live
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: theme.colors.success }}
              />
              <div className="flex-1" style={{ color: theme.colors.textSecondary, fontSize: '10px' }}>
                Screen sharing active
              </div>
            </div>
          </div>

          {/* Description */}
          <p 
            className="text-xs leading-relaxed"
            style={{ color: theme.colors.textSecondary }}
          >
            {theme.description}
          </p>
        </div>
      ) : (
        // List view
        <div className="flex items-center gap-4">
          <div className="flex gap-1 h-8 w-20">
            {theme.colors.gradient.map((color, index) => (
              <div
                key={index}
                className="flex-1 h-full rounded"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {React.createElement(getThemeIcon(theme.id), {
                className: "h-4 w-4 flex-shrink-0",
                style: { color: theme.colors.primary }
              })}
              <span className="font-medium text-sm truncate">{theme.name}</span>
              {isActive && (
                <Badge 
                  className="text-xs px-1.5 py-0.5"
                  style={{ 
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.text
                  }}
                >
                  Active
                </Badge>
              )}
            </div>
            <p 
              className="text-xs mt-1"
              style={{ color: theme.colors.textSecondary }}
            >
              {getUsageRecommendation()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {getFeatureIcons().slice(0, 2).map(({ icon: Icon, label }, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="text-xs px-1.5 py-0.5"
                style={{ 
                  borderColor: theme.colors.accent,
                  color: theme.colors.accent
                }}
                title={label}
              >
                <Icon className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Hover overlay */}
      {isHovered && (
        <div 
          className="absolute inset-0 rounded flex items-center justify-center"
          style={{ 
            backgroundColor: theme.colors.background + 'E6',
            backdropFilter: 'blur(2px)'
          }}
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(theme);
            }}
            className="text-xs"
            style={{ 
              backgroundColor: theme.colors.primary,
              color: theme.colors.text
            }}
          >
            {isActive ? 'Current' : 'Preview'}
          </Button>
        </div>
      )}
    </div>
  );

  if (showDetails) {
    return (
      <Card 
        className="transition-all duration-300 hover:shadow-lg"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <CardContent className="p-4">
          {previewComponent}
          
          {/* Additional details */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Best for: </span>
                <span style={{ color: theme.colors.text }}>{getUsageRecommendation()}</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Performance: </span>
                <span style={{ color: theme.colors.text }}>
                  {theme.features.highContrast ? 'High Impact' : 'Optimized'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return previewComponent;
};

// Main color scheme showcase
const ColorSchemeShowcase: React.FC = () => {
  const { currentTheme, setTheme, themes } = useTheme();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'popular' | 'recent'>('popular');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter and sort themes
  const filteredAndSortedThemes = useMemo(() => {
    let filtered = themes.filter(theme => {
      // Search filter
      const matchesSearch = !searchQuery || 
        theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        (selectedCategory === 'dark' && theme.features.darkMode) ||
        (selectedCategory === 'light' && !theme.features.darkMode) ||
        (selectedCategory === 'gaming' && (theme.features.highContrast || theme.id.includes('neon') || theme.id.includes('cyber')));
      
      // Favorites filter
      const matchesFavorites = !showFavoritesOnly || favorites.has(theme.id);
      
      return matchesSearch && matchesCategory && matchesFavorites;
    });

    // Sort themes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          // Mock popularity (in real app, this would come from analytics)
          const popularity = { 'modern-dark': 10, 'minimal-light': 8, 'neon-glow': 9, 'ocean-breeze': 7 };
          return (popularity[b.id as keyof typeof popularity] || 5) - (popularity[a.id as keyof typeof popularity] || 5);
        case 'recent':
          return new Date(b.id).getTime() - new Date(a.id).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [themes, searchQuery, selectedCategory, sortBy, showFavoritesOnly, favorites]);

  const categories = [
    { id: 'all', name: 'All Themes', count: themes.length },
    { id: 'dark', name: 'Dark Mode', count: themes.filter(t => t.features.darkMode).length },
    { id: 'light', name: 'Light Mode', count: themes.filter(t => !t.features.darkMode).length },
    { id: 'gaming', name: 'Gaming', count: themes.filter(t => t.features.highContrast || t.id.includes('neon') || t.id.includes('cyber')).length }
  ];

  const toggleFavorite = (themeId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(themeId)) {
      newFavorites.delete(themeId);
      toast({ title: "Removed from favorites" });
    } else {
      newFavorites.add(themeId);
      toast({ title: "Added to favorites" });
    }
    setFavorites(newFavorites);
  };

  const exportTheme = (theme: ColorScheme) => {
    const themeData = {
      name: theme.name,
      description: theme.description,
      colors: theme.colors,
      features: theme.features
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.id}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Theme exported", description: `${theme.name} theme saved to downloads` });
  };

  const shareTheme = async (theme: ColorScheme) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${theme.name} Theme`,
          text: theme.description,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Theme link copied to clipboard" });
    }
  };

  return (
    <div className="space-y-6" style={{ 
      backgroundColor: currentTheme.colors.background,
      color: currentTheme.colors.text,
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Palette 
            className="h-8 w-8"
            style={{ color: currentTheme.colors.primary }}
          />
          <h1 className="text-4xl font-bold" style={{ color: currentTheme.colors.text }}>
            Theme Showcase
          </h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: currentTheme.colors.textSecondary }}>
          Explore our collection of beautiful themes designed for every streaming style
        </p>
      </div>

      {/* Controls */}
      <Card style={{ backgroundColor: currentTheme.colors.surface }}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: currentTheme.colors.textSecondary }} />
                  <Input
                    placeholder="Search themes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    style={{
                      backgroundColor: currentTheme.colors.background,
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.text
                    }}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
                <TabsList style={{ backgroundColor: currentTheme.colors.background }}>
                  {categories.map(category => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="flex items-center gap-2"
                    >
                      {category.name}
                      <Badge variant="outline" className="text-xs">
                        {category.count}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  style={{ 
                    backgroundColor: viewMode === 'grid' ? currentTheme.colors.primary : 'transparent',
                    borderColor: currentTheme.colors.border 
                  }}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  style={{ 
                    backgroundColor: viewMode === 'list' ? currentTheme.colors.primary : 'transparent',
                    borderColor: currentTheme.colors.border 
                  }}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" style={{ color: currentTheme.colors.textSecondary }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'popular' | 'recent')}
                  style={{
                    backgroundColor: currentTheme.colors.background,
                    borderColor: currentTheme.colors.border,
                    color: currentTheme.colors.text,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  <option value="popular">Most Popular</option>
                  <option value="name">Name A-Z</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>

              {/* Favorites Filter */}
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="flex items-center gap-2"
                style={{ 
                  backgroundColor: showFavoritesOnly ? currentTheme.colors.accent : 'transparent',
                  borderColor: currentTheme.colors.border 
                }}
              >
                <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites Only
              </Button>

              {/* Stats */}
              <div className="ml-auto text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                {filteredAndSortedThemes.length} of {themes.length} themes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Info */}
      <Card 
        className="border-l-4"
        style={{ 
          borderLeftColor: currentTheme.colors.primary,
          backgroundColor: currentTheme.colors.surface
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Monitor className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
              Current Theme: {currentTheme.name}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportTheme(currentTheme)}
                className="flex items-center gap-2"
                style={{ borderColor: currentTheme.colors.border }}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareTheme(currentTheme)}
                className="flex items-center gap-2"
                style={{ borderColor: currentTheme.colors.border }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFavorite(currentTheme.id)}
                className="flex items-center gap-2"
                style={{ borderColor: currentTheme.colors.border }}
              >
                <Heart className={`h-4 w-4 ${favorites.has(currentTheme.id) ? 'fill-current text-red-500' : ''}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {currentTheme.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Color Palette */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
                Color Palette
              </h4>
              <div className="flex gap-2 h-12">
                {currentTheme.colors.gradient.map((color, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-md flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: color }}
                    title={`Color ${index + 1}: ${color}`}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(currentTheme.colors).slice(0, 8).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: value, borderColor: currentTheme.colors.border }}
                    />
                    <span style={{ color: currentTheme.colors.textSecondary }}>
                      {key}: {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
                Features
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentTheme.features).map(([feature, enabled]) => (
                  <Badge 
                    key={feature}
                    variant={enabled ? "default" : "outline"}
                    className="text-xs"
                    style={{ 
                      backgroundColor: enabled ? currentTheme.colors.success : 'transparent',
                      borderColor: enabled ? currentTheme.colors.success : currentTheme.colors.border,
                      color: enabled ? currentTheme.colors.text : currentTheme.colors.textSecondary
                    }}
                  >
                    {feature}: {enabled ? 'Yes' : 'No'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Grid/List */}
      <div className="space-y-4">
        {filteredAndSortedThemes.length === 0 ? (
          <Card style={{ backgroundColor: currentTheme.colors.surface }}>
            <CardContent className="p-12 text-center">
              <Palette className="h-16 w-16 mx-auto mb-4" style={{ color: currentTheme.colors.textSecondary }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.colors.text }}>
                No themes found
              </h3>
              <p style={{ color: currentTheme.colors.textSecondary }}>
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
            {filteredAndSortedThemes.map((theme) => (
              <div key={theme.id} className="relative">
                <ThemePreview
                  theme={theme}
                  isActive={currentTheme.id === theme.id}
                  onSelect={setTheme}
                  viewMode={viewMode}
                  showDetails={false}
                />
                
                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(theme.id);
                    }}
                    className="h-6 w-6 p-0"
                    style={{ 
                      backgroundColor: currentTheme.colors.surface,
                      borderColor: currentTheme.colors.border
                    }}
                  >
                    <Heart className={`h-3 w-3 ${favorites.has(theme.id) ? 'fill-current text-red-500' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTheme(theme);
                    }}
                    className="h-6 w-6 p-0"
                    style={{ 
                      backgroundColor: currentTheme.colors.surface,
                      borderColor: currentTheme.colors.border
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card style={{ backgroundColor: currentTheme.colors.surface }}>
        <CardContent className="p-4">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const randomTheme = themes[Math.floor(Math.random() * themes.length)];
                setTheme(randomTheme.id);
                toast({
                  title: "Random Theme",
                  description: `Switched to ${randomTheme.name}`
                });
              }}
              className="flex items-center gap-2"
              style={{ borderColor: currentTheme.colors.border }}
            >
              <Shuffle className="h-4 w-4" />
              Random Theme
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Auto-select based on time of day
                const hour = new Date().getHours();
                const autoTheme = hour < 6 || hour > 20 ? 'modern-dark' : 'minimal-light';
                setTheme(autoTheme);
                toast({
                  title: "Auto Theme",
                  description: `Theme adjusted for current time`
                });
              }}
              className="flex items-center gap-2"
              style={{ borderColor: currentTheme.colors.border }}
            >
              <Sun className="h-4 w-4" />
              Auto-Adapt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorSchemeShowcase;