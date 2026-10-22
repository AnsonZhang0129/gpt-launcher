import AppKit
import WebKit
import UniformTypeIdentifiers

private let productName = "GPT Launcher"
// Keep these in sync with the bundled animation theme tokens.
private func themeBackground(_ theme: String) -> NSColor {
    theme == "light" ? .white : NSColor(srgbRed: 24/255, green: 24/255, blue: 24/255, alpha: 1)
}

struct Preferences: Codable {
    var name: String
    var targetPath: String
    var theme: String
    enum CodingKeys: String, CodingKey { case name, targetPath, theme }
    init(name: String, targetPath: String, theme: String = "dark") {
        self.name = name; self.targetPath = targetPath; self.theme = theme == "light" ? "light" : "dark"
    }
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        name = try values.decode(String.self, forKey: .name)
        targetPath = try values.decode(String.self, forKey: .targetPath)
        theme = (try? values.decode(String.self, forKey: .theme)) == "light" ? "light" : "dark"
    }
}
final class SplashWindow: NSWindow { override var canBecomeKey: Bool { true } }

final class Launcher: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, NSWindowDelegate, NSTextFieldDelegate {
    private let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent(productName)
    private var preferences: Preferences?
    private var settingsWindow: NSWindow?
    private var splashWindow: NSWindow?
    private var previewWeb: WKWebView?
    private var splashWeb: WKWebView?
    private var previewHost: NSView?
    private var previewPlaceholder: NSTextField?
    private var nameField: NSTextField!
    private var themeControl: NSSegmentedControl?
    private var accentLabel: NSTextField?
    private var selectedTheme = "dark"
    private var targetLabel: NSTextField!
    private var locateButton: NSButton?
    private var statusLabel: NSTextField!
    private var targetPath = ""
    private var target: NSRunningApplication?
    private var opening = false
    private var finishRequested = false
    private var entering = false
    private var session = UUID()
    private var keyMonitor: Any?
    private var timeout: DispatchWorkItem?
    private var events: [[String: Any]] = []
    private var isLaunching = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        if let data = try? Data(contentsOf: support.appendingPathComponent("settings.json")) {
            preferences = try? JSONDecoder().decode(Preferences.self, from: data)
        }
        selectedTheme = preferences?.theme ?? "dark"
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self else { return event }
            if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "," {
                self.showSettings(nil); return nil
            }
            guard self.isLaunching else { return event }
            if event.keyCode == 36 || event.keyCode == 76 {
                self.record("return-key"); self.finish(); return nil
            }
            if event.keyCode == 53 {
                self.record("escape-key"); self.showSettings(nil); return nil
            }
            return event
        }
        let forceSettings = NSEvent.modifierFlags.contains(.option) || CommandLine.arguments.contains("--settings")
        if !forceSettings, let saved = preferences, normalizedName(saved.name) != nil {
            launch(saved)
        } else {
            showSettings(nil)
        }
    }

    private func buildMenu() {
        let bar = NSMenu()
        let appItem = NSMenuItem()
        let menu = NSMenu()
        let settings = NSMenuItem(title: "设置…", action: #selector(showSettings(_:)), keyEquivalent: ",")
        settings.target = self; menu.addItem(settings)
        menu.addItem(.separator())
        menu.addItem(withTitle: "退出 GPT Launcher", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = menu; bar.addItem(appItem)
        let editItem = NSMenuItem(); let edit = NSMenu(title: "编辑")
        edit.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit; bar.addItem(editItem); NSApp.mainMenu = bar
    }

    private func normalizedName(_ input: String) -> String? {
        let value = input.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: " ", omittingEmptySubsequences: true).joined(separator: " ")
        guard !value.isEmpty, value.count <= 24,
              value.unicodeScalars.allSatisfy({ (65...90).contains($0.value) || (97...122).contains($0.value) || $0.value == 32 }) else { return nil }
        return value
    }
    private func validApplication(_ path: String) -> URL? {
        let url = URL(fileURLWithPath: path).standardizedFileURL
        guard url.pathExtension.lowercased() == "app", let bundle = Bundle(url: url),
              bundle.bundleIdentifier != Bundle.main.bundleIdentifier,
              let executable = bundle.executableURL,
              FileManager.default.isExecutableFile(atPath: executable.path),
              (bundle.bundleIdentifier == "com.openai.chat" || (bundle.bundleIdentifier == "com.openai.codex" && url.lastPathComponent == "ChatGPT.app")) else { return nil }
        return url
    }
    private func discoveredTarget() -> String {
        for id in ["com.openai.chat"] {
            if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: id), validApplication(url.path) != nil { return url.path }
        }
        let installed = "/Applications/ChatGPT.app"
        if validApplication(installed) != nil { return installed }
        return ""
    }
    private func label(_ text: String, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor = .labelColor) -> NSTextField {
        let label = NSTextField(wrappingLabelWithString: text)
        label.font = .systemFont(ofSize: size, weight: weight); label.textColor = color
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }
    private func button(_ title: String, action: Selector, primary: Bool = false) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .rounded; button.controlSize = .large
        button.font = .systemFont(ofSize: 13, weight: .medium)
        if primary { button.bezelColor = NSColor(srgbRed: 0.65, green: 0.56, blue: 0.82, alpha: 1) }
        button.translatesAutoresizingMaskIntoConstraints = false
        button.heightAnchor.constraint(equalToConstant: 34).isActive = true
        return button
    }

    @objc func showSettings(_ sender: Any?) {
        cancelLaunch()
        NSApp.setActivationPolicy(.regular)
        if let window = settingsWindow {
            NSApp.activate(ignoringOtherApps: true); window.makeKeyAndOrderFront(nil)
            targetPath = preferences?.targetPath ?? targetPath
            if validApplication(targetPath) == nil, !discoveredTarget().isEmpty { targetPath = discoveredTarget() }
            updateTargetLabel()
            window.makeFirstResponder(nameField); return
        }
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1080, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = productName; window.titlebarAppearsTransparent = true
        window.backgroundColor = themeBackground(selectedTheme); window.appearance = NSAppearance(named: selectedTheme == "light" ? .aqua : .darkAqua)
        window.minSize = NSSize(width: 940, height: 720); window.isReleasedWhenClosed = false
        window.delegate = self; window.center(); settingsWindow = window
        let content = window.contentView!
        let left = NSView(); left.translatesAutoresizingMaskIntoConstraints = false; content.addSubview(left)
        let preview = NSView(); preview.translatesAutoresizingMaskIntoConstraints = false
        preview.wantsLayer = true; preview.layer?.backgroundColor = themeBackground(selectedTheme).cgColor
        preview.layer?.cornerRadius = 20; preview.layer?.masksToBounds = true; content.addSubview(preview); previewHost = preview
        let tag = label("A PERSONAL WELCOME", size: 10, weight: .semibold, color: NSColor(srgbRed: 0.72, green: 0.64, blue: 0.84, alpha: 1))
        accentLabel = tag
        let title = label("让每次打开，\n都从你的名字开始。", size: 27, weight: .medium)
        let intro = label("熟悉的彩带，多一点属于你的感觉。", size: 12, color: .secondaryLabelColor)
        let nameTitle = label("显示名称", size: 12, weight: .semibold)
        nameField = NSTextField(string: preferences?.name ?? "")
        nameField.placeholderString = "例如 Alex Chen"; nameField.font = .systemFont(ofSize: 16)
        nameField.bezelStyle = .roundedBezel; nameField.controlSize = .large; nameField.delegate = self
        nameField.translatesAutoresizingMaskIntoConstraints = false
        nameField.setAccessibilityLabel("显示名称")
        let nameHint = label("英文字母和空格，最多 24 个字符。", size: 11, color: .secondaryLabelColor)
        let themeTitle = label("背景外观", size: 12, weight: .semibold)
        let themeSelector = NSSegmentedControl(labels: ["深色", "浅色"], trackingMode: .selectOne, target: self, action: #selector(themeChanged(_:)))
        themeSelector.selectedSegment = selectedTheme == "light" ? 1 : 0
        themeSelector.segmentStyle = .rounded; themeSelector.controlSize = .large
        themeSelector.translatesAutoresizingMaskIntoConstraints = false
        themeSelector.setAccessibilityLabel("背景外观")
        themeControl = themeSelector
        let targetTitle = label("ChatGPT", size: 12, weight: .semibold)
        targetPath = preferences?.targetPath ?? discoveredTarget()
        if validApplication(targetPath) == nil, !discoveredTarget().isEmpty { targetPath = discoveredTarget() }
        targetLabel = label("", size: 12, color: .secondaryLabelColor); updateTargetLabel()
        let choose = button("定位 ChatGPT…", action: #selector(chooseTarget(_:)))
        choose.isHidden = validApplication(targetPath) != nil; locateButton = choose
        let previewButton = button("预览动画", action: #selector(preview(_:)))
        let saveButton = button("保存并启动", action: #selector(saveAndLaunch(_:)), primary: true)
        let saveOnly = button("保存设置", action: #selector(saveOnly(_:)))
        statusLabel = label("名字只保存在这台 Mac，不会上传。", size: 11, color: .secondaryLabelColor)
        let reopenHint = label("下次打开直接播放。按住 ⌥ 打开，或播放时按 ⌘ , 可返回设置。", size: 11, color: .tertiaryLabelColor)
        let stack = NSStackView(views: [tag, title, intro, nameTitle, nameField, nameHint, themeTitle, themeSelector, targetTitle, targetLabel, choose, previewButton, saveButton, saveOnly, statusLabel, reopenHint])
        stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 10; stack.translatesAutoresizingMaskIntoConstraints = false
        stack.setCustomSpacing(11, after: tag); stack.setCustomSpacing(18, after: intro)
        stack.setCustomSpacing(16, after: nameHint); stack.setCustomSpacing(16, after: themeSelector); stack.setCustomSpacing(16, after: choose)
        stack.setCustomSpacing(8, after: saveOnly); left.addSubview(stack)
        let placeholder = label("你的名字，会在这里写下。\n\n填写名称后，点击「预览动画」。", size: 17, weight: .regular, color: .secondaryLabelColor)
        placeholder.alignment = .center; preview.addSubview(placeholder); previewPlaceholder = placeholder
        NSLayoutConstraint.activate([
            left.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 30), left.topAnchor.constraint(equalTo: content.topAnchor, constant: 30), left.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -24), left.widthAnchor.constraint(equalToConstant: 290),
            stack.leadingAnchor.constraint(equalTo: left.leadingAnchor), stack.trailingAnchor.constraint(equalTo: left.trailingAnchor), stack.topAnchor.constraint(equalTo: left.topAnchor),
            nameField.widthAnchor.constraint(equalTo: stack.widthAnchor), nameField.heightAnchor.constraint(equalToConstant: 36), targetLabel.widthAnchor.constraint(equalTo: stack.widthAnchor), statusLabel.widthAnchor.constraint(equalTo: stack.widthAnchor), reopenHint.widthAnchor.constraint(equalTo: stack.widthAnchor),
            themeSelector.widthAnchor.constraint(equalTo: stack.widthAnchor), themeSelector.heightAnchor.constraint(equalToConstant: 32),
            previewButton.widthAnchor.constraint(equalTo: stack.widthAnchor), saveButton.widthAnchor.constraint(equalTo: stack.widthAnchor), saveOnly.widthAnchor.constraint(equalTo: stack.widthAnchor),
            preview.leadingAnchor.constraint(equalTo: left.trailingAnchor, constant: 28), preview.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -24), preview.topAnchor.constraint(equalTo: content.topAnchor, constant: 24), preview.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -24),
            placeholder.centerXAnchor.constraint(equalTo: preview.centerXAnchor), placeholder.centerYAnchor.constraint(equalTo: preview.centerYAnchor), placeholder.widthAnchor.constraint(lessThanOrEqualTo: preview.widthAnchor, constant: -40)
        ])
        applySettingsTheme()
        NSApp.activate(ignoringOtherApps: true); window.makeKeyAndOrderFront(nil); window.makeFirstResponder(nameField)
    }

    private func applySettingsTheme() {
        let light = selectedTheme == "light"
        settingsWindow?.appearance = NSAppearance(named: light ? .aqua : .darkAqua)
        settingsWindow?.backgroundColor = themeBackground(selectedTheme)
        previewHost?.layer?.backgroundColor = themeBackground(selectedTheme).cgColor
        previewHost?.layer?.borderColor = (light ? NSColor.black.withAlphaComponent(0.10) : NSColor.white.withAlphaComponent(0.08)).cgColor
        previewHost?.layer?.borderWidth = 1
        accentLabel?.textColor = light ? NSColor(srgbRed: 0.46, green: 0.34, blue: 0.63, alpha: 1) : NSColor(srgbRed: 0.72, green: 0.64, blue: 0.84, alpha: 1)
    }
    @objc private func themeChanged(_ sender: NSSegmentedControl) {
        selectedTheme = sender.selectedSegment == 1 ? "light" : "dark"
        applySettingsTheme()
        if previewWeb != nil { preview(nil) }
        else { setStatus("外观已切换，保存后用于下次启动。") }
    }
    private func updateTargetLabel() {
        locateButton?.isHidden = validApplication(targetPath) != nil
        guard !targetPath.isEmpty else { targetLabel.stringValue = "未找到 ChatGPT，请先安装或定位应用。"; return }
        targetLabel.stringValue = validApplication(targetPath) != nil ? "已找到 ChatGPT" : "ChatGPT 已移动，请重新定位。"
        targetLabel.toolTip = targetPath
    }
    @objc private func chooseTarget(_ sender: Any?) {
        let panel = NSOpenPanel(); panel.title = "定位已安装的 ChatGPT"; panel.prompt = "选择 ChatGPT"
        panel.allowedContentTypes = [.application]; panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false; panel.treatsFilePackagesAsDirectories = false
        panel.directoryURL = URL(fileURLWithPath: "/Applications")
        panel.beginSheetModal(for: settingsWindow!) { [weak self] response in
            guard let self, response == .OK, let url = panel.url else { return }
            guard self.validApplication(url.path) != nil else { self.setStatus("请选择已安装的 ChatGPT.app。", error: true); return }
            self.targetPath = url.path; self.updateTargetLabel(); self.setStatus("已找到 ChatGPT，保存后生效。")
        }
    }
    private func setStatus(_ message: String, error: Bool = false) {
        statusLabel?.stringValue = message; statusLabel?.textColor = error ? .systemOrange : .secondaryLabelColor
    }
    private func enteredName() -> String? {
        guard let name = normalizedName(nameField.stringValue) else {
            setStatus("请输入 1–24 个英文字母或空格；暂不支持中文和符号。", error: true)
            settingsWindow?.makeFirstResponder(nameField); return nil
        }
        nameField.stringValue = name; return name
    }
    func controlTextDidChange(_ obj: Notification) { setStatus("修改后可先预览，再保存。") }

    @objc private func preview(_ sender: Any?) {
        guard let name = enteredName(), let host = previewHost else { return }
        disposePreview()
        guard let web = makeWeb(name: name, mode: "preview", theme: selectedTheme) else { return }
        web.frame = host.bounds; web.autoresizingMask = [.width, .height]
        previewWeb = web; host.addSubview(web); previewPlaceholder?.isHidden = true
        setStatus("正在预览。预览不会打开目标应用。")
    }
    private func disposePreview() {
        let old = previewWeb; previewWeb = nil
        old?.configuration.userContentController.removeScriptMessageHandler(forName: "splash")
        old?.stopLoading(); old?.removeFromSuperview()
        previewPlaceholder?.isHidden = false
    }
    private func save() -> Preferences? {
        guard let name = enteredName() else { return nil }
        guard validApplication(targetPath) != nil else { updateTargetLabel(); setStatus("ChatGPT 已移动或不存在，请重新定位。", error: true); return nil }
        let saved = Preferences(name: name, targetPath: targetPath, theme: selectedTheme)
        do {
            try FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
            try JSONEncoder().encode(saved).write(to: support.appendingPathComponent("settings.json"), options: .atomic)
            preferences = saved; setStatus("设置已保存，下次打开时生效。")
            return saved
        } catch { setStatus("无法保存设置：\(error.localizedDescription)", error: true); return nil }
    }
    @objc private func saveOnly(_ sender: Any?) { _ = save() }
    @objc private func saveAndLaunch(_ sender: Any?) { if let saved = save() { launch(saved) } }

    private func makeWeb(name: String, mode: String, theme: String) -> WKWebView? {
        guard let html = Bundle.main.url(forResource: "Animation", withExtension: "html") else {
            setStatus("动画文件缺失，请重新安装完整应用。", error: true); return nil
        }
        let config = WKWebViewConfiguration()
        let payload = ["name": name, "mode": mode, "theme": theme]
        guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return nil }
        config.userContentController.addUserScript(WKUserScript(source: "window.launcherConfig = \(json);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(self, name: "splash")
        let web = WKWebView(frame: .zero, configuration: config)
        web.setValue(false, forKey: "drawsBackground"); web.underPageBackgroundColor = .clear
        web.navigationDelegate = self
        web.loadFileURL(html, allowingReadAccessTo: html.deletingLastPathComponent())
        return web
    }
    private func launch(_ saved: Preferences) {
        let resolvedPath = validApplication(saved.targetPath) != nil ? saved.targetPath : discoveredTarget()
        guard let url = validApplication(resolvedPath) else {
            showSettings(nil); setStatus("找不到 ChatGPT，请重新定位后保存。", error: true); return
        }
        if url.path != saved.targetPath {
            let relocated = Preferences(name: saved.name, targetPath: url.path, theme: saved.theme)
            preferences = relocated; targetPath = url.path
            if let data = try? JSONEncoder().encode(relocated) { try? data.write(to: support.appendingPathComponent("settings.json"), options: .atomic) }
        }
        cancelLaunch()
        guard let web = makeWeb(name: saved.name, mode: "launch", theme: saved.theme) else { showSettings(nil); setStatus("动画文件缺失，请重新安装完整应用。", error: true); return }
        isLaunching = true; opening = true; finishRequested = false; entering = false; target = nil
        session = UUID(); let token = session; events = []
        let screen = NSScreen.main ?? NSScreen.screens[0]
        let window = SplashWindow(contentRect: screen.visibleFrame, styleMask: [.borderless], backing: .buffered, defer: false)
        window.title = productName; window.isOpaque = false; window.backgroundColor = themeBackground(saved.theme)
        window.hasShadow = false; window.level = .floating; window.collectionBehavior = [.fullScreenAuxiliary]
        web.frame = window.contentView!.bounds; web.autoresizingMask = [.width, .height]; window.contentView?.addSubview(web)
        splashWindow = window; splashWeb = web; settingsWindow?.orderOut(nil)
        disposePreview()
        NSApp.setActivationPolicy(.accessory); focusSplash(); record("started")
        let options = NSWorkspace.OpenConfiguration(); options.activates = false
        NSWorkspace.shared.openApplication(at: url, configuration: options) { [weak self] app, error in
            DispatchQueue.main.async {
                guard let self, self.session == token, self.isLaunching else { return }
                self.opening = false; self.target = app
                guard app != nil, error == nil else {
                    self.record("target-open-failed"); self.showSettings(nil)
                    self.setStatus("无法打开应用：\(error?.localizedDescription ?? "未知错误")", error: true); return
                }
                self.record("target-opened")
                if self.finishRequested { self.finish() } else { self.focusSplash() }
            }
        }
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.isLaunching, self.session == token else { return }
            if self.opening { self.showSettings(nil); self.setStatus("应用启动时间过长，请检查应用后重试。", error: true) }
            else { self.record("animation-timeout"); self.finish() }
        }
        self.timeout = timeout; DispatchQueue.main.asyncAfter(deadline: .now() + 60, execute: timeout)
    }
    private func focusSplash() {
        guard isLaunching, !finishRequested else { return }
        NSApp.activate(ignoringOtherApps: true); splashWindow?.makeKeyAndOrderFront(nil)
        if let web = splashWeb { splashWindow?.makeFirstResponder(web) }
    }
    private func cancelLaunch() {
        session = UUID(); timeout?.cancel(); timeout = nil; isLaunching = false; opening = false
        splashWeb?.stopLoading(); splashWeb?.configuration.userContentController.removeScriptMessageHandler(forName: "splash")
        splashWindow?.orderOut(nil); splashWindow = nil; splashWeb = nil; target = nil
    }
    private func finish() {
        guard isLaunching else { return }
        finishRequested = true
        guard !opening else { return }
        guard let target, !target.isTerminated else {
            showSettings(nil); setStatus("目标应用已经退出，请重新启动。", error: true); return
        }
        target.activate(options: [.activateAllWindows])
        record(entering ? "automatic-complete" : "manual-complete")
        cancelLaunch(); NSApp.terminate(nil)
    }
    private func record(_ event: String) {
        events.append(["event": event, "time": Date().timeIntervalSince1970, "active": NSApp.isActive, "keyWindow": splashWindow?.isKeyWindow ?? false])
        if events.count > 40 { events.removeFirst() }
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        if let data = try? JSONSerialization.data(withJSONObject: events, options: [.sortedKeys]) { try? data.write(to: support.appendingPathComponent("launch-events.json"), options: .atomic) }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let event = message.body as? String else { return }
        if message.webView === previewWeb {
            if event == "complete" { setStatus("预览完成。喜欢的话，保存并启动即可。") }
            if event == "renderFailed" { setStatus("动画未能渲染，请重新预览或重启应用。", error: true) }
            return
        }
        guard message.webView === splashWeb, isLaunching else { return }
        switch event {
        case "loaded": record("animation-loaded"); focusSplash()
        case "waiting": record("breathing-started")
        case "entering":
            splashWindow?.backgroundColor = .clear
            entering = true; record("two-breaths-complete")
            target?.activate(options: [.activateAllWindows]); focusSplash()
        case "complete", "enterRequested": finish()
        case "cancel": showSettings(nil)
        case "renderFailed": showSettings(nil); setStatus("动画未能渲染，请重新预览或重启应用。", error: true)
        default: break
        }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { handleWebFailure(webView, error: error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { handleWebFailure(webView, error: error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { handleWebFailure(webView, error: NSError(domain: productName, code: 1, userInfo: [NSLocalizedDescriptionKey: "动画渲染进程已停止。"])) }
    private func handleWebFailure(_ webView: WKWebView, error: Error) {
        guard webView === splashWeb || webView === previewWeb else { return }
        if (error as NSError).code == NSURLErrorCancelled { return }
        if webView === splashWeb { showSettings(nil) } else { disposePreview() }
        setStatus("无法播放动画：\(error.localizedDescription)", error: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if isLaunching && !NSEvent.modifierFlags.contains(.option) { focusSplash() } else { showSettings(nil) }
        return true
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { !isLaunching }
    func applicationWillTerminate(_ notification: Notification) { if let keyMonitor { NSEvent.removeMonitor(keyMonitor) } }
}
let app = NSApplication.shared
let delegate = Launcher()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
