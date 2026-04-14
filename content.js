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

  // Now inject the fetch/editor interceptor
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
});

// Live updates from popup: rewrite the dataset so injected.js sees
// the new value on the very next send — no postMessage dance.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.storage.local.get(['enabled', 'instruction'], (data) => {
    const enabled = data.enabled !== false;
    syncState(enabled, data.instruction);
    console.log('[Claude Deep Think] state synced', {
      enabled,
      instructionPreview: (data.instruction || DEFAULT_INSTRUCTION).slice(0, 60) + '...',
    });
  });

  if ('enabled' in changes) {
    showRefreshBanner(changes.enabled.newValue !== false);
  }
});

function showRefreshBanner(enabled) {
  const existing = document.getElementById('claude-dt-refresh-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'claude-dt-refresh-banner';
  banner.style.cssText = [
    'position:fixed', 'top:16px', 'right:16px', 'z-index:2147483647',
    'background:#0f0f1a', 'color:#e0e0e0', 'padding:12px 14px',
    'border:1px solid #2a2a3e',
    `border-left:3px solid ${enabled ? '#4ade80' : '#e94560'}`,
    'border-radius:8px', 'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
    "font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    'max-width:320px', 'display:flex', 'gap:10px', 'align-items:center'
  ].join(';');

  const msg = document.createElement('span');
  msg.style.cssText = 'flex:1';
  msg.textContent = `Claude Deep Think ${enabled ? 'enabled' : 'disabled'}. Refresh the page to apply.`;

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh';
  refreshBtn.style.cssText = 'background:#4ade80;color:#0f0f1a;border:none;border-radius:6px;padding:6px 10px;font:600 12px inherit;cursor:pointer';
  refreshBtn.addEventListener('click', () => location.reload());

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '×';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.style.cssText = 'background:transparent;color:#888;border:none;cursor:pointer;font:16px inherit;padding:0 4px';
  dismissBtn.addEventListener('click', () => banner.remove());

  banner.append(msg, refreshBtn, dismissBtn);
  (document.body || document.documentElement).appendChild(banner);
}
