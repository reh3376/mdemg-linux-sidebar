import { getState, setState } from '../state.js';
import { h, button, sectionHeader, divider, loading, render } from '../utils/dom.js';
import * as api from '../api.js';

// ── Public API ─────────────────────────────────────────────────────────────

export function openTeardownWizard() {
  setState({
    teardownWizardOpen: true,
    teardownWizardStep: 'confirm',
    teardownWizardDryRun: null,
    teardownWizardResult: null,
    teardownWizardError: null,
    teardownWizardExportStatus: '',
    teardownWizardExportComplete: false,
  });
  loadDryRun();
}

export function closeTeardownWizard() {
  setState({
    teardownWizardOpen: false,
    teardownWizardStep: 'confirm',
    teardownWizardDryRun: null,
    teardownWizardResult: null,
    teardownWizardError: null,
    teardownWizardExportStatus: '',
    teardownWizardExportComplete: false,
  });
  const container = document.getElementById('teardown-wizard-container');
  if (container) container.innerHTML = '';
}

export function renderTeardownWizardModal() {
  const container = document.getElementById('teardown-wizard-container');
  if (!container) return;
  const s = getState();
  if (!s.teardownWizardOpen) {
    container.innerHTML = '';
    return;
  }

  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  if (!inst) {
    container.innerHTML = '';
    return;
  }

  // Build modal
  const overlay = h('div', { className: 'modal-overlay', onClick: (e) => {
    if (e.target === e.currentTarget && s.teardownWizardStep !== 'executing') closeTeardownWizard();
  }},
    h('div', { className: 'modal-content', onClick: (e) => e.stopPropagation() },
      renderHeader(s),
      renderStepIndicator(s),
      renderBody(s, inst),
      renderFooter(s, inst),
    )
  );

  container.innerHTML = '';
  container.appendChild(overlay);
}

// ── Header ─────────────────────────────────────────────────────────────────

function renderHeader(s) {
  const closeBtn = h('button', {
    className: 'modal-close',
    onClick: () => { if (s.teardownWizardStep !== 'executing') closeTeardownWizard(); },
  }, '\u00D7');
  return h('div', { className: 'modal-header' },
    h('h3', {}, 'Remove Instance'),
    closeBtn,
  );
}

// ── Step Indicator ─────────────────────────────────────────────────────────

function renderStepIndicator(s) {
  const step = s.teardownWizardStep;
  const stepMap = { confirm: 0, exportDecision: 1, exportSetup: 2, executing: 3, result: 4 };
  const raw = stepMap[step] ?? 0;

  const dot = (idx) => {
    let cls = 'step-dot';
    if (idx === 0) {
      cls += raw > 1 ? ' completed' : (raw <= 1 ? ' active' : '');
    } else if (idx === 1) {
      cls += raw > 2 ? ' completed' : (raw === 2 ? ' active' : '');
    } else if (idx === 2) {
      cls += (raw === 4 && s.teardownWizardResult) ? ' completed' : (raw >= 3 ? ' active' : '');
    }
    return h('div', { className: cls });
  };

  return h('div', { className: 'step-indicator' }, dot(0), dot(1), dot(2));
}

// ── Body ───────────────────────────────────────────────────────────────────

function renderBody(s, inst) {
  const body = h('div', { className: 'modal-body' });
  switch (s.teardownWizardStep) {
    case 'confirm': body.appendChild(renderConfirmStep(s, inst)); break;
    case 'exportDecision': body.appendChild(renderExportDecisionStep()); break;
    case 'exportSetup': body.appendChild(renderExportSetupStep(s, inst)); break;
    case 'executing': body.appendChild(renderExecutingStep()); break;
    case 'result': body.appendChild(renderResultStep(s)); break;
  }
  return body;
}

