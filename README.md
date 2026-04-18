# Claude Deep Think

**Stop copy-pasting "think step by step" into every Claude message.**

Claude Deep Think is a Chrome extension that automatically appends your custom reasoning instruction to every message you send on [claude.ai](https://claude.ai). Set it once, forget about it, get better responses.

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/claude-deep-think/npalkgfbneagpnndfiambnnfeaeccken)** (free)

---

## The problem

You ask Claude a question and get a surface-level answer. So you add "think step by step, consider tradeoffs, don't rush" to your message. Better response. But now you're pasting that same line into every message, every day.

Then you realize different tasks need different instructions. Deep reasoning for analysis. Concise and professional for emails. ELI5 for explanations. You end up maintaining a notes file of prompts and copy-pasting between them.

## The solution

A small chip sits in the bottom-right of claude.ai. It shows your active prompt profile and appends its instruction to every message automatically.

### Features

- **Up to 5 prompt profiles** - Create named presets like "Deep Reasoning", "Email Writer", "Code Reviewer", "ELI5", "Devil's Advocate"
- **One-click switching** - Profile circles right on the chip. Click any circle to switch instantly
- **Visible confirmation** - Your instruction appears in the sent message with a `---` separator, so you always know it's working
- **ON/OFF toggle** - Quick question that doesn't need deep thinking? One click to disable, one click to re-enable
- **Keyboard shortcut** - `Cmd/Ctrl+Shift+D` toggles from anywhere on the page
- **Zero telemetry** - No analytics, no tracking, no data leaves your browser. Everything is stored locally

### How it works

1. Install the extension
2. Visit [claude.ai](https://claude.ai) - the Deep Think chip appears in the bottom-right
3. Click the gear icon to create and manage your prompt profiles
4. Every message you send gets your active profile's instruction appended automatically

That's it.

---

## Install from source

If you prefer to run it yourself instead of the Chrome Web Store version:

```bash
git clone https://github.com/daiict218/claude-deep-think-ext.git
```

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the cloned `claude-deep-think-ext` folder
5. Visit [claude.ai](https://claude.ai) - the chip appears in the bottom-right

### Build the store-ready zip

```bash
./build.sh
# Produces dist/claude-deep-think-ext-v<version>.zip
```

---

## Privacy

- No data collection. No analytics. No telemetry.
- Your prompt profiles are stored locally in your browser via `chrome.storage.local`
- The only network traffic is your normal Claude message - the extension just appends text to it
- Permissions: `storage` (to save your profiles) + `https://claude.ai/*` (to inject the chip)
- Full privacy policy: [daiict218.github.io/claude-deep-think-ext/privacy.html](https://daiict218.github.io/claude-deep-think-ext/privacy.html)

---

## Contributing

Found a bug? Want a feature? [Open an issue](https://github.com/daiict218/claude-deep-think-ext/issues).

Want to contribute code? PRs are welcome. The codebase is small:

| File | What it does |
|---|---|
| `manifest.json` | Extension config - permissions, icons, content script registration |
| `content.js` | Bridge between Chrome storage and the page. Reads profiles, writes to DOM dataset |
| `injected.js` | Main world script. Renders the chip + popover, hooks the editor and fetch API |
| `popup.html` + `popup.js` | Toolbar popup - master toggle + active profile display |
| `build.sh` | Packages the extension into a clean zip for Chrome Web Store submission |

### Running locally

1. Clone the repo
2. Load unpacked in `chrome://extensions`
3. Make changes to any `.js` or `.html` file
4. Click the reload icon on the extension card in `chrome://extensions`
5. Hard-refresh your claude.ai tab (`Cmd+Shift+R`)

---

## License

[MIT](LICENSE)

---

Built with [Claude Code](https://claude.ai/code).
