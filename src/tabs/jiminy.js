import { getState } from '../state.js';
import { h, infoRow, sectionHeader, divider, render, loading } from '../utils/dom.js';
import { formatDecimal } from '../utils/formatting.js';

export function renderJiminy(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  const health = s.jiminyHealth;
  if (!health && s.serverOnline) {
    render(container, loading('Loading Jiminy data...'));
    return;
  }
  if (!health) {
    render(container, h('div', { className: 'empty-state' }, 'Server not running'));
    return;
  }

  // Health status
  const statusDot = h('span', {
    className: `status-dot ${health.enabled ? 'online' : 'offline'}`,
    style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px' },
  });
  frag.appendChild(h('div', { className: 'info-row' },
    statusDot,
    h('span', {}, `Jiminy: ${health.enabled ? 'Enabled' : 'Disabled'} / ${health.status.charAt(0).toUpperCase() + health.status.slice(1)}`),
  ));

  if (!health.enabled) {
    render(container, frag);
    return;
  }

  // Features
  const ready = s.jiminyReady;
  if (ready?.features) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Features'));
    const sorted = Object.entries(ready.features).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, enabled] of sorted) {
      const icon = enabled ? '\u2611' : '\u2610';
      const label = featureLabel(key);
      frag.appendChild(h('div', { className: 'info-row' },
        h('span', { style: { marginRight: '6px', color: enabled ? '#a6e3a1' : '#6c7086' } }, icon),
        h('span', {}, label),
      ));
    }
  }

  // Protocol Metrics
  if (ready?.stats) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Protocol Metrics (J17)'));
    frag.appendChild(infoRow('Guidance issued', statValue(ready.stats, 'total_guidance')));
    frag.appendChild(infoRow('Guidance followed', statValue(ready.stats, 'followed_count')));
    frag.appendChild(infoRow('Guidance ignored', statValue(ready.stats, 'ignored_count')));
    const avgConf = ready.stats.avg_confidence;
    frag.appendChild(infoRow('Avg confidence', avgConf != null ? formatDecimal(avgConf, 2) : '--'));
  }

  // Tier Effectiveness
  const tiers = s.jiminyTierEffectiveness;
  if (tiers?.overall_tier_comprehension?.length > 0) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Tier Effectiveness'));
    const tierNames = ['T1 Nudge', 'T2 Suggest', 'T3 Insist'];
    for (let i = 0; i < tierNames.length && i < tiers.overall_tier_comprehension.length; i++) {
      const score = tiers.overall_tier_comprehension[i];
      const pct = Math.round(Math.min(Math.max(score, 0), 1) * 100);
      const row = h('div', { className: 'calibration-row' },
        h('span', { className: 'calibration-label' }, tierNames[i]),
        h('div', { className: 'calibration-bar' },
          h('div', {
            className: 'calibration-fill',
            style: { width: `${pct}%`, backgroundColor: tierColor(score) },
          }),
        ),
        h('span', { className: 'calibration-pct' }, `${pct}%`),
      );
      frag.appendChild(row);
    }
  }

  render(container, frag);
}

const FEATURE_LABELS = {
  synthesis: 'Synthesis',
  evaluate_llm: 'LLM Evaluation',
  outcome_llm: 'LLM Outcomes',
  outcome_classifier: 'Outcome Classifier',
  escalation: 'Escalation',
  persistence: 'Persistence',
  cache: 'Cache',
  j17: 'J17 Protocol',
  ml_tier_prediction: 'ML Tier Prediction',
  nli_comprehension: 'NLI Comprehension',
};

function featureLabel(key) {
  return FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statValue(stats, key) {
  const val = stats[key];
  if (val == null) return '--';
  return String(typeof val === 'number' ? Math.round(val) : val);
}

function tierColor(score) {
  if (score >= 0.8) return '#a6e3a1'; // green
  if (score >= 0.5) return '#f9e2af'; // yellow
  return '#f38ba8'; // red
}
