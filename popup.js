const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;

const toggle = document.getElementById('toggle');
const dot = document.getElementById('statusDot');
const textarea = document.getElementById('instruction');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

const flash = (msg, isError = false) => {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
  statusEl.classList.add('show');
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    statusEl.classList.remove('show');
  }, 2000);
};

chrome.storage.local.get(['enabled', 'instruction'], (data) => {
  const enabled = data.enabled !== false;
  toggle.checked = enabled;
  dot.classList.toggle('active', enabled);

  if (typeof data.instruction === 'string' && data.instruction.trim().length > 0) {
    textarea.value = data.instruction;
  }
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  dot.classList.toggle('active', enabled);
  // content.js listens via chrome.storage.onChanged — no direct message needed.
});

saveBtn.addEventListener('click', () => {
  const value = textarea.value.trim();
  if (!value) {
    flash('Cannot save empty instruction', true);
    return;
  }
  chrome.storage.local.set({ instruction: value }, () => {
    if (chrome.runtime.lastError) {
      flash('Save failed: ' + chrome.runtime.lastError.message, true);
      return;
    }
    const original = saveBtn.textContent;
    saveBtn.textContent = '✓ Saved';
    saveBtn.classList.add('saved');
    textarea.classList.add('flash-save');
    flash('Instruction saved — refresh claude.ai to apply');
    setTimeout(() => {
      saveBtn.textContent = original;
      saveBtn.classList.remove('saved');
      textarea.classList.remove('flash-save');
    }, 1500);
  });
});

resetBtn.addEventListener('click', () => {
  textarea.value = DEFAULT_INSTRUCTION;
  textarea.focus();
});
