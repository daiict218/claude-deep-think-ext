// Bridge between chrome.storage and the page's main world.
// State is written to <html data-*> attributes so injected.js can
// read the latest value synchronously — no caching.

const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;

const DEFAULT_PROFILES = JSON.stringify({
  activeId: 'profile-default',
  items: [
    { id: 'profile-default', name: 'Deep Reasoning', instruction: DEFAULT_INSTRUCTION }
  ]
});

const resolveInstruction = (profilesRaw) => {
  try {
    const profiles = JSON.parse(profilesRaw);
    if (profiles && Array.isArray(profiles.items)) {
      const active = profiles.items.find(p => p.id === profiles.activeId);
      if (active && active.instruction && active.instruction.trim()) {
        return active.instruction;
      }
    }
  } catch {}
  return DEFAULT_INSTRUCTION;
};

const syncState = (enabled, profilesRaw) => {
  const root = document.documentElement;
  root.dataset.claudeDtEnabled = enabled ? '1' : '0';
  root.dataset.claudeDtProfiles = profilesRaw || DEFAULT_PROFILES;
  root.dataset.claudeDtInstruction = resolveInstruction(profilesRaw);
};

// Migrate legacy `instruction` key → profiles format (one-time).
const migrateIfNeeded = (data, callback) => {
  if (data.profiles) {
    callback(data.profiles);
    return;
  }
  const instruction = (typeof data.instruction === 'string' && data.instruction.trim())
    ? data.instruction
    : DEFAULT_INSTRUCTION;
  const profiles = JSON.stringify({
    activeId: 'profile-default',
    items: [{ id: 'profile-default', name: 'Deep Reasoning', instruction }]
  });
  chrome.storage.local.set({ profiles }, () => {
    chrome.storage.local.remove('instruction');
    callback(profiles);
  });
};

// Initial load: seed state BEFORE injected.js runs.
chrome.storage.local.get(['enabled', 'profiles', 'instruction'], (data) => {
  const enabled = data.enabled !== false;
  migrateIfNeeded(data, (profilesRaw) => {
    syncState(enabled, profilesRaw);
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  });
});

// Live updates from popup, chip, popover, or another tab.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.storage.local.get(['enabled', 'profiles'], (data) => {
    syncState(data.enabled !== false, data.profiles);
  });
});

// Messages from the main world (injected.js) → persist to storage.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'CLAUDE_DT_TOGGLE') {
    chrome.storage.local.set({ enabled: !!data.enabled });
  }
  if (data.type === 'CLAUDE_DT_SET_PROFILES') {
    chrome.storage.local.set({ profiles: data.profiles });
  }
});
