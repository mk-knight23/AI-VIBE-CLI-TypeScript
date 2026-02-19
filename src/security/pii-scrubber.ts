export interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface ScrubberConfig {
  redactEmails: boolean;
  redactPhoneNumbers: boolean;
  replacement: string;
  customPatterns: RedactionPattern[];
}

const defaultConfig: ScrubberConfig = {
  redactEmails: true,
  redactPhoneNumbers: true,
  replacement: '',
  customPatterns: [],
};

export class PIIScrubber {
  private patterns: RedactionPattern[];
  private config: ScrubberConfig;

  constructor(config?: Partial<ScrubberConfig>) {
    this.config = { ...defaultConfig, ...config };
    this.patterns = [];
    if (this.config.customPatterns.length > 0) {
      this.patterns.push(...this.config.customPatterns);
    }
    this.patterns.push(...this.buildDefaultPatterns());
  }

  private buildDefaultPatterns(): RedactionPattern[] {
    const patterns: RedactionPattern[] = [];

    if (this.config.redactEmails) {
      patterns.push({
        name: 'Email',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: '[EMAIL]',
      });
    }

    if (this.config.redactPhoneNumbers) {
      patterns.push({
        name: 'PhoneNumber',
        pattern: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
        replacement: '[PHONE]',
      });
    }

    patterns.push(
      { name: 'CreditCard', pattern: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[CREDIT_CARD]' },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
      { name: 'IPAddress', pattern: /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g, replacement: '[IP]' },
      { name: 'IPv6', pattern: /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g, replacement: '[IPv6]' },
      { name: 'APIKey', pattern: /\b[A-Za-z0-9]{30,}\b/g, replacement: '[API_KEY]' },
    );

    return patterns;
  }

  scrub(text: string): { scrubbed: string; original: string; hadRedactions: boolean; redactions: Array<{ pattern: string; original: string }> } {
    let scrubbed = text;
    const redactions: Array<{ pattern: string; original: string }> = [];

    for (const pat of this.patterns) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      const matches = [...scrubbed.matchAll(regex)];
      const replacement = this.config.replacement || pat.replacement;

      for (const match of matches) {
        redactions.push({ pattern: pat.name, original: match[0] });
      }

      if (matches.length > 0) {
        scrubbed = scrubbed.replace(new RegExp(pat.pattern.source, pat.pattern.flags), replacement);
      }
    }

    return { scrubbed, original: text, hadRedactions: redactions.length > 0, redactions };
  }

  scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.scrub(value).scrubbed;
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (typeof item === 'string') {
            return this.scrub(item).scrubbed;
          } else if (typeof item === 'object' && item !== null) {
            return this.scrubObject(item as Record<string, unknown>);
          }
          return item;
        });
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.scrubObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  containsPII(text: string): { contains: boolean; types: string[] } {
    const types: string[] = [];
    for (const pat of this.patterns) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      if (regex.test(text)) {
        types.push(pat.name);
      }
    }
    return { contains: types.length > 0, types };
  }

  getStatistics(text: string): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const pat of this.patterns) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      const matches = [...text.matchAll(regex)];
      if (matches.length > 0) {
        stats[pat.name] = matches.length;
      }
    }
    return stats;
  }

  addPattern(pattern: RedactionPattern): void {
    this.patterns.push(pattern);
  }

  removePattern(name: string): boolean {
    const index = this.patterns.findIndex((p) => p.name === name);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  getPatterns(): RedactionPattern[] {
    return [...this.patterns];
  }
}

export const piiScrubber = new PIIScrubber();
