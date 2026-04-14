(() => {
  const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;
  const SEPARATOR = '\n\n---\n\n';

  // Per-message override. Defaults to ON and auto-resets after every send.
  let perMessageEnabled = true;

  // Always read fresh state from the DOM — no caching, no race conditions.
  const getState = () => {
    const root = document.documentElement;
    const globallyEnabled = root.dataset.claudeDtEnabled !== '0';
    const instruction = root.dataset.claudeDtInstruction || DEFAULT_INSTRUCTION;
    return { enabled: globallyEnabled && perMessageEnabled, instruction };
  };

  // ---------- Floating chip UI ----------
  const injectChipStyles = () => {
    if (document.getElementById('claude-dt-chip-styles')) return;
    const style = document.createElement('style');
    style.id = 'claude-dt-chip-styles';
    style.textContent = `
      #claude-dt-chip {
        position: fixed; z-index: 2147483647;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 12px; margin: 0;
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
      }
      #claude-dt-chip .claude-dt-state {
        color: #4ade80; font-weight: 600; letter-spacing: .3px;
      }
      #claude-dt-chip.off { border-left-color: #e94560; opacity: .8; }
      #claude-dt-chip.off .claude-dt-dot { background: #e94560; }
      #claude-dt-chip.off .claude-dt-state { color: #e94560; }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const updateChipVisual = (chip) => {
    chip.classList.toggle('off', !perMessageEnabled);
    chip.setAttribute('aria-checked', perMessageEnabled ? 'true' : 'false');
    chip.querySelector('.claude-dt-state').textContent = perMessageEnabled ? 'ON' : 'OFF';
    chip.title = perMessageEnabled
      ? 'Deep Think is ON for this message (click or Cmd/Ctrl+Shift+D to skip)'
      : 'Deep Think is OFF for this message (click or Cmd/Ctrl+Shift+D to re-enable)';
  };

  const toggleChip = () => {
    perMessageEnabled = !perMessageEnabled;
    const chip = document.getElementById('claude-dt-chip');
    if (chip) updateChipVisual(chip);
  };

  const positionChip = (chip) => {
    const sendBtn = document.querySelector('button[aria-label*="Send" i], button[data-testid*="send" i]');
    if (sendBtn) {
      const r = sendBtn.getBoundingClientRect();
      // Sit just to the LEFT of the send button, vertically centered on it.
      const chipRect = chip.getBoundingClientRect();
      chip.style.left = Math.max(8, r.left - chipRect.width - 10) + 'px';
      chip.style.top = (r.top + r.height / 2 - chipRect.height / 2) + 'px';
      chip.style.right = 'auto';
      chip.style.bottom = 'auto';
    } else {
      chip.style.left = 'auto';
      chip.style.top = 'auto';
      chip.style.right = '20px';
      chip.style.bottom = '96px';
    }
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
      chip.append(dot, label, state);
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleChip();
      });
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

  // After any send we detect, auto-reset the override back to ON so the
  // user doesn't silently lose Deep Think on the *next* message.
  const scheduleResetAfterSend = () => {
    setTimeout(() => {
      if (!perMessageEnabled) {
        perMessageEnabled = true;
        const chip = document.getElementById('claude-dt-chip');
        if (chip) updateChipVisual(chip);
      }
    }, 500);
  };

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
    scheduleResetAfterSend();
  }, true);

  // Capture-phase Enter inside the editor
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const editor = e.target?.closest?.('[contenteditable="true"]');
    if (!editor) return;
    appendInstructionToEditor();
    scheduleResetAfterSend();
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
