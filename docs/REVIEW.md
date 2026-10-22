# Beta test record / 测试版验证记录

Release track: **v0.1.0-beta.1 — community prerelease.** Publication was authorized by the project owner on 2026-10-22. This record describes the tests completed before publication; untested cases remain explicit below.

## Candidate behavior

- macOS 13+ app, titled GPT Launcher.
- Manual display name, English letters and spaces, 1–24 normalized characters.
- Persisted light/dark background: light #ffffff, dark #181818; preview and launch share the choice.
- “预览动画” plays the welcome without opening ChatGPT.
- “保存设置” saves locally; “保存并启动” saves and starts the launcher flow.
- Automatically finds ChatGPT; “定位 ChatGPT…” is available when it is missing.
- Return/keypad Enter skips the launch animation. Escape returns to settings.
- Option at launch or Command+, during the splash reopens settings.
- Automatic handoff follows two breathing cycles, without checking the content of ChatGPT's UI.

## Build facts

The build script targets macOS 13+ and produces both arm64 and x86_64 slices by default. It uses **ad-hoc signing**, not an Apple Developer ID certificate, and the artifact is **not notarized**. Compiling an Intel slice does not establish that it runs correctly on Intel hardware. The ChatGPT app's own platform requirements still apply.

A downloaded ZIP may be blocked by macOS. A successful local launch is not proof of the experience on a clean Mac. Do not describe this candidate as a notarized, universally tested public release.

## Acceptance evidence — 2026-10-22

Evidence below comes from local code checks, browser playback, and the native review app on one Apple Silicon Mac. The installed ChatGPT was already running during handoff tests. These results do not establish cold-start behavior, Intel runtime compatibility, or quality for every possible name.

- [x] First launch displayed the settings window.
- [x] Changed the display name to `Mia`, saved, quit, and reopened; the native preview loaded the saved name.
- [x] Light appearance persisted through reopening and was verified in the native view and HTML preview. Dark appearance was also inspected in the browser.
- [x] Chinese input was rejected in the native UI with a message.
- [x] The three automated test cases passed: name normalization, invalid-input rejection, and glyph-path/layout checks covering all 52 permitted English letters. Invalid cases included empty, unsupported, and over-24-character input. Path coverage verifies available geometry and increasing layout positions, not visual correctness of every letter pairing.
- [x] Short and longer example names were visually inspected on one line, including `Mia`, `Alex Morgan`, `Jeff Morris`, and `William Montgomery`.
- [x] Inspected letter formation, the `f` strokes, and branch-to-logo joins for the tested examples. This is a sample-based visual check, not a claim that every letter pairing is perfect.
- [x] Measured branch/mark joins: maximum endpoint discrepancy approximately `1.2 × 10⁻¹²` scene units; tangent dot products above `0.99969`; equal strand widths and matching endpoint colors.
- [x] Early Return worked without clicking first, approximately 0.668 seconds after native launch; the native event sequence recorded manual completion.
- [x] The normal native launch activated the already-running ChatGPT and exited the launcher after automatic completion.
- [x] Two breathing cycles measured 5.985 seconds, followed by approximately 2.177 seconds for the entering transition in the local native test.
- [x] A local light-mode `Mia` browser run reached completion with an average of approximately 60 fps over the final 120 recorded frames. This is one local measurement, not a minimum performance guarantee.
- [x] Universal arm64/x86_64 binary and strict ad-hoc signature verification passed for the clean review bundle.
- [x] Keypad Enter also worked without clicking first: the key event arrived approximately 0.677 seconds after native launch, followed by manual completion approximately 0.007 seconds later.
- [ ] Verify the missing/moved ChatGPT recovery flow by actually making the target unavailable. It has been reviewed in code, but not exercised by moving or removing ChatGPT.
- [ ] Verify preview isolation with ChatGPT initially closed, as well as the cold-start launch path. Preview is designed not to launch the target; the current warm-app test cannot prove this for a closed target.
- [ ] Run the complete settings/preview-cancellation lifecycle check for orphan windows.
- [ ] Run on supported Intel hardware.
- [ ] Install and launch the downloaded artifact on a clean Mac to assess Gatekeeper and distribution behavior separately from local signing.

Raw diagnostic logs, local application paths, and recordings containing personal information are retained outside the public source package. No independent external reviewer or Dot/Roxy review is claimed.

## Release status

The owner authorized a public release after reviewing the local build. Version 0.1.0-beta.1 is labeled a community prerelease, with the signing and test limits above. Source licenses and the distinction between source licenses and trademark rights are documented in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Only project sources and the intended app package belong in the public release. Personal settings, absolute local paths, raw launch logs, and private test recordings are excluded. SHA-256 checksums accompany the distributed package. Future Developer ID signing, notarization, and wider hardware testing are separate work; none is claimed here.

## 快速审查

请主要看三个地方：名字是否写得好看、预览与正式启动是否容易理解、打开 ChatGPT 和按回车进入是否符合预期。本机已验证名字与浅色设置保存、直接回车进入、两次呼吸后自动进入，以及几组名字的书写与连接。冷启动、Intel 实机、全新 Mac 安装和未安装 ChatGPT 的现场流程尚未验证。本次以社区测试版发布；当前签名方式和未验证项目均保留说明，不作为正式稳定版兼容承诺。
