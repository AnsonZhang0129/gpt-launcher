import FONT from './font-data.json' with { type: 'json' };

export const MAX_NAME_LENGTH = 24;

export function validateName(value) {
  if (typeof value !== 'string') return { ok: false, error: '请输入显示名称。' };
  const name = value.replace(/ +/g, ' ').trim();
  if (!name) return { ok: false, error: '请输入显示名称。' };
  if (!/^[A-Za-z ]+$/.test(name)) return { ok: false, error: '目前支持英文字母和空格，暂不支持中文、数字和符号。' };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: '名称最多 24 个字符，包含空格。' };
  return { ok: true, name };
}

export function layoutName(value) {
  const result = validateName(value);
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
