import { resolveLanguage, translate, localizeDocument } from './i18n.js';
import { validateName } from './name-layout.js';

const $ = selector => document.querySelector(selector);
const input = $('#name'), frame = $('#preview'), error = $('#error');
const query = new URLSearchParams(location.search);
let language = resolveLanguage(query.get('lang'), navigator.languages ?? [navigator.language]);
let slow = false, paused = false, current = input.value, theme = query.get('theme') === 'light' ? 'light' : 'dark';
const t = (key, values) => translate(language, key, values);

function startPreview(name) {
  current = name;
  paused = slow = false;
  $('#pause').textContent = t('pause');
  $('#slow').textContent = t('slow');
  $('#state').textContent = t('loaded');
  const parameters = new URLSearchParams({ name, theme, lang: language, v: String(Date.now()) });
  frame.src = 'Animation.html?' + parameters;
}

function play() {
  const result = validateName(input.value, language);
  error.textContent = result.ok ? '' : result.error;
  if (!result.ok) { input.focus(); return; }
  input.value = result.name;
  startPreview(result.name);
}

function localize() {
  localizeDocument(document, language);
  document.title = t('reviewTitle');
  $('#language').value = language;
}
function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
}
$('#language').onchange = event => {
  language = resolveLanguage(event.target.value);
  localize();
  const result = validateName(input.value, language);
  error.textContent = result.ok ? '' : result.error;
  startPreview(current);
  // Keep the explicit choice in the shareable URL, without saving names in browser storage.
  query.set('lang', language);
  try { history.replaceState(null, '', '?' + query); } catch { /* file: previews may disallow history changes. */ }
};
document.querySelectorAll('[data-theme]').forEach(button => button.onclick = () => {
  theme = button.dataset.theme;
  applyTheme();
  play();
});
$('#form').onsubmit = event => { event.preventDefault(); play(); };
document.querySelectorAll('[data-name]').forEach(button => button.onclick = () => { input.value = button.dataset.name; play(); });
$('#replay').onclick = play;
$('#pause').onclick = () => {
  frame.contentDocument?.querySelector('#pause')?.click();
  paused = !paused;
  $('#pause').textContent = t(paused ? 'resume' : 'pause');
};
$('#slow').onclick = () => {
  frame.contentDocument?.querySelector('#slow')?.click();
  slow = !slow;
  $('#slow').textContent = t(slow ? 'normal' : 'slow');
};
addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.type !== 'launcher-state') return;
  const key = { loaded: 'loaded', waiting: 'breathing', entering: 'entering', complete: 'complete' }[event.data.event];
  if (key) $('#state').textContent = t(key);
});
localize();
applyTheme();
play();
