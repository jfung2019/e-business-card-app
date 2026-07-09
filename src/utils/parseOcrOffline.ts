import type { CoreFields } from '../types/card';

import { BACK_SECTION_LABEL } from './mergeCardOcrText';

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/;
const WEBSITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(?:\/\S*)?/i;
const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf]/;

const EN_ADDRESS_HINTS = [
  /\broom\b/i,
  /\bfloor\b/i,
  /\bf\/\s*\d/i,
  /\b\d{1,2}\s*\/\s*f\b/i,
  /\bsuite\b/i,
  /\bunit\b/i,
  /\bstreet\b/i,
  /\bst\.?\b/i,
  /\broad\b/i,
  /\brd\.?\b/i,
  /\bavenue\b/i,
  /\bave\.?\b/i,
  /\bdrive\b/i,
  /\blane\b/i,
  /\bbuilding\b/i,
  /\btower\b/i,
  /\bhong kong\b/i,
  /\bwan chai\b/i,
  /\bcauseway\b/i,
  /\bcentral\b/i,
  /\bgloucester\b/i,
  /\bharcourt\b/i,
];

const JOB_TITLE_HINTS =
  /\b(chief|officer|director|manager|head|lead|scientist|engineer|president|founder|partner|consultant|analyst|specialist)\b/i;

const CHINESE_TITLE_HINTS = /(博士|首席|官|總監|总监|經理|经理|工程師|工程师|董事)/;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function uniqueLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line || line === BACK_SECTION_LABEL) {
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

function hasChinese(text: string): boolean {
  return CJK_PATTERN.test(text);
}

function looksLikeEnglishAddress(line: string): boolean {
  if (hasChinese(line)) {
    return false;
  }
  if (EN_ADDRESS_HINTS.some(pattern => pattern.test(line))) {
    return true;
  }
  return /\d{1,5}\s+[A-Za-z]/.test(line) && /,/.test(line);
}

function looksLikePersonName(line: string): boolean {
  if (/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/i.test(line)) {
    return !looksLikeEnglishAddress(line);
  }
  if (looksLikeEnglishAddress(line) || looksLikeCompany(line)) {
    return false;
  }
  if (hasChinese(line) && /博士/.test(line) && !/(香港|道|室|樓|楼|大廈|大厦|號|号)/.test(line)) {
    return true;
  }
  if (looksLikeJobTitle(line)) {
    return false;
  }
  if (!hasChinese(line)) {
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    return wordCount >= 2 && wordCount <= 5;
  }
  return false;
}

function looksLikeChineseAddress(line: string): boolean {
  if (!hasChinese(line)) {
    return false;
  }
  if (/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/i.test(line)) {
    return false;
  }
  if (/博士/.test(line) && !/(香港|道|室|樓|楼|大廈|大厦|號|号)/.test(line)) {
    return false;
  }
  if (/(香港|道|室|樓|楼|大廈|大厦|中心|區|区|街|號|号|告士打)/.test(line)) {
    return true;
  }
  return line.length >= 12;
}

function looksLikeJobTitle(line: string): boolean {
  if (JOB_TITLE_HINTS.test(line)) {
    return true;
  }
  return CHINESE_TITLE_HINTS.test(line);
}

function looksLikeCompany(line: string): boolean {
  return /\b(limited|ltd\.?|inc\.?|corp\.?|company|group|technology|technologies|holdings)\b/i.test(
    line,
  );
}

function joinLines(lines: string[]): string {
  return lines.map(cleanLine).filter(Boolean).join(', ');
}

function splitFrontAndBack(rawOcrText: string): { frontLines: string[]; backLines: string[] } {
  const parts = rawOcrText.split(BACK_SECTION_LABEL);
  const frontLines = uniqueLines(parts[0] ?? '');
  const backLines = uniqueLines(parts.slice(1).join('\n'));
  return { frontLines, backLines };
}

function extractContactLines(lines: string[]): {
  email: string | null;
  phones: string[];
  website: string | null;
  remaining: string[];
} {
  let email: string | null = null;
  const phones: string[] = [];
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
    if (phoneMatch) {
      const phone = cleanLine(phoneMatch[0]);
      if (!phones.includes(phone)) {
        phones.push(phone);
      }
      if (cleanLine(line) === phone) {
        continue;
      }
    }

    remaining.push(line);
  }

  return { email, phones, website, remaining };
}

