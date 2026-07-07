import type { CoreFields } from '../types/card';

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/;
const WEBSITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(?:\/\S*)?/i;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function uniqueLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) {
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(line);
  }
  return lines;
}

function pickName(lines: string[]): string {
  for (const line of lines) {
    if (EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line) || WEBSITE_PATTERN.test(line)) {
      continue;
    }
    if (line.length >= 2) {
      return line;
    }
  }
  return 'Unknown contact';
}

export function parseOcrOffline(rawOcrText: string): {
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
} {
  const lines = uniqueLines(rawOcrText);
  const custom_fields: Record<string, string> = {};
  let email: string | null = null;
  let phone: string | null = null;
  let website: string | null = null;
  const remaining: string[] = [];

  for (const line of lines) {
    const emailMatch = line.match(EMAIL_PATTERN);
    if (!email && emailMatch) {
      email = emailMatch[0];
      continue;
    }

    const websiteMatch = line.match(WEBSITE_PATTERN);
    if (!website && websiteMatch && !EMAIL_PATTERN.test(line)) {
      website = websiteMatch[0];
      continue;
    }

    const phoneMatch = line.match(PHONE_PATTERN);
    if (!phone && phoneMatch) {
      phone = cleanLine(phoneMatch[0]);
      continue;
    }

    remaining.push(line);
  }

  const name = pickName(remaining.length > 0 ? remaining : lines);
  const otherLines = remaining.filter(line => line !== name);
  const company_name = otherLines[0] ?? null;
  const job_title = otherLines[1] ?? null;
  for (let index = 2; index < otherLines.length; index += 1) {
    custom_fields[`line_${index - 1}`] = otherLines[index];
  }

  return {
    core_fields: {
      name,
      company_name,
      job_title,
      email,
      phone,
      website,
    },
    custom_fields,
  };
}
