// Number and time formatting utilities (port from macOS Formatting.swift)

export function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

export function formatUptime(seconds) {
  if (seconds == null) return '—';
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

export function formatPercentage(value) {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatBytes(bytes) {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDecimal(value, places = 3) {
  if (value == null) return '—';
  return Number(value).toFixed(places);
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
