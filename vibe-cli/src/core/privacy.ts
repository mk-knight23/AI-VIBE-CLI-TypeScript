/**
 * Privacy Manager - Privacy-first data handling
 */

import * as fs from 'fs';
import * as path from 'path';

const PRIVACY_CONFIG_PATH = path.join(process.env.HOME || '.', '.vibe', 'privacy.json');

export interface PrivacySettings {
  // Data storage
  storeConversations: boolean;
  storeContext: boolean;
  
  // Telemetry
  sendAnonymousUsage: boolean;
  sendCrashReports: boolean;
  
  // Sharing
  allowShareLinks: boolean;
  shareExpiryDays: number;
  
  // Code handling
  sendCodeToCloud: boolean;
  localOnlyMode: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  storeConversations: false,  // Privacy-first: off by default
  storeContext: false,
  sendAnonymousUsage: false,
  sendCrashReports: false,
  allowShareLinks: false,
  shareExpiryDays: 7,
  sendCodeToCloud: true,      // Required for cloud models
  localOnlyMode: false
};

class PrivacyManager {
  private settings: PrivacySettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): PrivacySettings {
    try {
      if (fs.existsSync(PRIVACY_CONFIG_PATH)) {
        const data = JSON.parse(fs.readFileSync(PRIVACY_CONFIG_PATH, 'utf8'));
        return { ...DEFAULT_SETTINGS, ...data };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      const dir = path.dirname(PRIVACY_CONFIG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(PRIVACY_CONFIG_PATH, JSON.stringify(this.settings, null, 2));
    } catch {}
  }

  get(): PrivacySettings {
    return { ...this.settings };
  }

  set(key: keyof PrivacySettings, value: boolean | number): void {
    (this.settings as any)[key] = value;
    this.save();
  }

  setAll(settings: Partial<PrivacySettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.save();
  }

  // Enable local-only mode (no cloud, no telemetry)
  enableLocalOnly(): void {
    this.settings = {
      ...this.settings,
      sendCodeToCloud: false,
      localOnlyMode: true,
      sendAnonymousUsage: false,
      sendCrashReports: false,
      allowShareLinks: false
    };
    this.save();
  }

  // Check if operation is allowed
  canStoreData(): boolean {
    return this.settings.storeConversations;
  }

  canSendToCloud(): boolean {
    return this.settings.sendCodeToCloud && !this.settings.localOnlyMode;
  }

  canShare(): boolean {
    return this.settings.allowShareLinks && !this.settings.localOnlyMode;
  }

  isLocalOnly(): boolean {
    return this.settings.localOnlyMode;
  }

  // Get privacy summary for display
  getSummary(): string {
    const s = this.settings;
    const lines = [
      `📦 Data Storage: ${s.storeConversations ? 'ON' : 'OFF'}`,
      `📡 Cloud Models: ${s.sendCodeToCloud ? 'ON' : 'OFF'}`,
      `🔗 Share Links: ${s.allowShareLinks ? 'ON' : 'OFF'}`,
      `📊 Telemetry: ${s.sendAnonymousUsage ? 'ON' : 'OFF'}`,
      `🏠 Local-Only: ${s.localOnlyMode ? 'ON' : 'OFF'}`
    ];
    return lines.join('\n');
  }
}

export const privacyManager = new PrivacyManager();
