import { getState, setState } from '../state.js';
import { h, infoRow, sectionHeader, divider, button, render, loading } from '../utils/dom.js';
import * as api from '../api.js';

export function renderConfig(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  // Connection info
  frag.appendChild(infoRow('Endpoint', s.baseUrl));
  frag.appendChild(infoRow('Space', s.spaceId));
  if (s.serverPid != null) frag.appendChild(infoRow('PID', String(s.serverPid)));
  if (s.readinessData?.version) frag.appendChild(infoRow('Version', s.readinessData.version));

  frag.appendChild(divider());

  // Config from CLI
  if (s.configData) {
    frag.appendChild(sectionHeader('Server Configuration'));
    try {
      const parsed = typeof s.configData === 'string' ? JSON.parse(s.configData) : s.configData;
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          if (row.key && row.value != null) {
            const source = row.source && row.source !== 'default' ? ` (${row.source})` : '';
            frag.appendChild(infoRow(row.key, `${row.value}${source}`));
          }
        }
      }
    } catch {
      frag.appendChild(h('div', { className: 'info-label' }, 'Failed to parse config'));
    }
  } else {
    const loadRow = h('div', { className: 'button-row', style: { justifyContent: 'center', padding: '8px 0' } },
      button('Load Config', () => fetchConfig()),
    );
    frag.appendChild(loadRow);
  }

  frag.appendChild(divider());

  // Database management
  frag.appendChild(sectionHeader('Database'));
  const dbRow = h('div', { className: 'button-row' },
    button('Backup', () => doBackup(), { disabled: !s.serverOnline }),
    button('Migrate', () => doMigrate()),
  );
  frag.appendChild(dbRow);

  frag.appendChild(divider());

  // Quick actions
  const quickRow = h('div', { className: 'button-row' },
    button('Refresh', () => {
      setState({ configData: null });
      fetchConfig();
    }),
  );
  frag.appendChild(quickRow);

  frag.appendChild(divider());

  // Teardown section
  frag.appendChild(sectionHeader('Instance Teardown'));

  const teardownStatus = s.teardownStatus || '';
  if (teardownStatus) {
    frag.appendChild(h('div', { className: 'info-value', style: { padding: '4px 0', fontSize: '12px' } }, teardownStatus));
  }

  const previewBtn = button('Preview Teardown', () => doTeardownPreview(), {
    disabled: s.isTeardownRunning,
  });
  const teardownBtn = button('Teardown Instance', () => confirmTeardown(), {
    disabled: s.isTeardownRunning,
    style: { backgroundColor: '#dc3545', color: '#fff', border: 'none' },
  });
  const teardownRow = h('div', { className: 'button-row' }, previewBtn, teardownBtn);
  frag.appendChild(teardownRow);

  // Dry-run preview display
  if (s.teardownPreview) {
    const preview = s.teardownPreview;
    frag.appendChild(h('div', { className: 'info-label', style: { marginTop: '8px' } }, `Scope: ${preview.scope || 'instance'}`));
    if (preview.changes && preview.changes.length > 0) {
      for (const change of preview.changes) {
        frag.appendChild(h('div', { className: 'info-value', style: { fontSize: '11px' } },
          `${change.action}: ${change.path}`));
      }
    }
    if (preview.backup_path) {
      frag.appendChild(h('div', { className: 'info-value', style: { fontSize: '11px' } },
        `Backup: ${preview.backup_path}`));
    }
  }

  render(container, frag);

  // Auto-load config on first render
  if (!s.configData) fetchConfig();
}

async function fetchConfig() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  try {
    const result = await api.configShow(inst?.project_directory || null);
    setState({ configData: result });
  } catch (e) {
    console.error('Config fetch failed:', e);
  }
}

async function doBackup() {
  const s = getState();
  try {
    await api.triggerBackup(s.baseUrl, s.spaceId);
  } catch (e) {
    console.error('Backup failed:', e);
  }
}

async function doMigrate() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  try {
    await api.dbMigrate(inst?.project_directory || null);
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

async function doTeardownPreview() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  setState({ teardownStatus: 'Loading preview...' });
  try {
    const result = await api.teardownDryRun(inst?.project_directory || null);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    setState({ teardownPreview: parsed, teardownStatus: '' });
  } catch (e) {
    console.error('Teardown preview failed:', e);
    setState({ teardownStatus: `Preview failed: ${e}` });
  }
}

function confirmTeardown() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  const name = inst?.name || 'this instance';
  if (!window.confirm(`Teardown "${name}"?\n\nThis will permanently remove all MDEMG artifacts.\nA backup is created before removal.`)) {
    return;
  }
  doTeardown();
}

async function doTeardown() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  setState({ isTeardownRunning: true, teardownStatus: 'Tearing down...' });
  try {
    const result = await api.teardownInstance(inst?.project_directory || null, false, false);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    const changeCount = parsed.changes ? parsed.changes.length : 0;
    setState({
      isTeardownRunning: false,
      teardownStatus: `Teardown complete — ${changeCount} change(s)`,
      teardownPreview: null,
    });

    // Remove instance from local list
    const remaining = s.instances.filter((i) => i.id !== s.selectedInstanceId);
    if (remaining.length > 0) {
      await api.saveInstances(remaining);
      setState({
        instances: remaining,
        selectedInstanceId: remaining[0].id,
        baseUrl: remaining[0].server_url || 'http://localhost:9999',
        spaceId: remaining[0].space_id || 'mdemg-dev',
      });
    } else {
      setState({
        instances: remaining,
        selectedInstanceId: null,
        serverOnline: false,
      });
    }
  } catch (e) {
    console.error('Teardown failed:', e);
    setState({ isTeardownRunning: false, teardownStatus: `Teardown failed: ${e}` });
  }
}
