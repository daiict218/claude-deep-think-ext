// Bridge between chrome.storage and the page's main world.
// State is written to <html data-*> attributes so injected.js can
// read the latest value synchronously on every send — no caching.

const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;

const syncState = (enabled, instruction) => {
  const root = document.documentElement;
  root.dataset.claudeDtEnabled = enabled ? '1' : '0';
  root.dataset.claudeDtInstruction = (typeof instruction === 'string' && instruction.trim().length > 0)
    ? instruction
    : DEFAULT_INSTRUCTION;
};

// Initial load: seed state BEFORE injected.js runs
chrome.storage.local.get(['enabled', 'instruction'], (data) => {
  const enabled = data.enabled !== false;
  syncState(enabled, data.instruction);

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
});

// Live updates from popup, chip, or another tab.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.storage.local.get(['enabled', 'instruction'], (data) => {
    syncState(data.enabled !== false, data.instruction);
  });
});

// Chip toggle from the main world (injected.js) → persist to storage.
// Both the popup toggle and the chip now write to the same `enabled` key
// so they are always in sync.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.type !== 'CLAUDE_DT_TOGGLE') return;
  chrome.storage.local.set({ enabled: !!data.enabled });
});

