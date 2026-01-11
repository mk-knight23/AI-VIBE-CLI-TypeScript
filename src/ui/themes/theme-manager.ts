import { VibeTheme, themes } from './themes';

export class ThemeManager {
  private currentTheme: VibeTheme = themes.vibe;

  constructor(themeName: string = 'vibe') {
    this.setTheme(themeName);
  }

  setTheme(name: string): boolean {
    if (themes[name]) {
      this.currentTheme = themes[name];
      return true;
    }
    return false;
  }

  getCurrentTheme(): VibeTheme {
    return this.currentTheme;
  }

  listThemes(): string[] {
    return Object.keys(themes);
  }
}

export const themeManager = new ThemeManager();
