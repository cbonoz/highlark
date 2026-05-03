# Highlark - Permissions Justification

For the Chrome Web Store listing, use the following justifications when asked about permissions:

## Required Permissions

### `activeTab`
**Justification:** Required to capture screenshots of the currently active tab you're viewing. This allows Highlark to take a snapshot of the exact content you see on your screen.

### `storage`
**Justification:** Required to store your annotations and screenshots locally in your browser using IndexedDB. All your data remains 100% on your device - nothing is ever uploaded to any server.

### `windows`
**Justification:** Required to open the annotation editor window after capturing a screenshot. This creates the popup window where you can annotate your screenshots with text, drawings, and other tools.

### `downloads`
**Justification:** Required to allow you to download your annotated screenshots to your computer and access the downloads folder through the extension interface.

---

## Removed Permissions

The following permissions were removed to minimize review requirements while maintaining full functionality:

- ~~`scripting`~~ - Removed: Not needed. The extension only uses built-in Chrome APIs.
- ~~`<all_urls>` host permission~~ - Removed: Screenshot capture only requires `activeTab` permission, which is minimal and low-risk.
- ~~Content scripts~~ - Removed: Unused code. All functionality works with popup + service worker architecture.

## Privacy Assurance

All features work **100% offline**:
- ✓ Screenshots and annotations never leave your computer
- ✓ No data is uploaded to external servers
- ✓ No tracking or analytics
- ✓ All processing happens locally in your browser
- ✓ Open source - review the code on GitHub
