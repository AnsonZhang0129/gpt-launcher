import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutName, validateName } from '../src/name-layout.js';

test('manual names preserve case and normalize spaces', () => {
  assert.equal(validateName('  Mary   Jane  ').name, 'Mary Jane');
  assert.equal(layoutName('Anson Zhang').text, 'Welcome Anson Zhang');
});
test('unsupported names do not silently produce missing strokes', () => {
  for (const value of ['', '   ', '张三', 'Zoë', 'A1', "O'Neil", '<script>', 'A\nB', 'a'.repeat(25), null]) {
    assert.equal(validateName(value).ok, false, String(value));
    assert.throws(() => layoutName(value));
  }
});
test('all permitted letters have paths and strictly increasing positions', () => {
  for (const name of ['A', 'abcdefghijklmnopqrstuvwxyz'.slice(0,24), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0,24), 'yz', 'YZ', 'Mary Jane', 'William Montgomery', 'Anson Zhang', 'Ivy', 'Bob']) {
    const layout = layoutName(name);
    assert.ok(Number.isFinite(layout.total) && layout.total > 0);
    assert.equal(layout.glyphs.length, layout.text.replace(/ /g, '').length);
    layout.glyphs.forEach((g, i) => {
      assert.match(g.d, /^M /);
      if (i) assert.ok(g.x > layout.glyphs[i-1].x);
    });
  }
});
