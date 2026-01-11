export class PIIScrubber {
  private static readonly PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    ipv4: /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
  };

  static scrub(text: string): string {
    let scrubbed = text;

    for (const [name, pattern] of Object.entries(this.PATTERNS)) {
      scrubbed = scrubbed.replace(pattern, `[REDACTED ${name.toUpperCase()}]`);
    }

    return scrubbed;
  }
}
