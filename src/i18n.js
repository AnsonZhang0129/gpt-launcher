// Keep UI language independent from the Latin-only handwriting font.
export function resolveLanguage(requested, preferred = []) {
  const normalize = value => typeof value === 'string' ? value.toLowerCase().replaceAll('_', '-') : '';
  const explicit = normalize(requested);
  if (explicit === 'zh' || explicit.startsWith('zh-')) return 'zh';
  if (explicit === 'en' || explicit.startsWith('en-')) return 'en';
  for (const candidate of preferred) {
    const language = normalize(candidate);
    if (language === 'zh' || language.startsWith('zh-')) return 'zh';
    if (language === 'en' || language.startsWith('en-')) return 'en';
  }
  return 'en';
}

export const messages = {
  en: {
    nameRequired: 'Enter a display name.',
    nameUnsupported: 'Use English letters and spaces only. Other characters are not supported yet.',
    nameTooLong: 'Use at most 24 characters, including spaces.',
    displayName: 'Display name', language: 'Language', appearance: 'Appearance', dark: 'Dark', light: 'Light',
    replay: 'Replay', pause: 'Pause', resume: 'Resume', slow: '¼ speed', normal: '1× speed',
    writing: 'A ribbon says hello', connecting: 'Following the ribbon', weaving: 'Six strands come together',
    waiting: 'Preparing your space', waitingManual: 'Press Return to continue', ready: 'Ready · waiting for the transition',
    welcome: 'Welcome, {name}', complete: 'Preview complete', preparing: 'Preparing ChatGPT',
    newIdea: '＋ New idea', search: '⌕ Search', yourSpace: 'YOUR SPACE', learn: 'Learn and explore',
    build: 'Build and create', notes: 'Ideas and notes', ideas: 'A SPACE FOR YOUR IDEAS', startIdea: 'Start with an idea.',
    composer: 'What shall we create today?', addIdea: '＋ Add an idea',
    previewNote: 'Preview complete · the app will open ChatGPT', again: 'Watch again ↗',
    progress: 'Animation progress', hold: 'Wait for Return', simulateReady: 'Simulate ready', fullscreen: 'Fullscreen ↗',
    reviewTitle: 'GPT Launcher · Preview', tagline: 'Let every launch begin with your name', badge: 'macOS · App preview',
    headline: 'Your name.\nYour opening.', intro: 'A ribbon writes your name.\nEnter a name and watch it take shape.',
    preview: 'Preview my welcome', longName: 'Long name',
    details: 'English letters and spaces, up to 24 characters.\nThe native app saves your name on this Mac.\nThis page only previews; it does not open ChatGPT.',
    frameTitle: 'Launcher animation preview', loaded: 'Writing', breathing: 'Breathing · preparing to enter', entering: 'Revealing your space',
  },
  zh: {
    nameRequired: '请输入显示名称。',
    nameUnsupported: '目前支持英文字母和空格，暂不支持中文、数字和符号。',
    nameTooLong: '名称最多 24 个字符，包含空格。',
    displayName: '显示名称', language: '语言', appearance: '外观', dark: '深色', light: '浅色',
    replay: '重播', pause: '暂停', resume: '继续', slow: '¼ 慢放', normal: '1× 常速',
    writing: '一笔，向你问好', connecting: '沿着彩带，继续向前', weaving: '六道光，交织成形',
    waiting: '正在准备你的空间', waitingManual: '按回车，继续进入', ready: '已就绪 · 等待镜头衔接',
    welcome: '欢迎，{name}', complete: '预览完成', preparing: '正在准备 ChatGPT',
    newIdea: '＋ 新的灵感', search: '⌕ 搜索', yourSpace: '你的空间', learn: '学习与探索',
    build: '构建与创造', notes: '想法与笔记', ideas: '为想法留一片空间', startIdea: '从一个想法开始。',
    composer: '今天，我们一起创造什么？', addIdea: '＋ 添加灵感',
    previewNote: '动画预览完成 · 实际启动将打开 ChatGPT', again: '再看一次 ↗',
    progress: '动画进度', hold: '等待我按回车', simulateReady: '模拟就绪', fullscreen: '全屏 ↗',
    reviewTitle: 'GPT Launcher · 预览', tagline: '让每一次打开，都从你的名字开始', badge: 'macOS · 应用预览',
    headline: '你的名字，\n你的开场。', intro: '沿用已经打磨的彩带字体。\n输入名字，看看它如何被写出来。',
    preview: '预览我的开场', longName: '长名字',
    details: '支持英文字母与空格，最多 24 个字符。\n正式应用将名字保存在本机。\n此页面仅预览，不会打开 ChatGPT。',
    frameTitle: '启动动画预览', loaded: '书写中', breathing: '呼吸 · 准备进入', entering: '穿洞渐显',
  },
};

export function translate(language, key, values = {}) {
  const text = (messages[language] ?? messages.en)[key] ?? messages.en[key];
  if (typeof text !== 'string') throw new Error(`Unknown translation key: ${key}`);
  return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

export function localizeDocument(root, language) {
  root.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = translate(language, element.dataset.i18n);
  }
  for (const element of root.querySelectorAll('[data-i18n-label]')) {
    element.setAttribute('aria-label', translate(language, element.dataset.i18nLabel));
  }
  for (const element of root.querySelectorAll('[data-i18n-title]')) {
    element.setAttribute('title', translate(language, element.dataset.i18nTitle));
  }
}
