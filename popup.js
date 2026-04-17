const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;

const toggle = document.getElementById('toggle');
const dot = document.getElementById('statusDot');
const profileNameEl = document.getElementById('profileName');
const profileInstructionEl = document.getElementById('profileInstruction');

const renderProfile = (profilesRaw) => {
  try {
    const profiles = JSON.parse(profilesRaw);
    if (profiles && Array.isArray(profiles.items)) {
      const active = profiles.items.find(p => p.id === profiles.activeId);
      if (active) {
        profileNameEl.textContent = active.name;
        profileInstructionEl.textContent = active.instruction;
        return;
      }
    }
  } catch {}
  profileNameEl.textContent = 'Deep Reasoning';
  profileInstructionEl.textContent = DEFAULT_INSTRUCTION;
};

chrome.storage.local.get(['enabled', 'profiles'], (data) => {
  const enabled = data.enabled !== false;
  toggle.checked = enabled;
  dot.classList.toggle('active', enabled);
  renderProfile(data.profiles);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  dot.classList.toggle('active', enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('enabled' in changes) {
    const enabled = changes.enabled.newValue !== false;
    toggle.checked = enabled;
    dot.classList.toggle('active', enabled);
  }
  if ('profiles' in changes) {
    renderProfile(changes.profiles.newValue);
  }
});