function pickName(lines: string[]): string {
  for (const line of lines) {
    if (looksLikePersonName(line)) {
      return line;
    }
  }

  for (const line of lines) {
    if (
      EMAIL_PATTERN.test(line) ||
      PHONE_PATTERN.test(line) ||
      WEBSITE_PATTERN.test(line) ||
      looksLikeEnglishAddress(line) ||
      looksLikeChineseAddress(line) ||
      looksLikeJobTitle(line) ||
      looksLikeCompany(line)
    ) {
      continue;
    }
    if (line.length >= 2) {
      return line;
    }
  }
  return 'Unknown contact';
}

function classifyRemainingLines(lines: string[]): {
  name: string;
  company_name: string | null;
  job_title: string | null;
  address_en: string | null;
  address_cn: string | null;
  alternate_name_cn: string | null;
  extras: string[];
} {
  const englishAddressLines: string[] = [];
  const chineseAddressLines: string[] = [];
  const jobTitleLines: string[] = [];
  const companyLines: string[] = [];
  const alternateNameLines: string[] = [];
  const neutralLines: string[] = [];
  let nameLine: string | null = null;

  for (const line of lines) {
    if (!nameLine && looksLikePersonName(line)) {
      nameLine = line;
      continue;
    }

    if (looksLikeChineseAddress(line)) {
      chineseAddressLines.push(line);
      continue;
    }
    if (looksLikeEnglishAddress(line)) {
      englishAddressLines.push(line);
      continue;
    }
    if (looksLikeJobTitle(line)) {
      jobTitleLines.push(line);
      continue;
    }
    if (looksLikeCompany(line)) {
      companyLines.push(line);
      continue;
    }
    if (hasChinese(line) && line.length <= 24) {
      alternateNameLines.push(line);
      continue;
    }
    neutralLines.push(line);
  }

  const name = nameLine ?? pickName(neutralLines.length > 0 ? neutralLines : lines);
  const nonNameNeutral = neutralLines.filter(line => line !== name);
  const company_name = companyLines[0] ?? nonNameNeutral[0] ?? null;
  const job_title =
    jobTitleLines[0] ??
    nonNameNeutral.find(line => line !== company_name && looksLikeJobTitle(line)) ??
    nonNameNeutral.find(line => line !== company_name) ??
    null;

  const usedLines = new Set(
    [name, company_name, job_title, ...englishAddressLines, ...chineseAddressLines].filter(
      Boolean,
    ),
  );
  const extras = lines.filter(line => !usedLines.has(line));

  return {
    name,
    company_name,
    job_title,
    address_en: englishAddressLines.length > 0 ? joinLines(englishAddressLines) : null,
    address_cn: chineseAddressLines.length > 0 ? joinLines(chineseAddressLines) : null,
    alternate_name_cn: alternateNameLines[0] ?? null,
    extras,
  };
}

export function parseOcrOffline(rawOcrText: string): {
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
} {
  const { frontLines, backLines } = splitFrontAndBack(rawOcrText);
  const allLines = [...frontLines, ...backLines];
  const { email, phones, website, remaining } = extractContactLines(allLines);

  const frontRemaining = extractContactLines(frontLines).remaining;
  const backRemaining = extractContactLines(backLines).remaining;
  const classified = classifyRemainingLines([
    ...frontRemaining,
    ...backRemaining.filter(line => !frontRemaining.includes(line)),
  ]);

  const custom_fields: Record<string, string> = {};
  if (classified.address_en) {
    custom_fields.address_en = classified.address_en;
  }
  if (classified.address_cn) {
    custom_fields.address_cn = classified.address_cn;
  }
  if (classified.alternate_name_ch) {
    custom_fields.alternate_name_cn = classified.alternate_name_ch;
  }
  if (phones.length > 1) {
    custom_fields.phone_2 = phones[1];
  }
  if (phones.length > 2) {
    custom_fields.phone_3 = phones[2];
  }

  classified.extras.forEach((line, index) => {
    if (
      looksLikeEnglishAddress(line) ||
      looksLikeChineseAddress(line) ||
      line === classified.name ||
      line === classified.company_name ||
      line === classified.job_title
    ) {
      return;
    }
    custom_fields[`line_${index + 1}`] = line;
  });

  return {
    core_fields: {
      name: classified.name,
      company_name: classified.company_name,
      job_title: classified.job_title,
      email,
      phone: phones[0] ?? null,
      website,
    },
    custom_fields,
  };
}
