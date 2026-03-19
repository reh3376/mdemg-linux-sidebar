import { getState, setState } from '../state.js';
import { h, infoRow, sectionHeader, divider, button, render, loading } from '../utils/dom.js';
import { formatDecimal, timeAgo } from '../utils/formatting.js';
import * as api from '../api.js';

export function renderRSIC(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  const health = s.rsicHealth;
  if (!health && s.serverOnline) {
    render(container, loading('Loading RSIC data...'));
    return;
  }
  if (!health) {
    render(container, h('div', { className: 'empty-state' }, 'Server not running'));
    return;
  }

  // Engine status
  frag.appendChild(sectionHeader('RSIC Engine'));
  frag.appendChild(infoRow('Status', health.status));
  frag.appendChild(infoRow('Active Tasks', String(health.active_tasks)));

  // Watchdog
  if (health.watchdog) {
    const wd = health.watchdog;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Watchdog'));
    if (wd.escalation_level != null) frag.appendChild(infoRow('  Escalation', escalationLabel(wd.escalation_level)));
    if (wd.decay_score != null) frag.appendChild(infoRow('  Decay Score', formatDecimal(wd.decay_score)));
    if (wd.obs_rate_per_hour != null) frag.appendChild(infoRow('  Obs Rate/hr', formatDecimal(wd.obs_rate_per_hour, 1)));
    if (wd.session_health_score != null) frag.appendChild(infoRow('  Session Health', formatDecimal(wd.session_health_score, 2)));
    if (wd.active_anomalies?.length > 0) frag.appendChild(infoRow('  Anomalies', String(wd.active_anomalies.length)));
  }

  // Orchestration
  if (health.orchestration) {
    const orch = health.orchestration;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Orchestration'));
    if (orch.microEnabled != null) frag.appendChild(infoRow('  Micro Enabled', orch.microEnabled ? 'Yes' : 'No'));
    if (orch.mesoPeriodSessions != null) frag.appendChild(infoRow('  Meso Period', `${orch.mesoPeriodSessions} sessions`));
    if (orch.cooldownSec != null) frag.appendChild(infoRow('  Cooldown', `${orch.cooldownSec}s`));
  }

  // Safety
  if (health.safety) {
    const safety = health.safety;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Safety'));
    if (safety.enforcement_active != null) frag.appendChild(infoRow('  Enforcement', safety.enforcement_active ? 'Active' : 'Inactive'));
    if (safety.safety_version) frag.appendChild(infoRow('  Version', safety.safety_version));
    if (safety.rollback) {
      if (safety.rollback.window_sec != null) frag.appendChild(infoRow('  Rollback Window', `${safety.rollback.window_sec}s`));
      if (safety.rollback.snapshots_held != null) frag.appendChild(infoRow('  Snapshots', String(safety.rollback.snapshots_held)));
    }
  }

  // Persistence
  if (health.persistence) {
    const p = health.persistence;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Persistence'));
    if (p.enabled != null) frag.appendChild(infoRow('  Enabled', p.enabled ? 'Yes' : 'No'));
    if (p.dirty_keys != null) frag.appendChild(infoRow('  Dirty Keys', String(p.dirty_keys)));
    if (p.flush_errors != null) frag.appendChild(infoRow('  Flush Errors', String(p.flush_errors)));
  }

  // Recent Cycles
  if (s.rsicHistory.length > 0) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Recent Cycles'));
    for (const cycle of s.rsicHistory.slice(0, 5)) {
      const statusIcon = cycle.dry_run ? '\uD83D\uDC41' : (cycle.failed_count > 0 ? '\u26A0' : '\u2713');
      const dryTag = cycle.dry_run ? ' DRY' : '';
      const row = h('div', { className: 'cycle-row' },
        h('span', { className: 'cycle-icon' }, statusIcon),
        h('span', { className: 'cycle-tier' }, cycle.tier.toUpperCase() + dryTag),
        h('span', { className: 'cycle-info' },
          `${cycle.success_count}/${cycle.actions_executed} actions`),
        h('span', { className: 'cycle-time' }, timeAgo(cycle.started_at)),
      );
      frag.appendChild(row);
    }
  }

  // Calibration
  if (Object.keys(s.rsicCalibration).length > 0) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Action Calibration'));
    const sorted = Object.entries(s.rsicCalibration).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [action, confidence] of sorted) {
      const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
      const bar = h('div', { className: 'calibration-row' },
        h('span', { className: 'calibration-label' }, action),
        h('div', { className: 'calibration-bar' },
          h('div', { className: 'calibration-fill', style: { width: `${pct}%` } }),
        ),
        h('span', { className: 'calibration-pct' }, `${pct}%`),
      );
      frag.appendChild(bar);
    }
  }

  // Actions
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('Actions'));

  // Tier picker
  const tierPicker = h('div', { className: 'tier-picker' });
  for (const tier of ['micro', 'meso', 'macro']) {
    const btn = h('button', {
      className: `tier-btn ${tier === 'meso' ? 'active' : ''}`,
      'data-tier': tier,
      onClick: (e) => {
        tierPicker.querySelectorAll('.tier-btn').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
      },
    }, tier.charAt(0).toUpperCase() + tier.slice(1));
    tierPicker.appendChild(btn);
  }
  frag.appendChild(tierPicker);

  // Dry run toggle
  const dryRunLabel = h('label', { className: 'checkbox-label' },
    h('input', { type: 'checkbox', checked: 'checked', id: 'dry-run-toggle' }),
    ' Dry Run',
  );
  frag.appendChild(dryRunLabel);

  // Run button
  const runRow = h('div', { className: 'button-row' },
    button('Run Cycle', () => runCycle(container), { disabled: s.isRSICCycleRunning }),
  );
  frag.appendChild(runRow);

  if (s.isRSICCycleRunning) {
    frag.appendChild(h('div', { className: 'info-label' }, 'Cycle running...'));
  }

  render(container, frag);
}

async function runCycle(container) {
  const s = getState();
  const tierBtn = container.querySelector('.tier-btn.active');
  const tier = tierBtn?.dataset?.tier || 'meso';
  const dryRun = container.querySelector('#dry-run-toggle')?.checked ?? true;

  setState({ isRSICCycleRunning: true });
  try {
    await api.triggerRsicCycle(s.baseUrl, s.spaceId, tier, dryRun);
  } catch (e) {
    console.error('RSIC cycle failed:', e);
  } finally {
    setState({ isRSICCycleRunning: false });
  }
}

function escalationLabel(level) {
  switch (level) {
    case 0: return 'Nominal';
    case 1: return 'Nudge';
    case 2: return 'Warning';
    case 3: return 'Force';
    default: return `Level ${level}`;
  }
}
