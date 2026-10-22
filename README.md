# GPT Launcher

**让每次打开 ChatGPT，都从你的名字开始。**

一个轻巧的 macOS 启动器：彩虹缎带写下你的名字，延伸、交织，再随着两次呼吸，渐渐进入 ChatGPT。也可以随时按下回车，直接开始。

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/welcome-dark.png">
  <img src="docs/images/welcome-light.png" alt="GPT Launcher 用彩带写出 Welcome Alex Morgan，支持浅色和深色背景。">
</picture>

[下载 macOS 测试版](https://github.com/AnsonZhang0129/gpt-launcher/releases/download/v0.1.0-beta.1/GPT-Launcher-v0.1.0-beta.1-macOS.zip) · [English](#english) · [测试记录](docs/REVIEW.md) · [许可与致谢](THIRD_PARTY_NOTICES.md)

> **v0.1.0-beta.1 · 社区测试版**  
> 源码公开、供非商业用途使用的独立项目，不是 OpenAI 官方产品，也不是 ChatGPT 客户端。需要另外安装 ChatGPT 桌面应用。当前安装包尚未经过 Apple 公证。

## 为你的名字写一段开场

- **手动输入名字** — 支持 1–24 个英文字母和空格，保留大小写，整句自动适配为一行。
- **彩带书写** — 使用适配后的手写路径，保留圆润笔触、抬笔、分支编织和渐显转场。
- **深浅两种外观** — 深色 `#181818`、浅色 `#FFFFFF`，对应开发时核对的 ChatGPT 桌面版默认底色；预览和正式启动使用同一选择。
- **先预览，再保存** — 在设置窗口看完效果，满意后保存；再次打开时直接播放。
- **随时开始** — 动画结束后呼吸两次自动进入，播放中直接按 Return 或数字键盘回车也可跳过。
- **本机保存** — 名字、外观和应用位置只保存在你的 Mac，动画资源随应用打包。

第一版固定使用一套打磨过的手写字体。中文、数字、标点和自定义字体暂不支持；不支持的输入会提示，不会静默替换。

## 安装与使用

启动器需要 **macOS 13 或更新版本**。你还需要满足 ChatGPT 桌面应用自身的系统要求，并提前安装它。

1. 在 [Releases](https://github.com/AnsonZhang0129/gpt-launcher/releases) 下载 macOS ZIP，解压后将 **GPT Launcher.app** 放入「应用程序」。
2. 首次打开，填写名字，选择「深色」或「浅色」，点击「预览动画」。
3. 点击「保存设置」，或点击「保存并启动」立即体验。找不到 ChatGPT 时，会显示「定位 ChatGPT…」。
4. 以后直接打开 GPT Launcher。也可以把它拖入 Dock，作为自己的 ChatGPT 启动入口。

| 操作 | 效果 |
| --- | --- |
| Return / 数字键盘回车 | 播放中直接进入，不必先点击动画 |
| Esc | 从动画返回设置 |
| ⌘ , | 播放中打开设置 |
| 按住 Option 再打开应用 | 重新设置名字或外观 |

**安装说明：** 本测试版采用本地临时签名，尚未使用 Developer ID 签名或 Apple 公证。下载副本可能被 macOS 拦截；源码构建方式见下文。本项目不要求关闭 Gatekeeper 或其他系统安全保护。

## 当前验证范围

已在一台 Apple Silicon Mac 上验证名字和外观保存、直接回车、数字键盘回车，以及 ChatGPT 已运行时的自动进入。检查过短名、长名、圆环和部分连笔示例。

两次呼吸后进入由动画计时控制，**不会读取 ChatGPT 界面来判断加载状态**。因此，尚不能保证冷启动时 ChatGPT 已加载完毕。Intel 实机、全新 Mac 下载后安装，以及全部姓名组合的视觉效果仍待验证。构建虽包含 arm64 和 x86_64，两种架构的打包不等于都已实机测试。详见 [测试记录](docs/REVIEW.md)。

背景是手动选择，不会读取或同步 ChatGPT 当前主题。字体选择、更多字符和其他平台留待后续版本。

## 隐私

启动器不读取 ChatGPT 聊天、账号昵称或浏览器数据，不修改 ChatGPT 本体。它不需要 ChatGPT 登录、API Key、辅助功能权限或管理员权限。动画可以离线播放；ChatGPT 本身仍有自己的联网与账号要求。

设置保存于：

```text
~/Library/Application Support/GPT Launcher/settings.json
```

本地诊断记录只包含启动事件、时间和窗口焦点状态，不包含名字或聊天内容。

## 从源码构建

准备 macOS 13+、Xcode Command Line Tools（含 Swift）、Node.js 和 pnpm，然后在项目目录运行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build:mac
```

默认输出为 `build/GPT Launcher.app`。只构建网页动画可运行 `pnpm run build`。生成的应用、依赖目录和个人设置不纳入源码仓库。

## 许可与致谢

**欢迎为非商业用途 Fork、修改、改进和分享。** 本版本的原创应用代码采用 [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)，完整条款见 [LICENSE](LICENSE)。这是限制商业用途的源码可用许可；使用与分发须遵守其中的用途和声明要求。

这项变更仅适用于本项目原创代码。字体路径来自 EMS Allure Smooth，在本项目中以 Ribbon Script 名称调整，继续沿用 SIL OFL 1.1；Three.js、esbuild 及 Simple Icons 路径也保留各自原许可，不受本项目新增的非商业限制约束。完整来源见 [第三方声明](THIRD_PARTY_NOTICES.md)。

**历史许可：** 提交 `0fe1e92` 和 `b9bbec6` 曾以 MIT 许可公开。本次许可变更不撤回这些历史版本已经授予的 MIT 权利。

ChatGPT、GPT 和 OpenAI 标志属于其各自权利人；素材的开源许可不授予商标权。本项目与 OpenAI 无隶属或背书关系。应用图标为独立彩带图案。

---

## English

**A personal welcome, before your next conversation.**

GPT Launcher is a small macOS launcher that writes your name in a rainbow ribbon, weaves it into an animated transition, and opens your installed ChatGPT app. Let the two-breath transition finish, or press Return to get started immediately.

### Features

- A manually entered name: 1–24 English letters and spaces, kept on one line.
- A fixed, adapted handwriting style with ribbon strokes and a gradual transition.
- Saved light (`#FFFFFF`) and dark (`#181818`) appearances.
- An in-app preview before saving; preview is designed not to launch ChatGPT.
- Return or keypad Enter to skip, without clicking the splash first.
- Local settings and bundled animation assets; no ChatGPT account, API key, or Accessibility access required by the launcher.

### Get started

Download the macOS ZIP from [Releases](https://github.com/AnsonZhang0129/gpt-launcher/releases), unzip it, and move **GPT Launcher.app** into Applications. On first launch, enter a name and choose an appearance. **预览动画** previews it, **保存设置** saves it, and **保存并启动** saves and launches. Hold Option when opening the app—or press Command+, during playback—to return to settings. Escape also returns from the splash to settings.

The launcher requires macOS 13+ and a separately installed ChatGPT app. ChatGPT's own platform requirements still apply. This is an independent community project, not an official OpenAI product or a ChatGPT client.

### Beta status

Version **0.1.0-beta.1** is ad-hoc signed and **not Apple-notarized**. macOS may block a downloaded copy. Build instructions are above; the project does not ask you to disable system security.

Saved settings, early Return, keypad Enter, and automatic handoff were tested on one Apple Silicon Mac with ChatGPT already running. Cold starts, Intel hardware, clean-Mac installation, and every possible letter pairing remain unverified. Handoff follows an animation timer rather than inspecting ChatGPT's loading state. See the [test record](docs/REVIEW.md).

The first version does not support Chinese names, numbers, punctuation, custom fonts, or other operating systems. Appearance selection is manual and does not track ChatGPT's settings.

### License

This version's original application code is **source-available under [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)**. Noncommercial forks, modifications, and sharing are welcome under its terms; see [LICENSE](LICENSE). This is a noncommercial license, not an OSI open-source license.

Font data and third-party dependencies retain their existing licenses; the project's new noncommercial restriction does not relicense them. See [third-party notices](THIRD_PARTY_NOTICES.md).

**License history:** commits `0fe1e92` and `b9bbec6` were already published under MIT. This change does not withdraw the MIT permissions previously granted for those versions.
