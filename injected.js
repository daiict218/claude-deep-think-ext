(() => {
  const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;
  const SEPARATOR = '\n\n---\n\n';

  // Single source of truth: document.documentElement.dataset.claudeDtEnabled,
  // persisted to chrome.storage.local by content.js. Popup toggle and chip
  // both read/write this same flag, so they are always in sync.
  const isEnabled = () =>
    document.documentElement.dataset.claudeDtEnabled !== '0';

  const setEnabled = (value) => {
    document.documentElement.dataset.claudeDtEnabled = value ? '1' : '0';
    window.postMessage({ type: 'CLAUDE_DT_TOGGLE', enabled: value }, '*');
  };

  const getState = () => {
    const root = document.documentElement;
    const instruction = root.dataset.claudeDtInstruction || DEFAULT_INSTRUCTION;
    return { enabled: isEnabled(), instruction };
  };

  // ---------- Floating chip UI ----------
  const injectChipStyles = () => {
    if (document.getElementById('claude-dt-chip-styles')) return;
    const style = document.createElement('style');
    style.id = 'claude-dt-chip-styles';
    style.textContent = `
      #claude-dt-chip {
        position: fixed; z-index: 2147483647;
        display: inline-flex; align-items: center; gap: 8px;
        padding: 7px 12px 7px 12px; margin: 0;
        background: #1a1a2e; color: #e0e0e0;
        border: 1px solid #2a2a3e;
        border-left: 2px solid #4ade80;
        border-radius: 999px;
        font: 500 11px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer; user-select: none;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        transition: border-color .15s ease, opacity .15s ease, transform .15s ease;
      }
      #claude-dt-chip:hover { transform: translateY(-1px); }
      #claude-dt-chip:focus-visible {
        outline: 2px solid #4ade80; outline-offset: 2px;
      }
      #claude-dt-chip .claude-dt-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #4ade80;
        transition: background .15s ease;
      }
      #claude-dt-chip .claude-dt-state {
        color: #4ade80; font-weight: 600; letter-spacing: .3px;
        min-width: 22px; text-align: right;
        transition: color .15s ease;
      }
      #claude-dt-chip .claude-dt-switch {
        position: relative;
        width: 26px; height: 14px;
        border-radius: 7px;
        background: #1a3a2a;
        transition: background .15s ease;
        flex-shrink: 0;
      }
      #claude-dt-chip .claude-dt-switch::after {
        content: '';
        position: absolute;
        top: 2px; left: 2px;
        width: 10px; height: 10px;
        border-radius: 50%;
        background: #4ade80;
        transform: translateX(12px);
        transition: transform .18s ease, background .15s ease;
      }
      #claude-dt-chip.off { border-left-color: #e94560; opacity: .85; }
      #claude-dt-chip.off .claude-dt-dot { background: #e94560; }
      #claude-dt-chip.off .claude-dt-state { color: #e94560; }
      #claude-dt-chip.off .claude-dt-switch { background: #3a1f26; }
      #claude-dt-chip.off .claude-dt-switch::after {
        transform: translateX(0);
        background: #e94560;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const updateChipVisual = (chip) => {
    const on = isEnabled();
    chip.classList.toggle('off', !on);
    chip.setAttribute('aria-checked', on ? 'true' : 'false');
    chip.querySelector('.claude-dt-state').textContent = on ? 'ON' : 'OFF';
    chip.title = on
      ? 'Deep Think is ON (click or Cmd/Ctrl+Shift+D to turn off)'
      : 'Deep Think is OFF (click or Cmd/Ctrl+Shift+D to turn on)';
  };

  const toggleChip = () => {
    setEnabled(!isEnabled());
    const chip = document.getElementById('claude-dt-chip');
    if (chip) updateChipVisual(chip);
  };

  // Pinned to the bottom-right corner of the viewport. No anchoring to
  // claude.ai's DOM — nothing to jump to.
  const positionChip = (chip) => {
    chip.style.left = 'auto';
    chip.style.top = 'auto';
    chip.style.right = '20px';
    chip.style.bottom = '96px';
  };

  const ensureChip = () => {
    injectChipStyles();
    let chip = document.getElementById('claude-dt-chip');
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'claude-dt-chip';
      chip.type = 'button';
      chip.setAttribute('role', 'switch');
      chip.setAttribute('aria-checked', 'true');
      chip.setAttribute('aria-label', 'Deep Think instruction for the next message');
      const dot = document.createElement('span');
      dot.className = 'claude-dt-dot';
      const label = document.createElement('span');
      label.className = 'claude-dt-label';
      label.textContent = 'Deep Think';
      const state = document.createElement('span');
      state.className = 'claude-dt-state';
      state.textContent = 'ON';
      const sw = document.createElement('span');
      sw.className = 'claude-dt-switch';
      sw.setAttribute('aria-hidden', 'true');
      chip.append(dot, label, state, sw);
      const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggleChip();
      };
      chip.addEventListener('click', handleToggle);
      chip.addEventListener('mousedown', (e) => e.stopPropagation());
      (document.body || document.documentElement).appendChild(chip);
    }
    updateChipVisual(chip);
    positionChip(chip);
  };

  // Reposition on resize and periodically (cheap — single query + style writes)
  // to track claude.ai's layout changes without a heavy MutationObserver.
  window.addEventListener('resize', () => {
    const chip = document.getElementById('claude-dt-chip');
    if (chip) positionChip(chip);
  });
  setInterval(ensureChip, 1000);
  // Kick off once the page has a body
  const bootChip = () => {
    if (document.body) ensureChip();
    else setTimeout(bootChip, 100);
  };
  bootChip();

  // Hotkey: Cmd/Ctrl+Shift+D toggles the per-message override
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      e.stopPropagation();
      toggleChip();
    }
  }, true);

  // Re-sync chip visuals whenever content.js writes a new value to the
  // dataset (e.g. after a storage roundtrip on another tab).
  const chipObserver = new MutationObserver(() => {
    const chip = document.getElementById('claude-dt-chip');
    if (chip) updateChipVisual(chip);
  });
  chipObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-claude-dt-enabled'],
  });

  const findEditor = () => {
    return document.querySelector('div.ProseMirror[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"].ProseMirror')
      || document.querySelector('div[contenteditable="true"]');
  };

  const appendInstructionToEditor = () => {
    const { enabled, instruction } = getState();
    if (!enabled) return false;
    const editor = findEditor();
    if (!editor) {
      console.log('[Claude Deep Think] editor not found');
      return false;
    }
    const currentText = editor.innerText || '';
    if (!currentText.trim()) return false;
    if (currentText.includes(instruction.trim())) return false;

    editor.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    const ok = document.execCommand('insertText', false, SEPARATOR + instruction);
    if (!ok) {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: SEPARATOR + instruction,
        bubbles: true,
        cancelable: true,
      }));
    }
    console.log('[Claude Deep Think] appended to editor:', instruction.slice(0, 50) + '...');
    return true;
  };

  // Capture-phase click on send button
  document.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('button[aria-label*="Send" i], button[data-testid*="send" i]');
    if (!btn) return;
    appendInstructionToEditor();
  }, true);

  // Capture-phase Enter inside the editor
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const editor = e.target?.closest?.('[contenteditable="true"]');
    if (!editor) return;
    appendInstructionToEditor();
  }, true);

  // Fetch fallback: if the editor-append missed for any reason, still
  // mutate the outgoing request body so the instruction reaches Claude.
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const { enabled, instruction } = getState();
    if (!enabled) return originalFetch.apply(this, args);

    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const isClaudeAPI =
      (url.includes('/api/') && url.includes('/completion')) ||
      (url.includes('/api/') && url.includes('/chat') && config?.method?.toUpperCase() === 'POST');

    if (isClaudeAPI && config?.body) {
      try {
        const body = JSON.parse(config.body);
        const marker = instruction.trim();
        const suffix = SEPARATOR + instruction;

        if (typeof body.prompt === 'string' && body.prompt.length > 0 && !body.prompt.includes(marker)) {
          body.prompt = body.prompt + suffix;
        }

        if (Array.isArray(body.messages)) {
          const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg && typeof lastUserMsg.content === 'string' && !lastUserMsg.content.includes(marker)) {
            lastUserMsg.content = lastUserMsg.content + suffix;
          }
          if (lastUserMsg && Array.isArray(lastUserMsg.content)) {
            const lastTextBlock = [...lastUserMsg.content].reverse().find(b => b.type === 'text');
            if (lastTextBlock && typeof lastTextBlock.text === 'string' && !lastTextBlock.text.includes(marker)) {
              lastTextBlock.text = lastTextBlock.text + suffix;
            }
          }
        }

        config.body = JSON.stringify(body);
      } catch (e) {
        // Don't break the request if parsing fails
      }
    }

    return originalFetch.apply(this, [resource, config]);
  };

  console.log('[Claude Deep Think] active. Reading state from DOM on every send.');
})();
