# v0.1.0-beta.1 — 从你的名字开始 / A personal welcome

让每次打开 ChatGPT，都从你的名字开始。

首个 macOS 社区测试版：输入自己的名字，看彩虹缎带逐笔写下一句欢迎，延伸、编织，再渐渐进入 ChatGPT。想立即开始时，直接按回车即可。

## 这次带来了什么

- 手动输入并保存显示名字，支持 1–24 个英文字母和空格。
- 单行自适应排版与固定的手写彩带字体。
- 深色 `#181818` / 浅色 `#FFFFFF`，预览与正式启动同步使用保存的外观。
- 独立预览、分支编织和渐显转场。
- 两次呼吸后自动进入；中途按 Return 或数字键盘回车可跳过。
- 名字、外观和 ChatGPT 位置保存在本机；动画资源随应用打包。

## 下载与使用

下载 [GPT-Launcher-v0.1.0-beta.1-macOS.zip](https://github.com/AnsonZhang0129/gpt-launcher/releases/download/v0.1.0-beta.1/GPT-Launcher-v0.1.0-beta.1-macOS.zip)，解压后将 **GPT Launcher.app** 放入「应用程序」。首次打开输入名字，可先预览，再点击「保存设置」或「保存并启动」。按住 Option 打开，或播放中按 ⌘ ,，可重新设置。

需要 macOS 13+，并单独安装 ChatGPT。ChatGPT 自身的系统要求仍然适用。ZIP 的 SHA-256 校验值随发布附件提供。

## 测试版说明

- 安装包为本地临时签名，尚未使用 Developer ID 签名或 Apple 公证；macOS 可能拦截下载副本。也可从源码构建，无需关闭系统安全保护。
- 已在一台 Apple Silicon Mac 上验证设置保存、直接回车、数字键盘回车和 ChatGPT 已运行时的自动进入。
- 冷启动、Intel 实机和全新 Mac 安装尚未验证。两次呼吸由动画计时控制，不代表检测到了 ChatGPT 加载完成。
- 暂不支持中文、数字、标点或自定义字体。已检查部分姓名示例，并不保证所有字母组合都已逐一验证。

本版原创应用代码采用 [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)，欢迎遵照条款，为非商业用途 Fork、修改和分享。它是限制商业用途的源码可用许可。字体和第三方组件继续保留各自原许可。

历史提交 `0fe1e92`、`b9bbec6` 已以 MIT 许可公开，本次变更不撤回这些历史版本已经授予的 MIT 权利。

这是独立项目，不是 OpenAI 官方产品，也不是 ChatGPT 客户端。完整许可、素材来源和测试记录见仓库文档。

---

## English

**A personal welcome, before your next conversation.**

The first macOS community beta lets you choose a name, watch it appear in a rainbow ribbon, and continue into your installed ChatGPT app. Wait for the two-breath transition, or press Return to begin immediately.

### Included

- Local display-name settings: 1–24 English letters and spaces.
- A fixed handwriting style with one-line adaptive layout.
- Saved light and dark appearances shared by preview and launch.
- Ribbon writing, branching, and a gradual transition.
- Return and keypad Enter to skip without first clicking the splash.
- Bundled animation assets; no API key or Accessibility permission needed.

### Installation and limits

Download the macOS ZIP attached to this release, unzip it, and move **GPT Launcher.app** into Applications. A SHA-256 checksum file is included. Requires macOS 13+ and a separate ChatGPT installation; ChatGPT's own platform requirements still apply.

This beta is ad-hoc signed and **not Apple-notarized**. Downloaded copies may be blocked by macOS. Source-build instructions are in the README; disabling system security is not required.

Settings persistence, Return/keypad Enter, and automatic handoff were tested on one Apple Silicon Mac with ChatGPT already running. Cold starts, Intel hardware, clean-Mac installation, and every possible name remain unverified. The handoff is timed rather than based on ChatGPT's UI loading state. Chinese names, numbers, punctuation, and custom fonts are not supported yet.

Original application code in this release is source-available under [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). Noncommercial modifications and sharing are welcome under its terms. Font data and third-party components retain their own licenses. Earlier commits `0fe1e92` and `b9bbec6` were published under MIT; their existing MIT grants are not withdrawn by this change.

An independent project, not an official OpenAI product or a ChatGPT client. See the repository for licenses, attribution, and detailed test evidence.