function renderConfirmStep(s, inst) {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('div', { className: 'modal-description' }, 'You are about to completely uninstall:'));
  frag.appendChild(h('div', { className: 'modal-instance-name' }, inst.name));
  frag.appendChild(h('div', { className: 'modal-instance-path' }, inst.project_directory));
  frag.appendChild(h('div', { className: 'modal-instance-path' }, `Space: ${inst.space_id}`));
  frag.appendChild(h('hr', { className: 'divider' }));
  frag.appendChild(h('div', { className: 'modal-description', style: { fontWeight: '600', color: 'var(--text-primary)' } }, 'This will remove:'));

  const dryRun = s.teardownWizardDryRun;
  if (dryRun && dryRun.changes) {
    for (const change of dryRun.changes) {
      frag.appendChild(h('div', { className: 'modal-change-item' }, `\u2022 ${change.action}: ${change.path}`));
    }
  } else if (s.teardownWizardError) {
    frag.appendChild(h('div', { className: 'modal-error' }, `Could not load preview: ${s.teardownWizardError}`));
  } else {
    frag.appendChild(loading('Loading preview...'));
  }

  return frag;
}

function renderExportDecisionStep() {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('div', { style: { fontSize: '16px', fontWeight: '600', padding: '4px 0 8px' } }, 'Export data before removal?'));
  frag.appendChild(h('div', { className: 'modal-description' },
    'Your instance contains CMS memory, RSIC self-improvement data, and Jiminy guidance history. You can export this data to a file before removing the instance.'));
  return frag;
}

function renderExportSetupStep(s, inst) {
  const frag = document.createDocumentFragment();

  // Profile picker
  const profileRow = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } });
  profileRow.appendChild(h('span', { className: 'info-label' }, 'Export Profile:'));
  const select = h('select', { className: 'export-select' });
  for (const p of ['full', 'shareable', 'metadata']) {
    const opt = h('option', { value: p }, p);
    if (p === 'shareable') opt.selected = true;
    select.appendChild(opt);
  }
  profileRow.appendChild(select);
  frag.appendChild(profileRow);

  // Output path
  frag.appendChild(h('div', { className: 'info-label', style: { padding: '8px 0 2px' } }, 'Save to:'));
  const pathInput = h('input', {
    className: 'export-input',
    type: 'text',
    value: s._exportPath || '',
    placeholder: `~/${inst.space_id}-teardown-export.mdemg`,
  });
  frag.appendChild(pathInput);

  // Export status
  if (s.teardownWizardExportStatus === 'exporting') {
    frag.appendChild(loading('Exporting...'));
  } else if (s.teardownWizardExportComplete) {
    frag.appendChild(h('div', { className: 'modal-success', style: { fontSize: '12px' } }, '\u2713 Export complete'));
  } else if (s.teardownWizardExportStatus && s.teardownWizardExportStatus.startsWith('failed')) {
    frag.appendChild(h('div', { className: 'modal-error' }, s.teardownWizardExportStatus));
  } else {
    const exportBtn = button('Export', async () => {
      const outputPath = pathInput.value || pathInput.placeholder;
      const profile = select.value;
      setState({ teardownWizardExportStatus: 'exporting' });
      try {
        await api.exportSpace(inst.project_directory, inst.space_id, profile, outputPath);
        setState({ teardownWizardExportStatus: 'done', teardownWizardExportComplete: true });
      } catch (e) {
        setState({ teardownWizardExportStatus: `failed: ${e}` });
      }
    }, { primary: true, disabled: false });
    frag.appendChild(h('div', { style: { padding: '8px 0' } }, exportBtn));
  }

  return frag;
}

function renderExecutingStep() {
  return h('div', { style: { textAlign: 'center', padding: '40px 0' } },
    loading('Removing instance...'));
}

