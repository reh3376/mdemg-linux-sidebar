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
