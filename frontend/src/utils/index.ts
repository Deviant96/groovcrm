export function renderTemplate(
  message: string,
  vars: {
    company?: string | null;
    instagram?: string | null;
    website?: string | null;
    phone?: string | null;
    score?: number | null;
  },
) {
  return message
    .replace(/\{\{\s*company\s*\}\}/gi, vars.company ?? '')
    .replace(/\{\{\s*instagram\s*\}\}/gi, vars.instagram ?? '')
    .replace(/\{\{\s*website\s*\}\}/gi, vars.website ?? '')
    .replace(/\{\{\s*phone\s*\}\}/gi, vars.phone ?? '')
    .replace(/\{\{\s*score\s*\}\}/gi, vars.score != null ? String(vars.score) : '');
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function instagramUrl(handle?: string | null) {
  if (!handle) return null;
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}

export function ensureHttp(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  switch (status) {
    case 'CLOSED_WON':
      return 'success';
    case 'CLOSED_LOST':
      return 'danger';
    case 'INTERESTED':
    case 'MEETING':
    case 'PROPOSAL':
      return 'warn';
    case 'REPLIED':
    case 'SENT':
      return 'info';
    default:
      return 'secondary';
  }
}
