/**
 * Unit tests for PII Scrubber
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PIIScrubber, piiScrubber, ScrubberConfig, RedactionPattern } from '../../../src/security/pii-scrubber';

describe('PIIScrubber', () => {
  let scrubber: PIIScrubber;

  beforeEach(() => {
    scrubber = new PIIScrubber();
  });

  describe('scrub', () => {
    it('should scrub email addresses', () => {
      const text = 'Contact me at test@example.com for more info';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[EMAIL]');
      expect(result.hadRedactions).toBe(true);
      expect(result.redactions.length).toBe(1);
      expect(result.redactions[0].pattern).toBe('Email');
      expect(result.redactions[0].original).toBe('test@example.com');
    });

    it('should scrub phone numbers', () => {
      const text = 'Call me at (555) 123-4567 or 555-987-6543';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[PHONE]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should scrub credit card numbers', () => {
      const text = 'My card is 4111111111111111';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[CREDIT_CARD]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should scrub SSN', () => {
      const text = 'SSN: 123-45-6789';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[SSN]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should scrub IP addresses', () => {
      const text = 'Server at 192.168.1.100';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[IP]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should scrub IPv6 addresses', () => {
      const text = 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[IPv6]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should scrub multiple PII types', () => {
      const text = 'Email: john@test.com, Phone: 555-123-4567, SSN: 123-45-6789';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[EMAIL]');
      expect(result.scrubbed).toContain('[PHONE]');
      expect(result.scrubbed).toContain('[SSN]');
      expect(result.redactions.length).toBe(3);
    });

    it('should not modify text without PII', () => {
      const text = 'This is normal text without any sensitive information';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toBe(text);
      expect(result.hadRedactions).toBe(false);
      expect(result.redactions).toEqual([]);
    });

    it('should scrub high-entropy strings (API keys)', () => {
      const text = 'API key: abcdefghijklmnopqrstuvwxyz1234567890ABC';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[API_KEY]');
      expect(result.hadRedactions).toBe(true);
    });

    it('should return original text in result', () => {
      const text = 'test@example.com';
      const result = scrubber.scrub(text);

      expect(result.original).toBe(text);
    });

    it('should handle overlapping patterns correctly', () => {
      // Long string that could match multiple patterns
      const text = '192.168.1.100 and test@example.com';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).not.toBe(text);
      expect(result.redactions.length).toBe(2);
    });
  });

  describe('scrubObject', () => {
    it('should scrub strings in objects', () => {
      const obj = {
        email: 'user@example.com',
        name: 'John',
        phone: '555-123-4567'
      };

      const result = scrubber.scrubObject(obj);

      expect(result.email).toContain('[EMAIL]');
      expect(result.name).toBe('John');
      expect(result.phone).toContain('[PHONE]');
    });

    it('should scrub nested objects', () => {
      const obj = {
        user: {
          email: 'nested@example.com',
          contact: {
            phone: '555-987-6543'
          }
        }
      };

      const result = scrubber.scrubObject(obj);

      expect((result.user as Record<string, unknown>).email).toContain('[EMAIL]');
      expect(((result.user as Record<string, unknown>).contact as Record<string, unknown>).phone).toContain('[PHONE]');
    });

    it('should scrub arrays', () => {
      const obj = {
        emails: ['one@test.com', 'two@test.com']
      };

      const result = scrubber.scrubObject(obj);

      expect((result.emails as string[])[0]).toContain('[EMAIL]');
      expect((result.emails as string[])[1]).toContain('[EMAIL]');
    });

    it('should preserve non-string values', () => {
      const obj = {
        name: 'John',
        age: 30,
        active: true,
        scores: [1, 2, 3]
      };

      const result = scrubber.scrubObject(obj);

      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.scores).toEqual([1, 2, 3]);
    });

    it('should handle empty objects', () => {
      const obj = {};
      const result = scrubber.scrubObject(obj);
      expect(result).toEqual({});
    });

    it('should handle null values', () => {
      const obj = { value: null };
      const result = scrubber.scrubObject(obj);
      expect(result.value).toBeNull();
    });
  });

  describe('containsPII', () => {
    it('should detect email PII', () => {
      const result = scrubber.containsPII('Contact: test@example.com');

      expect(result.contains).toBe(true);
      expect(result.types).toContain('Email');
    });

    it('should return empty types when no PII', () => {
      const result = scrubber.containsPII('Normal text here');

      expect(result.contains).toBe(false);
      expect(result.types).toEqual([]);
    });

    it('should detect multiple PII types', () => {
      const result = scrubber.containsPII('Email: test@test.com, IP: 192.168.1.1');

      expect(result.contains).toBe(true);
      expect(result.types.length).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should count PII occurrences', () => {
      const text = 'Emails: a@test.com, b@test.com, c@test.com';
      const stats = scrubber.getStatistics(text);

      expect(stats.Email).toBe(3);
    });

    it('should return empty object for text without PII', () => {
      const text = 'No PII here';
      const stats = scrubber.getStatistics(text);

      expect(Object.keys(stats)).toEqual([]);
    });

    it('should show stats for multiple PII types', () => {
      const text = 'Email: test@test.com, Phone: 555-123-4567, IP: 192.168.1.1';
      const stats = scrubber.getStatistics(text);

      expect(stats.Email).toBe(1);
      expect(stats.PhoneNumber).toBe(1);
      expect(stats.IPAddress).toBe(1);
    });
  });

  describe('addPattern', () => {
    it('should add custom pattern', () => {
      const customPattern = {
        name: 'CustomID',
        pattern: /\bUSER-\d{4}\b/g,
        replacement: '[USER_ID]'
      };

      scrubber.addPattern(customPattern);

      const text = 'USER-1234 is the user ID';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toContain('[USER_ID]');
      expect(result.hadRedactions).toBe(true);
    });
  });

  describe('removePattern', () => {
    it('should remove pattern by name', () => {
      const removed = scrubber.removePattern('Email');

      expect(removed).toBe(true);

      // Email should no longer be scrubbed
      const text = 'test@example.com';
      const result = scrubber.scrub(text);

      expect(result.scrubbed).toBe(text);
    });

    it('should return false for non-existent pattern', () => {
      const removed = scrubber.removePattern('NonExistent');
      expect(removed).toBe(false);
    });
  });

  describe('getPatterns', () => {
    it('should return all active patterns', () => {
      const patterns = scrubber.getPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].name).toBeDefined();
      expect(patterns[0].pattern).toBeDefined();
    });

    it('should return a copy of patterns array', () => {
      const patterns1 = scrubber.getPatterns();
      const patterns2 = scrubber.getPatterns();

      expect(patterns1).not.toBe(patterns2);
      expect(patterns1).toEqual(patterns2);
    });
  });

  describe('custom configuration', () => {
    it('should use custom replacement text', () => {
      const config: Partial<ScrubberConfig> = {
        redactEmails: true,
        replacement: '[HIDDEN]'
      };

      const customScrubber = new PIIScrubber(config);
      const text = 'Email: test@example.com';
      const result = customScrubber.scrub(text);

      expect(result.scrubbed).toContain('[HIDDEN]');
    });

    it('should disable specific PII types', () => {
      const config: Partial<ScrubberConfig> = {
        redactEmails: false,
        redactPhoneNumbers: false
      };

      const customScrubber = new PIIScrubber(config);
      const text = 'Email: test@test.com, Phone: 555-123-4567';
      const result = customScrubber.scrub(text);

      expect(result.scrubbed).toBe(text);
      expect(result.hadRedactions).toBe(false);
    });

    it('should add custom patterns via config', () => {
      const customPatterns: RedactionPattern[] = [
        {
          name: 'UUID',
          pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
          replacement: '[UUID]'
        }
      ];

      const config: Partial<ScrubberConfig> = {
        customPatterns
      };

      const customScrubber = new PIIScrubber(config);
      const text = 'ID: 550e8400-e29b-41d4-a716-446655440000';
      const result = customScrubber.scrub(text);

      expect(result.scrubbed).toContain('[UUID]');
    });
  });
});

describe('piiScrubber singleton', () => {
  it('should export a PIIScrubber instance', () => {
    expect(piiScrubber).toBeInstanceOf(PIIScrubber);
  });
});
