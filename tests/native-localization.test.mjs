import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Run the production models, without creating an AppKit application or touching user settings.
test('native language defaults, saved preferences and legacy settings', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const source = readFileSync(new URL('../native/Launcher.swift', import.meta.url), 'utf8');
  const models = source.slice(source.indexOf('enum AppLanguage:'), source.indexOf('final class SettingsContentView:'));
  const checks = String.raw`
func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() { fatalError(message) }
}
check(AppLanguage.system.resolved(preferredLanguages: ["zh-Hans-CN", "en-US"]) == .zh, "Chinese system locale")
check(AppLanguage.system.resolved(preferredLanguages: ["en-GB", "zh-Hans"]) == .en, "English system locale")
check(AppLanguage.system.resolved(preferredLanguages: ["fr-FR", "zh_CN"]) == .zh, "First supported locale")
check(AppLanguage.system.resolved(preferredLanguages: ["ja-JP"]) == .en, "Unsupported locale fallback")
check(AppLanguage.en.resolved(preferredLanguages: ["zh-CN"]) == .en, "English override")
check(AppLanguage.zh.resolved(preferredLanguages: ["en-US"]) == .zh, "Chinese override")
let legacy = Data(#"{"name":"Alex Chen","targetPath":"/Applications/ChatGPT.app","theme":"light"}"#.utf8)
let old = try JSONDecoder().decode(Preferences.self, from: legacy)
check(old.name == "Alex Chen" && old.theme == "light" && old.language == .system, "Preserve legacy settings")
let earliest = Data(#"{"name":"Mia","targetPath":"/Applications/ChatGPT.app"}"#.utf8)
let first = try JSONDecoder().decode(Preferences.self, from: earliest)
check(first.theme == "dark" && first.language == .system, "Legacy defaults")
for language in [AppLanguage.system, .zh, .en] {
    let saved = Preferences(name: "Mary Jane", targetPath: "/Applications/ChatGPT.app", theme: "light", language: language)
    let restored = try JSONDecoder().decode(Preferences.self, from: JSONEncoder().encode(saved))
    check(restored.name == saved.name && restored.targetPath == saved.targetPath && restored.theme == saved.theme && restored.language == language, "Round-trip saved language")
}
let unknown = Data(#"{"name":"Mia","targetPath":"/Applications/ChatGPT.app","language":"future-locale"}"#.utf8)
let fallback = try JSONDecoder().decode(Preferences.self, from: unknown)
check(fallback.language == .system, "Forward-compatible language fallback")
print("Native settings and language checks passed")
`;
  const result = spawnSync('/usr/bin/swift', ['-'], { input: `import Foundation\n${models}\n${checks}`, encoding: 'utf8', timeout: 100000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /checks passed/);
});
