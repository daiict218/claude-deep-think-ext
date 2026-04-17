(() => {
  const DEFAULT_INSTRUCTION = `Always reason thoroughly and deeply. Treat every request as complex unless I explicitly say otherwise. Never optimize for brevity at the expense of quality. Think step-by-step, consider tradeoffs, and provide comprehensive analysis.`;
  const SEPARATOR = '\n\n---\n\n';
  const MAX_PROFILES = 5;

  // ── State helpers ──────────────────────────────────────────────────

  const isEnabled = () =>
    document.documentElement.dataset.claudeDtEnabled !== '0';

  const setEnabled = (value) => {
    document.documentElement.dataset.claudeDtEnabled = value ? '1' : '0';
    window.postMessage({ type: 'CLAUDE_DT_TOGGLE', enabled: value }, window.location.origin);
  };

  const getProfiles = () => {
    try {
      const raw = document.documentElement.dataset.claudeDtProfiles;
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.items) && p.items.length > 0) return p;
    } catch {}
    return {
      activeId: 'profile-default',
      items: [{ id: 'profile-default', name: 'Deep Reasoning', instruction: DEFAULT_INSTRUCTION }]
    };
  };

  const setProfiles = (profilesObj) => {
    const raw = JSON.stringify(profilesObj);
    document.documentElement.dataset.claudeDtProfiles = raw;
    const active = profilesObj.items.find(p => p.id === profilesObj.activeId);
    if (active) {
      document.documentElement.dataset.claudeDtInstruction = active.instruction;
    }
    window.postMessage({ type: 'CLAUDE_DT_SET_PROFILES', profiles: raw }, window.location.origin);
  };

  const generateId = () => 'profile-' + Date.now();

  const getState = () => ({
    enabled: isEnabled(),
    instruction: document.documentElement.dataset.claudeDtInstruction || DEFAULT_INSTRUCTION,
  });

  // ── Styles ─────────────────────────────────────────────────────────

  const injectStyles = () => {
    if (document.getElementById('claude-dt-styles')) return;
    const style = document.createElement('style');
    style.id = 'claude-dt-styles';
    style.textContent = `
      /* ── Chip: two-zone layout ── */
      #claude-dt-chip {
        position: fixed; z-index: 2147483647;
        right: 20px; bottom: 96px;
        display: flex; align-items: stretch;
        background: #16162b; border: 1px solid #333;
        border-radius: 14px; overflow: hidden;
        box-shadow: 0 6px 24px rgba(0,0,0,0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        user-select: none;
      }
      #claude-dt-chip .cdt-zone-profile {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 16px; cursor: pointer;
        border-right: 1px solid #333;
        transition: background .12s;
      }
      #claude-dt-chip .cdt-zone-profile:hover { background: #1f1f3a; }
      #claude-dt-chip .cdt-zone-profile:focus-visible { outline: 2px solid #4ade80; outline-offset: -2px; }
      #claude-dt-chip .cdt-zone-toggle {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 14px; cursor: pointer;
        transition: background .12s;
      }
      #claude-dt-chip .cdt-zone-toggle:hover { background: #1f1f3a; }
      #claude-dt-chip .cdt-zone-toggle:focus-visible { outline: 2px solid #4ade80; outline-offset: -2px; }
      #claude-dt-chip .cdt-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: #4ade80; flex-shrink: 0; transition: background .15s;
      }
      #claude-dt-chip .cdt-profile-label {
        font-size: 14px; font-weight: 600; color: #fff;
        max-width: 160px; overflow: hidden; text-overflow: ellipsis;
        white-space: nowrap; line-height: 1.2;
      }
      #claude-dt-chip .cdt-circles {
        display: flex; align-items: center; gap: 4px;
        border-left: 1px solid #333; padding-left: 10px; margin-left: 2px;
      }
      #claude-dt-chip .cdt-circle {
        width: 26px; height: 26px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 700; letter-spacing: .3px;
        color: #999; background: #222240;
        cursor: pointer; transition: all .15s; flex-shrink: 0;
        border: 2px solid transparent; text-transform: uppercase;
      }
      #claude-dt-chip .cdt-circle:hover { background: #2a2a50; color: #ddd; transform: scale(1.1); }
      #claude-dt-chip .cdt-circle.active {
        background: rgba(74, 222, 128, 0.15); color: #4ade80;
        border-color: #4ade80;
      }
      #claude-dt-chip .cdt-circle.active:hover { background: rgba(74, 222, 128, 0.25); }
      #claude-dt-chip .cdt-gear {
        width: 26px; height: 26px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; color: #777; background: transparent;
        cursor: pointer; transition: all .15s; flex-shrink: 0;
        border: none; margin-left: 2px;
      }
      #claude-dt-chip .cdt-gear:hover { color: #fff; background: #2a2a50; }

      /* ── Description bar below chip ── */
      #claude-dt-desc {
        position: fixed; z-index: 2147483646;
        right: 20px; bottom: 68px;
        /* width is synced to chip width via JS */
        padding: 7px 16px;
        background: #16162b;
        border: 1px solid #333;
        border-top: none;
        border-radius: 0 0 14px 14px;
        font: italic 12px/1.4 'Georgia', 'Times New Roman', serif;
        color: #b0b0cc;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity .2s;
        letter-spacing: .2px;
      }
      #claude-dt-desc.hidden { opacity: 0; }
      #claude-dt-chip .cdt-on-off {
        font-size: 13px; font-weight: 700; color: #4ade80;
        letter-spacing: .3px; min-width: 26px; text-align: center;
        transition: color .15s;
      }
      #claude-dt-chip .cdt-switch {
        position: relative; width: 32px; height: 18px;
        border-radius: 9px; background: #1a3a2a;
        transition: background .15s; flex-shrink: 0;
      }
      #claude-dt-chip .cdt-switch::after {
        content: ''; position: absolute; top: 3px; left: 3px;
        width: 12px; height: 12px; border-radius: 50%;
        background: #4ade80; transform: translateX(14px);
        transition: transform .18s, background .15s;
      }
      /* OFF state */
      #claude-dt-chip.off .cdt-dot { background: #e94560; }
      #claude-dt-chip.off .cdt-on-off { color: #e94560; }
      #claude-dt-chip.off .cdt-switch { background: #3a1f26; }
      #claude-dt-chip.off .cdt-switch::after { transform: translateX(0); background: #e94560; }

      /* ── Popover ── */
      #claude-dt-popover {
        position: fixed; z-index: 2147483647;
        right: 20px; bottom: 150px;
        width: 340px;
        background: #141428; border: 1px solid #333;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e0e0e0; overflow: hidden;
      }
      #claude-dt-popover .cdt-pop-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 18px; border-bottom: 1px solid #282840;
      }
      #claude-dt-popover .cdt-pop-title {
        font-size: 15px; font-weight: 700; color: #fff;
      }
      #claude-dt-popover .cdt-pop-count {
        font-size: 12px; color: #999; font-weight: 500;
        background: #1e1e36; padding: 2px 8px; border-radius: 10px;
      }
      #claude-dt-popover .cdt-pop-list { padding: 6px 0; max-height: 340px; overflow-y: auto; }

      /* ── Profile item ── */
      #claude-dt-popover .cdt-p-item {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 12px 18px; cursor: pointer;
        transition: background .1s; position: relative;
        border-left: 3px solid transparent;
      }
      #claude-dt-popover .cdt-p-item:hover { background: #1c1c38; }
      #claude-dt-popover .cdt-p-item.active {
        background: #132413;
        border-left-color: #4ade80;
      }
      #claude-dt-popover .cdt-p-item.editing {
        background: #1a1a30;
        border-left-color: #60a5fa;
      }
      #claude-dt-popover .cdt-p-item.active.editing {
        background: #132413;
        border-left-color: #4ade80;
      }
      #claude-dt-popover .cdt-p-radio {
        width: 14px; height: 14px; border-radius: 50%;
        border: 2px solid #555; flex-shrink: 0;
        margin-top: 2px; transition: .15s;
      }
      #claude-dt-popover .cdt-p-item.active .cdt-p-radio {
        border-color: #4ade80; background: #4ade80;
      }
      #claude-dt-popover .cdt-p-info { flex: 1; min-width: 0; }
      #claude-dt-popover .cdt-p-name {
        font-size: 14px; font-weight: 600; color: #fff;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      #claude-dt-popover .cdt-p-preview {
        font-size: 12px; color: #999; margin-top: 4px; line-height: 1.4;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      #claude-dt-popover .cdt-p-actions {
        display: flex; gap: 4px; flex-shrink: 0; margin-top: 2px;
      }
      #claude-dt-popover .cdt-p-btn {
        width: 28px; height: 28px; border: none; border-radius: 6px;
        background: #1e1e36; color: #999; cursor: pointer;
        font-size: 13px; display: flex; align-items: center;
        justify-content: center; transition: .12s;
      }
      #claude-dt-popover .cdt-p-btn:hover { background: #2e2e4a; color: #fff; }
      #claude-dt-popover .cdt-p-btn.delete:hover { background: #3a1a1a; color: #e94560; }

      /* ── Footer ── */
      #claude-dt-popover .cdt-pop-footer { padding: 12px 18px; border-top: 1px solid #282840; }
      #claude-dt-popover .cdt-add-btn {
        width: 100%; padding: 11px; border: 1px dashed #444;
        background: transparent; color: #bbb; border-radius: 8px;
        cursor: pointer; font: 600 13px -apple-system, sans-serif;
        text-align: center; transition: .15s;
      }
      #claude-dt-popover .cdt-add-btn:hover { border-color: #4ade80; color: #4ade80; background: #0f1f0f; }
      #claude-dt-popover .cdt-add-btn:disabled {
        opacity: .35; cursor: default; border-color: #282840; color: #666;
      }
      #claude-dt-popover .cdt-add-btn:disabled:hover { background: transparent; color: #666; border-color: #282840; }

      /* ── Inline editor ── */
      #claude-dt-popover .cdt-editor { padding: 16px 18px; border-top: 1px solid #282840; }
      #claude-dt-popover .cdt-editor-title {
        font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 12px;
      }
      #claude-dt-popover .cdt-editor input,
      #claude-dt-popover .cdt-editor textarea {
        width: 100%; padding: 10px 12px; margin-bottom: 10px;
        background: #0d0d1a; color: #eee; border: 1px solid #333;
        border-radius: 8px; font: 13px/1.5 -apple-system, sans-serif;
        outline: none; resize: vertical;
      }
      #claude-dt-popover .cdt-editor input:focus,
      #claude-dt-popover .cdt-editor textarea:focus { border-color: #4ade80; box-shadow: 0 0 0 2px rgba(74,222,128,0.15); }
      #claude-dt-popover .cdt-editor input { font-weight: 600; font-size: 14px; }
      #claude-dt-popover .cdt-editor textarea { min-height: 100px; font-size: 12px; }
      #claude-dt-popover .cdt-editor-btns {
        display: flex; gap: 8px; justify-content: flex-end;
      }
      #claude-dt-popover .cdt-btn {
        padding: 9px 20px; border: none; border-radius: 8px;
        font: 600 13px -apple-system, sans-serif; cursor: pointer; transition: .15s;
      }
      #claude-dt-popover .cdt-btn-cancel { background: #2a2a3e; color: #ccc; }
      #claude-dt-popover .cdt-btn-cancel:hover { background: #3a3a4e; }
      #claude-dt-popover .cdt-btn-save { background: #4ade80; color: #0f0f1a; }
      #claude-dt-popover .cdt-btn-save:hover { background: #22c55e; }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  // ── Chip ───────────────────────────────────────────────────────────

  const getInitials = (name) => {
    if (!name) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const updateChipVisual = (chip) => {
    const on = isEnabled();
    chip.classList.toggle('off', !on);

    const profiles = getProfiles();
    const active = profiles.items.find(p => p.id === profiles.activeId);

    const nameEl = chip.querySelector('.cdt-profile-label');
    if (nameEl && active) nameEl.textContent = active.name;

    const onOffEl = chip.querySelector('.cdt-on-off');
    if (onOffEl) onOffEl.textContent = on ? 'ON' : 'OFF';

    // Update description bar — match chip width, show instruction preview
    const descEl = document.getElementById('claude-dt-desc');
    if (descEl) {
      if (active && on) {
        const instr = active.instruction || '';
        const preview = instr.slice(0, 100);
        descEl.textContent = '\u201C' + preview + (preview.length < instr.length ? '...' : '') + '\u201D';
        descEl.classList.remove('hidden');
        // Sync width to chip
        const chipRect = chip.getBoundingClientRect();
        descEl.style.width = chipRect.width + 'px';
        chip.style.borderRadius = '14px 14px 0 0';
      } else {
        descEl.classList.add('hidden');
        chip.style.borderRadius = '14px';
      }
    }

    // Rebuild profile circles
    const circlesEl = chip.querySelector('.cdt-circles');
    if (circlesEl && profiles.items.length > 1) {
      while (circlesEl.firstChild) circlesEl.firstChild.remove();
      profiles.items.forEach(p => {
        const circle = document.createElement('span');
        circle.className = 'cdt-circle' + (p.id === profiles.activeId ? ' active' : '');
        circle.textContent = getInitials(p.name);
        circle.title = p.name;
        circle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (p.id !== profiles.activeId) {
            const updated = { ...profiles, activeId: p.id };
            setProfiles(updated);
          }
        });
        circlesEl.appendChild(circle);
      });
      circlesEl.style.display = '';
    } else if (circlesEl) {
      // Only 1 profile — hide circles, no need to switch
      while (circlesEl.firstChild) circlesEl.firstChild.remove();
      circlesEl.style.display = 'none';
    }
  };

  const ensureChip = () => {
    injectStyles();
    let chip = document.getElementById('claude-dt-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'claude-dt-chip';

      // ── Left zone: profile selector ──
      const zoneProfile = document.createElement('div');
      zoneProfile.className = 'cdt-zone-profile';
      zoneProfile.setAttribute('role', 'button');
      zoneProfile.setAttribute('aria-label', 'Select prompt profile');
      zoneProfile.tabIndex = 0;

      const dot = document.createElement('span');
      dot.className = 'cdt-dot';

      const profileLabel = document.createElement('span');
      profileLabel.className = 'cdt-profile-label';
      profileLabel.textContent = '';

      const circles = document.createElement('span');
      circles.className = 'cdt-circles';

      const gear = document.createElement('span');
      gear.className = 'cdt-gear';
      gear.textContent = '\u2699';
      gear.title = 'Manage profiles';
      gear.setAttribute('role', 'button');
      gear.setAttribute('aria-label', 'Manage prompt profiles');
      gear.tabIndex = 0;
      gear.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        togglePopover();
      });
      gear.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePopover(); }
      });

      zoneProfile.append(dot, profileLabel, circles, gear);
      zoneProfile.addEventListener('mousedown', (e) => e.stopPropagation());
      // Clicking the zone background (not a circle or gear) also opens popover
      zoneProfile.addEventListener('click', (e) => {
        if (e.target === zoneProfile || e.target === dot || e.target === profileLabel) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          togglePopover();
        }
      });

      // ── Right zone: ON/OFF toggle ──
      const zoneToggle = document.createElement('div');
      zoneToggle.className = 'cdt-zone-toggle';
      zoneToggle.setAttribute('role', 'switch');
      zoneToggle.setAttribute('aria-label', 'Toggle Deep Think on or off');
      zoneToggle.tabIndex = 0;

      const onOff = document.createElement('span');
      onOff.className = 'cdt-on-off';
      onOff.textContent = 'ON';

      const sw = document.createElement('span');
      sw.className = 'cdt-switch';

      zoneToggle.append(onOff, sw);
      zoneToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setEnabled(!isEnabled());
        updateChipVisual(chip);
      });
      zoneToggle.addEventListener('mousedown', (e) => e.stopPropagation());
      zoneToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEnabled(!isEnabled());
          updateChipVisual(chip);
        }
      });

      chip.append(zoneProfile, zoneToggle);
      (document.body || document.documentElement).appendChild(chip);
    }

    // Ensure description bar exists
    if (!document.getElementById('claude-dt-desc')) {
      const desc = document.createElement('div');
      desc.id = 'claude-dt-desc';
      (document.body || document.documentElement).appendChild(desc);
    }

    updateChipVisual(chip);
  };

  setInterval(ensureChip, 2000);
  const bootChip = () => {
    if (document.body) ensureChip();
    else setTimeout(bootChip, 100);
  };
  bootChip();

  // Hotkey: Cmd/Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      e.stopPropagation();
      setEnabled(!isEnabled());
      const chip = document.getElementById('claude-dt-chip');
      if (chip) updateChipVisual(chip);
    }
  }, true);

  // ── Popover ────────────────────────────────────────────────────────

  let editingProfileId = null;
  let _outsideHandler = null;
  let _escHandler = null;

  const _cleanupListeners = () => {
    if (_outsideHandler) {
      document.removeEventListener('click', _outsideHandler, true);
      _outsideHandler = null;
    }
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler, true);
      _escHandler = null;
    }
  };

  const isPopoverOpen = () => !!document.getElementById('claude-dt-popover');

  const closePopover = () => {
    _cleanupListeners();
    const pop = document.getElementById('claude-dt-popover');
    if (pop) pop.remove();
    editingProfileId = null;
    const gearEl = document.querySelector('#claude-dt-chip .cdt-gear');
    if (gearEl) gearEl.style.color = '';
  };

  const togglePopover = () => {
    if (isPopoverOpen()) { closePopover(); return; }
    openPopover();
  };

  const openPopover = () => {
    const existing = document.getElementById('claude-dt-popover');
    if (existing) existing.remove();
    const gearEl = document.querySelector('#claude-dt-chip .cdt-gear');
    if (gearEl) gearEl.style.color = '#4ade80';

    const profiles = getProfiles();
    const pop = document.createElement('div');
    pop.id = 'claude-dt-popover';

    // Header
    const header = document.createElement('div');
    header.className = 'cdt-pop-header';
    const title = document.createElement('span');
    title.className = 'cdt-pop-title';
    title.textContent = 'Prompt Profiles';
    const count = document.createElement('span');
    count.className = 'cdt-pop-count';
    count.textContent = profiles.items.length + '/' + MAX_PROFILES;
    header.append(title, count);
    pop.appendChild(header);

    // List
    const list = document.createElement('div');
    list.className = 'cdt-pop-list';
    profiles.items.forEach(profile => {
      list.appendChild(buildProfileItem(profile, profile.id === profiles.activeId, profiles));
    });
    pop.appendChild(list);

    // Editor (if editing)
    if (editingProfileId) {
      const editProfile = editingProfileId === '__new__'
        ? { id: '__new__', name: '', instruction: '' }
        : profiles.items.find(p => p.id === editingProfileId);
      if (editProfile) pop.appendChild(buildEditor(editProfile));
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'cdt-pop-footer';
    const addBtn = document.createElement('button');
    addBtn.className = 'cdt-add-btn';
    addBtn.type = 'button';
    addBtn.textContent = profiles.items.length >= MAX_PROFILES
      ? 'Maximum ' + MAX_PROFILES + ' profiles reached'
      : '+ New Profile';
    addBtn.disabled = profiles.items.length >= MAX_PROFILES;
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingProfileId = '__new__';
      openPopover();
    });
    footer.appendChild(addBtn);
    pop.appendChild(footer);

    (document.body || document.documentElement).appendChild(pop);

    // Clean up any previous listeners before attaching new ones
    _cleanupListeners();

    // Click outside to close
    setTimeout(() => {
      _outsideHandler = (e) => {
        const popEl = document.getElementById('claude-dt-popover');
        const chipEl = document.getElementById('claude-dt-chip');
        if (popEl && !popEl.contains(e.target) && chipEl && !chipEl.contains(e.target)) {
          closePopover();
        }
      };
      document.addEventListener('click', _outsideHandler, true);
    }, 0);

    // Escape to close
    _escHandler = (e) => {
      if (e.key === 'Escape') {
        closePopover();
      }
    };
    document.addEventListener('keydown', _escHandler, true);
  };

  const buildProfileItem = (profile, isActive, profiles) => {
    const item = document.createElement('div');
    const isEditing = editingProfileId === profile.id;
    item.className = 'cdt-p-item' + (isActive ? ' active' : '') + (isEditing ? ' editing' : '');

    const radio = document.createElement('span');
    radio.className = 'cdt-p-radio';

    const info = document.createElement('div');
    info.className = 'cdt-p-info';

    const name = document.createElement('div');
    name.className = 'cdt-p-name';
    name.textContent = profile.name || '(untitled)';

    const preview = document.createElement('div');
    preview.className = 'cdt-p-preview';
    const instrText = profile.instruction || '';
    preview.textContent = instrText.slice(0, 80) + (instrText.length > 80 ? '...' : '');

    info.append(name, preview);

    const actions = document.createElement('div');
    actions.className = 'cdt-p-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'cdt-p-btn';
    editBtn.type = 'button';
    editBtn.textContent = '\u270E';
    editBtn.title = 'Edit profile';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Switch active to the profile being edited so chip, list highlight,
      // and editor all agree on which profile the user is working with.
      if (profiles.activeId !== profile.id) {
        const updated = { ...profiles, activeId: profile.id };
        setProfiles(updated);
      }
      editingProfileId = profile.id;
      openPopover();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cdt-p-btn delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '\u2715';
    deleteBtn.title = 'Delete profile';
    if (profiles.items.length <= 1) {
      deleteBtn.style.opacity = '0.2';
      deleteBtn.style.cursor = 'default';
      deleteBtn.title = 'Cannot delete the last profile';
    } else {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = { ...profiles };
        updated.items = updated.items.filter(p => p.id !== profile.id);
        if (updated.activeId === profile.id) {
          updated.activeId = updated.items[0].id;
        }
        setProfiles(updated);
        openPopover();
      });
    }

    actions.append(editBtn, deleteBtn);
    item.append(radio, info, actions);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isActive) return;
      const updated = { ...profiles, activeId: profile.id };
      setProfiles(updated);
      openPopover();
    });

    return item;
  };

  const buildEditor = (profile) => {
    const isNew = profile.id === '__new__';
    const editor = document.createElement('div');
    editor.className = 'cdt-editor';

    const editorTitle = document.createElement('div');
    editorTitle.className = 'cdt-editor-title';
    editorTitle.textContent = isNew ? 'Create New Profile' : 'Edit Profile';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Profile name (e.g., Email Writing)';
    nameInput.value = profile.name;
    nameInput.maxLength = 40;

    const instructionInput = document.createElement('textarea');
    instructionInput.placeholder = 'Instruction to append to every message...';
    instructionInput.value = profile.instruction || '';

    const btns = document.createElement('div');
    btns.className = 'cdt-editor-btns';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cdt-btn cdt-btn-cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingProfileId = null;
      openPopover();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'cdt-btn cdt-btn-save';
    saveBtn.type = 'button';
    saveBtn.textContent = isNew ? 'Create' : 'Save';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = nameInput.value.trim();
      const instruction = instructionInput.value.trim();
      if (!name || !instruction) return;

      const profiles = getProfiles();
      if (isNew) {
        const newProfile = { id: generateId(), name, instruction };
        profiles.items.push(newProfile);
        profiles.activeId = newProfile.id;
      } else {
        const existing = profiles.items.find(p => p.id === profile.id);
        if (existing) {
          existing.name = name;
          existing.instruction = instruction;
        }
      }
      setProfiles(profiles);
      editingProfileId = null;
      openPopover();
    });

    btns.append(cancelBtn, saveBtn);
    editor.append(editorTitle, nameInput, instructionInput, btns);

    setTimeout(() => nameInput.focus(), 0);

    return editor;
  };

  // ── MutationObserver for live sync ─────────────────────────────────

  const observer = new MutationObserver(() => {
    const chip = document.getElementById('claude-dt-chip');
    if (chip) updateChipVisual(chip);
    // Only rebuild the popover if the user is NOT mid-edit.
    // Rebuilding while editing destroys typed text in the input fields.
    if (isPopoverOpen() && !editingProfileId) openPopover();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-claude-dt-enabled', 'data-claude-dt-profiles'],
  });

  // ── Editor + Fetch (core send logic — unchanged) ───────────────────

  const findEditor = () => {
    return document.querySelector('div.ProseMirror[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"].ProseMirror')
      || document.querySelector('div[contenteditable="true"]');
  };

  const appendInstructionToEditor = () => {
    const { enabled, instruction } = getState();
    if (!enabled) return false;
    const editor = findEditor();
    if (!editor) return false;
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
    return true;
  };

  document.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('button[aria-label*="Send" i], button[data-testid*="send" i]');
    if (!btn) return;
    appendInstructionToEditor();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const editor = e.target?.closest?.('[contenteditable="true"]');
    if (!editor) return;
    appendInstructionToEditor();
  }, true);

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
      } catch (e) {}
    }

    return originalFetch.apply(this, [resource, config]);
  };
})();
