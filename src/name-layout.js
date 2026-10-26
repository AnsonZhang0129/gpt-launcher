import FONT from './font-data.json' with { type: 'json' };

import { translate } from './i18n.js';

export const MAX_NAME_LENGTH = 24;

export function validateName(value, language = 'en') {
  if (typeof value !== 'string') return { ok: false, error: translate(language, 'nameRequired') };
  const name = value.replace(/ +/g, ' ').trim();
  if (!name) return { ok: false, error: translate(language, 'nameRequired') };
  if (!/^[A-Za-z ]+$/.test(name)) return { ok: false, error: translate(language, 'nameUnsupported') };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: translate(language, 'nameTooLong') };
  return { ok: true, name };
}

export function layoutName(value, language = 'en') {
  const result = validateName(value, language);
  if (!result.ok) throw new Error(result.error);
  const text = `Welcome ${result.name}`;
  let total = 0;
  const glyphs = [];
  let word = 0;
  for (const char of text) {
    const glyph = FONT[char];
    if (!glyph) throw new Error(`Unsupported character: ${char}`);
    if (glyph.d) glyphs.push({ char, d: glyph.d, x: total, word });
    else word++;
    total += glyph.advance;
  }
  return { name: result.name, text, total, glyphs };
}
