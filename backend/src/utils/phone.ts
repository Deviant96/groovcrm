export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Invalid phone number');
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const cleaned = handle
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/$/, '')
    .split(/[/?#]/)[0]
    ?.toLowerCase();
  return cleaned || null;
}
