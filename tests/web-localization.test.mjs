import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { build } from 'esbuild';
import { resolveLanguage, messages, translate, localizeDocument } from '../src/i18n.js';
import { validateName, layoutName } from '../src/name-layout.js';

test('language selection honors explicit choice, supported system languages, and English fallback', () => {
  assert.equal(resolveLanguage('en', ['zh-CN']), 'en');
  assert.equal(resolveLanguage('zh', ['en-US']), 'zh');
  assert.equal(resolveLanguage(null, ['fr-FR', 'zh-Hans-CN', 'en-US']), 'zh');
  assert.equal(resolveLanguage('system', ['en_GB', 'zh-CN']), 'en');
  assert.equal(resolveLanguage(null, ['de-DE']), 'en');
});

test('both catalogs cover every UI key and English has no untranslated Chinese', async () => {
  assert.deepEqual(Object.keys(messages.zh).sort(), Object.keys(messages.en).sort());
  for (const [key, value] of Object.entries(messages.en)) {
    assert.doesNotMatch(value, /\p{Script=Han}/u, key);
    assert.ok(messages.zh[key].length > 0, key);
  }
  for (const filename of ['animation.html', 'review.html']) {
    const html = await readFile(new URL('../src/' + filename, import.meta.url), 'utf8');
    for (const match of html.matchAll(/data-i18n(?:-label|-title)?="([^"]+)"/g)) {
      assert.equal(typeof messages.en[match[1]], 'string', match[1]);
    }
  }
  assert.equal(translate('en', 'welcome', { name: 'Alex' }), 'Welcome, Alex');
  assert.equal(translate('zh', 'welcome', { name: 'Alex' }), '欢迎，Alex');
});

test('name errors follow UI language without changing glyph layout', () => {
  for (const input of ['', '张三', 'A'.repeat(25)]) {
    assert.doesNotMatch(validateName(input, 'en').error, /\p{Script=Han}/u);
    assert.match(validateName(input, 'zh').error, /\p{Script=Han}/u);
  }
  assert.deepEqual(layoutName('Alex Morgan', 'en'), layoutName('Alex Morgan', 'zh'));
});

function element(dataset = {}) {
  return { dataset, value: '', textContent: '', attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; },
  };
}

test('document localization includes accessible labels and titles', () => {
  const title = element({ i18nTitle: 'frameTitle' });
  const label = element({ i18nLabel: 'progress' });
  const button = element({ i18n: 'pause' });
  const document = { documentElement: {}, querySelectorAll: selector => ({ '[data-i18n]': [button], '[data-i18n-label]': [label], '[data-i18n-title]': [title] })[selector] };
  localizeDocument(document, 'en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(button.textContent, 'Pause');
  assert.equal(label.attributes['aria-label'], 'Animation progress');
  assert.equal(title.attributes.title, 'Launcher animation preview');
  localizeDocument(document, 'zh');
  assert.equal(document.documentElement.lang, 'zh-CN');
  assert.equal(button.textContent, '暂停');
});

test('review language switching updates validation, playback labels, and embedded preview', async () => {
  const ids = Object.fromEntries(['name', 'preview', 'error', 'language', 'pause', 'slow', 'state', 'replay', 'form'].map(id => [id, element()]));
  ids.name.value = 'Alex Morgan';
  ids.preview.contentWindow = {};
  const themeButtons = [element({ theme: 'dark' }), element({ theme: 'light' })];
  const document = {
    documentElement: {}, body: { classList: { toggle() {} } },
    querySelector: selector => ids[selector.slice(1)],
    querySelectorAll: selector => selector === '[data-theme]' ? themeButtons : [],
  };
  const listeners = {};
  const context = vm.createContext({ document, navigator: { languages: ['en-US'] }, location: { search: '' },
    history: { replaceState() {} }, URLSearchParams, Date,
    addEventListener: (name, callback) => { listeners[name] = callback; },
  });
  const bundle = await build({ entryPoints: [new URL('../src/review.js', import.meta.url).pathname], bundle: true, write: false, format: 'iife' });
  vm.runInContext(bundle.outputFiles[0].text, context);
  assert.equal(document.documentElement.lang, 'en');
  assert.match(ids.preview.src, /lang=en/);
  assert.equal(ids.pause.textContent, 'Pause');
  ids.name.value = '张三';
  ids.form.onsubmit({ preventDefault() {} });
  assert.match(ids.error.textContent, /English letters/);
  ids.language.onchange({ target: { value: 'zh' } });
  assert.match(ids.error.textContent, /英文字母/);
  assert.equal(ids.name.value, '张三');
  assert.match(ids.preview.src, /lang=zh/);
  assert.match(ids.preview.src, /name=Alex\+Morgan/);
  ids.pause.onclick();
  assert.equal(ids.pause.textContent, '继续');
  ids.language.onchange({ target: { value: 'en' } });
  assert.equal(ids.pause.textContent, 'Pause');
  listeners.message({ source: ids.preview.contentWindow, data: { type: 'launcher-state', event: 'complete' } });
  assert.equal(ids.state.textContent, 'Preview complete');
});

test('animation status updates remain callable inside the numeric timeline scope', async () => {
  const source = await readFile(new URL('../src/animation.js', import.meta.url), 'utf8');
  // Execute the actual render-loop status line with its real numeric t binding.
  // This guards against a localization helper accidentally shadowed by animation time.
  const update = source.split('\n').find(line => line.startsWith("$('#status').textContent=({writing:"));
  assert.ok(update, 'production status update found');
  for (const language of ['en', 'zh']) {
    for (const state of ['writing', 'connecting', 'weaving', 'waiting', 'entering', 'complete']) {
      const nodes = Object.fromEntries(['status', 'time', 'progress'].map(id => [id, {}]));
      const context = vm.createContext({
        t: 12.5, elapsed: 12.5, waitStart: 20, breathingDuration: 6,
        state, hold: false, native: true, ready: false, DATA: { name: 'Alex' },
        uiText: (key, values) => translate(language, key, values),
        $: selector => nodes[selector.slice(1)],
        document: { body: { dataset: {} } }, window: {},
      });
      vm.runInContext(update, context);
      assert.ok(nodes.status.textContent.length > 0);
      assert.equal(nodes.time.textContent, '12.5 s');
      if (language === 'en') assert.doesNotMatch(nodes.status.textContent, /\p{Script=Han}/u);
    }
  }
});