function renderResultStep(s) {
  const frag = document.createDocumentFragment();
  const result = s.teardownWizardResult;
  if (result) {
    frag.appendChild(h('div', { className: 'modal-success' }, '\u2713 Instance removed successfully'));
    frag.appendChild(h('hr', { className: 'divider' }));
    frag.appendChild(h('div', { className: 'modal-description', style: { fontWeight: '600', color: 'var(--text-primary)' } }, 'Changes:'));
    if (result.changes) {
      for (const change of result.changes) {
        frag.appendChild(h('div', { className: 'modal-change-item' }, `\u2022 ${change.action}: ${change.path}`));
      }
    }
    if (result.backup_path) {
      frag.appendChild(h('hr', { className: 'divider' }));
      frag.appendChild(h('div', { className: 'modal-change-item', style: { fontWeight: '500' } }, `Backup: ${result.backup_path}`));
    }
    if (result.next_actions && result.next_actions.length > 0) {
      frag.appendChild(h('hr', { className: 'divider' }));
      frag.appendChild(h('div', { className: 'modal-description', style: { fontWeight: '600', color: 'var(--text-primary)' } }, 'Next actions:'));
      for (const action of result.next_actions) {
        frag.appendChild(h('div', { className: 'modal-change-item' }, `\u2022 ${action}`));
      }
    }
  } else if (s.teardownWizardError) {
    frag.appendChild(h('div', { style: { fontSize: '14px', fontWeight: '600', color: 'var(--error)', padding: '8px 0' } }, 'Teardown failed'));
    frag.appendChild(h('div', { className: 'modal-error' }, s.teardownWizardError));
  }
  return frag;
}

// ── Footer ─────────────────────────────────────────────────────────────────

function renderFooter(s, inst) {
  const footer = h('div', { className: 'modal-footer' });
  switch (s.teardownWizardStep) {
    case 'confirm':
      footer.appendChild(button('Cancel', () => closeTeardownWizard()));
      footer.appendChild(button('Continue', () => setState({ teardownWizardStep: 'exportDecision' }), {
        primary: true,
        disabled: !s.teardownWizardDryRun && !s.teardownWizardError,
      }));
      break;
    case 'exportDecision':
      footer.appendChild(button('\u2190 Back', () => setState({ teardownWizardStep: 'confirm' })));
      footer.appendChild(button('Skip Export', () => {
        setState({ teardownWizardStep: 'executing' });
        runTeardown(inst);
      }));
      footer.appendChild(button('Export First', () => {
        initExportPath(inst);
        setState({ teardownWizardStep: 'exportSetup' });
      }, { primary: true }));
      break;
    case 'exportSetup':
      footer.appendChild(button('\u2190 Back', () => setState({ teardownWizardStep: 'exportDecision', teardownWizardExportStatus: '', teardownWizardExportComplete: false })));
      if (s.teardownWizardExportComplete) {
        footer.appendChild(button('Continue to Remove', () => {
          setState({ teardownWizardStep: 'executing' });
          runTeardown(inst);
        }, { primary: true }));
      }
      break;
    case 'executing':
      // No buttons during execution
      break;
    case 'result':
      footer.appendChild(button('Done', () => finishWizard(s, inst), { primary: true }));
      break;
  }
  return footer;
}

// ── Actions ────────────────────────────────────────────────────────────────

async function loadDryRun() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  if (!inst) return;
  try {
    const result = await api.teardownDryRun(inst.project_directory);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    setState({ teardownWizardDryRun: parsed });
  } catch (e) {
    setState({ teardownWizardError: `${e}` });
  }
}

async function initExportPath(inst) {
  try {
    const path = await api.defaultExportPath(inst.space_id);
    setState({ _exportPath: path });
  } catch {
    const home = await api.getHomeDir().catch(() => '/home/user');
    setState({ _exportPath: `${home}/${inst.space_id}-teardown-export.mdemg` });
  }
}

async function runTeardown(inst) {
  try {
    const result = await api.teardownInstance(inst.project_directory, false, false);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    setState({ teardownWizardResult: parsed, teardownWizardStep: 'result' });
  } catch (e) {
    setState({ teardownWizardError: `${e}`, teardownWizardStep: 'result' });
  }
}

async function finishWizard(s, inst) {
  // Remove instance from local list
  const remaining = s.instances.filter((i) => i.id !== inst.id);
  try { await api.saveInstances(remaining); } catch { /* best-effort */ }

  if (remaining.length > 0) {
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

  closeTeardownWizard();
}
