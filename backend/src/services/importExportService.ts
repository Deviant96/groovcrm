import { ActivityType, ProspectStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/errors.js';
import { normalizeInstagram, normalizePhone, normalizeWebsite } from '../utils/phone.js';
import { stringify } from 'csv-stringify/sync';

export type FieldMapping = {
  companyName: string;
  instagramHandle?: string | null;
  website?: string | null;
  phoneNumber?: string | null;
  sourceUrl?: string | null;
  score?: string | null;
  hasWebsite?: string | null;
  status?: string | null;
  followUpDate?: string | null;
  lastContactDate?: string | null;
  notes?: string | null;
};

type CsvRow = Record<string, string | null>;

const STATUS_MAP: Record<string, ProspectStatus> = {
  new: ProspectStatus.NEW,
  sent: ProspectStatus.SENT,
  replied: ProspectStatus.REPLIED,
  interested: ProspectStatus.INTERESTED,
  meeting: ProspectStatus.MEETING,
  proposal: ProspectStatus.PROPOSAL,
  'closed won': ProspectStatus.CLOSED_WON,
  closed_won: ProspectStatus.CLOSED_WON,
  'closed lost': ProspectStatus.CLOSED_LOST,
  closed_lost: ProspectStatus.CLOSED_LOST,
};

function getMapped(row: CsvRow, key?: string | null) {
  if (!key) return null;
  const value = row[key];
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseStatus(value: string | null): ProspectStatus {
  if (!value) return ProspectStatus.NEW;
  return STATUS_MAP[value.toLowerCase()] ?? ProspectStatus.NEW;
}

function parseBool(value: string | null, fallback = false) {
  if (value == null) return fallback;
  const v = value.toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(v)) return true;
  if (['0', 'false', 'no', 'n'].includes(v)) return false;
  return fallback;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapRow(row: CsvRow, mapping: FieldMapping) {
  const companyName = getMapped(row, mapping.companyName);
  if (!companyName) return null;

  const website = normalizeWebsite(getMapped(row, mapping.website));
  const phoneRaw = getMapped(row, mapping.phoneNumber);
  const phoneNumber = normalizePhone(phoneRaw) ?? phoneRaw;
  const instagramHandle = normalizeInstagram(getMapped(row, mapping.instagramHandle));
  const scoreRaw = getMapped(row, mapping.score);
  const score = scoreRaw ? Number.parseInt(scoreRaw, 10) || 0 : 0;

  return {
    companyName,
    instagramHandle,
    website,
    phoneNumber,
    sourceUrl: getMapped(row, mapping.sourceUrl),
    score: Math.min(100, Math.max(0, score)),
    hasWebsite: mapping.hasWebsite
      ? parseBool(getMapped(row, mapping.hasWebsite), Boolean(website))
      : Boolean(website),
    status: parseStatus(getMapped(row, mapping.status)),
    followUpDate: parseDate(getMapped(row, mapping.followUpDate)),
    lastContactDate: parseDate(getMapped(row, mapping.lastContactDate)),
    notes: getMapped(row, mapping.notes),
  };
}

function duplicateKey(p: {
  companyName: string;
  phoneNumber: string | null;
  website: string | null;
  instagramHandle: string | null;
}) {
  return {
    phone: p.phoneNumber?.toLowerCase() || null,
    website: p.website?.toLowerCase() || null,
    instagram: p.instagramHandle?.toLowerCase() || null,
    company: p.companyName.toLowerCase(),
  };
}

export async function previewImport(rows: CsvRow[], mapping: FieldMapping) {
  if (!mapping.companyName) {
    throw new AppError(400, 'companyName mapping is required');
  }

  const mapped = rows.map((row, index) => ({ index, data: mapRow(row, mapping) })).filter((r) => r.data);

  const withinFileDuplicates: Array<{ index: number; matchedIndex: number; reason: string }> = [];
  const seen = new Map<string, number>();

  for (const item of mapped) {
    const keys = duplicateKey(item.data!);
    const checks: Array<[string, string]> = [];
    if (keys.phone) checks.push([`phone:${keys.phone}`, 'phone']);
    if (keys.website) checks.push([`website:${keys.website}`, 'website']);
    if (keys.instagram) checks.push([`instagram:${keys.instagram}`, 'instagram']);
    checks.push([`company:${keys.company}`, 'company']);

    for (const [key, reason] of checks) {
      const prev = seen.get(key);
      if (prev != null) {
        withinFileDuplicates.push({ index: item.index, matchedIndex: prev, reason });
        break;
      }
    }
    for (const [key] of checks) {
      if (!seen.has(key)) seen.set(key, item.index);
    }
  }

  const existing = await prisma.prospect.findMany({
    select: {
      id: true,
      companyName: true,
      phoneNumber: true,
      website: true,
      instagramHandle: true,
    },
  });

  const againstDb: Array<{ index: number; prospectId: string; reason: string; companyName: string }> = [];

  for (const item of mapped) {
    const keys = duplicateKey(item.data!);
    for (const ex of existing) {
      let reason: string | null = null;
      if (keys.phone && ex.phoneNumber && keys.phone === ex.phoneNumber.toLowerCase()) reason = 'phone';
      else if (keys.website && ex.website && keys.website === ex.website.toLowerCase()) reason = 'website';
      else if (keys.instagram && ex.instagramHandle && keys.instagram === ex.instagramHandle.toLowerCase())
        reason = 'instagram';
      else if (keys.company === ex.companyName.toLowerCase()) reason = 'company';

      if (reason) {
        againstDb.push({
          index: item.index,
          prospectId: ex.id,
          reason,
          companyName: ex.companyName,
        });
        break;
      }
    }
  }

  return {
    totalRows: rows.length,
    validRows: mapped.length,
    skippedRows: rows.length - mapped.length,
    existingCount: existing.length,
    withinFileDuplicates,
    againstDb,
    sample: mapped.slice(0, 5).map((m) => m.data),
  };
}

export async function confirmImport(rows: CsvRow[], mapping: FieldMapping) {
  const mapped = rows.map((row) => mapRow(row, mapping)).filter(Boolean) as NonNullable<
    ReturnType<typeof mapRow>
  >[];

  if (!mapped.length) {
    throw new AppError(400, 'No valid rows to import');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany();
    await tx.note.deleteMany();
    await tx.prospect.deleteMany();

    const created = [];
    for (const data of mapped) {
      const prospect = await tx.prospect.create({
        data: {
          ...data,
          activities: {
            create: { type: ActivityType.IMPORTED, metadata: { source: 'csv' } },
          },
        },
      });
      created.push(prospect);
    }
    return created;
  });

  return { imported: result.length };
}

export async function exportCsv() {
  const prospects = await prisma.prospect.findMany({ orderBy: { createdAt: 'asc' } });

  const records = prospects.map((p) => ({
    company_name: p.companyName,
    instagram_handle: p.instagramHandle ?? '',
    website: p.website ?? '',
    phone_number: p.phoneNumber ?? '',
    source_url: p.sourceUrl ?? '',
    score: p.score,
    has_website: p.hasWebsite ? 'true' : 'false',
    status: p.status,
    follow_up_date: p.followUpDate?.toISOString() ?? '',
    last_contact_date: p.lastContactDate?.toISOString() ?? '',
    notes: p.notes ?? '',
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }));

  return stringify(records, { header: true });
}

export function suggestMapping(headers: string[]): Partial<FieldMapping> {
  const lower = headers.map((h) => ({ raw: h, key: h.toLowerCase().replace(/[\s_-]+/g, '') }));

  const find = (...candidates: string[]) => {
    const hit = lower.find((h) => candidates.includes(h.key));
    return hit?.raw;
  };

  return {
    companyName: find('companyname', 'company', 'business', 'businessname', 'name'),
    instagramHandle: find('instagramhandle', 'instagram', 'ig', 'insta'),
    website: find('website', 'url', 'web', 'site'),
    phoneNumber: find('phonenumber', 'phone', 'whatsapp', 'wa', 'mobile', 'tel'),
    sourceUrl: find('sourceurl', 'source', 'link'),
    score: find('score', 'rating'),
    hasWebsite: find('haswebsite', 'websiteyes'),
    status: find('status', 'stage'),
    followUpDate: find('followupdate', 'followup', 'nextfollowup'),
    lastContactDate: find('lastcontactdate', 'lastcontact', 'lastreached'),
    notes: find('notes', 'note', 'comment', 'comments'),
  };
}
