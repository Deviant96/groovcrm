import { ActivityType, type Prisma, type ProspectStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { assertFound, AppError } from '../utils/errors.js';
import { normalizeInstagram, normalizePhone, normalizeWebsite } from '../utils/phone.js';

type ProspectInput = {
  companyName: string;
  instagramHandle?: string | null;
  website?: string | null;
  phoneNumber?: string | null;
  sourceUrl?: string | null;
  score?: number;
  hasWebsite?: boolean;
  status?: ProspectStatus;
  followUpDate?: string | null;
  lastContactDate?: string | null;
  notes?: string | null;
};

type ListQuery = {
  search?: string;
  status?: ProspectStatus;
  hasWebsite?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  followUp?: 'today' | 'overdue' | 'upcoming' | 'none';
  hasInstagram?: boolean;
  hasPhone?: boolean;
  hasWebsiteUrl?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function normalizeProspectData(input: ProspectInput) {
  const website = normalizeWebsite(input.website);
  const hasWebsite = input.hasWebsite ?? Boolean(website);
  return {
    companyName: input.companyName.trim(),
    instagramHandle: normalizeInstagram(input.instagramHandle),
    website,
    phoneNumber: normalizePhone(input.phoneNumber) ?? (input.phoneNumber?.trim() || null),
    sourceUrl: input.sourceUrl?.trim() || null,
    score: input.score ?? 0,
    hasWebsite,
    status: input.status,
    followUpDate: input.followUpDate ? new Date(input.followUpDate) : input.followUpDate === null ? null : undefined,
    lastContactDate: input.lastContactDate
      ? new Date(input.lastContactDate)
      : input.lastContactDate === null
        ? null
        : undefined,
    notes: input.notes ?? undefined,
  };
}

function buildWhere(query: ListQuery): Prisma.ProspectWhereInput {
  const where: Prisma.ProspectWhereInput = {};
  const and: Prisma.ProspectWhereInput[] = [];

  if (query.search) {
    const s = query.search.trim();
    and.push({
      OR: [
        { companyName: { contains: s, mode: 'insensitive' } },
        { instagramHandle: { contains: s, mode: 'insensitive' } },
        { website: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { sourceUrl: { contains: s, mode: 'insensitive' } },
      ],
    });
  }

  if (query.status) where.status = query.status;
  if (query.hasWebsite !== undefined) where.hasWebsite = query.hasWebsite;
  if (query.scoreMin != null || query.scoreMax != null) {
    where.score = {};
    if (query.scoreMin != null) where.score.gte = query.scoreMin;
    if (query.scoreMax != null) where.score.lte = query.scoreMax;
  }

  if (query.followUp === 'today') {
    where.followUpDate = { gte: startOfDay(), lte: endOfDay() };
  } else if (query.followUp === 'overdue') {
    where.followUpDate = { lt: startOfDay() };
  } else if (query.followUp === 'upcoming') {
    where.followUpDate = { gt: endOfDay() };
  } else if (query.followUp === 'none') {
    where.followUpDate = null;
  }

  if (query.hasInstagram === true) and.push({ instagramHandle: { not: null } });
  if (query.hasInstagram === false) and.push({ OR: [{ instagramHandle: null }, { instagramHandle: '' }] });
  if (query.hasPhone === true) and.push({ phoneNumber: { not: null } });
  if (query.hasPhone === false) and.push({ OR: [{ phoneNumber: null }, { phoneNumber: '' }] });
  if (query.hasWebsiteUrl === true) and.push({ website: { not: null } });
  if (query.hasWebsiteUrl === false) and.push({ OR: [{ website: null }, { website: '' }] });

  if (and.length) where.AND = and;
  return where;
}

export async function listProspects(query: ListQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.prospect.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { [query.sortBy]: query.sortDir },
    }),
    prisma.prospect.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize) || 1,
  };
}

export async function getProspect(id: string) {
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      noteEntries: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  });
  return assertFound(prospect, 'Prospect not found');
}

export async function createProspect(input: ProspectInput) {
  const data = normalizeProspectData(input);
  const prospect = await prisma.prospect.create({
    data: {
      ...data,
      status: data.status ?? 'NEW',
      activities: {
        create: { type: ActivityType.IMPORTED, metadata: { source: 'manual' } },
      },
    },
  });
  return prospect;
}

export async function updateProspect(id: string, input: Partial<ProspectInput>) {
  const existing = assertFound(await prisma.prospect.findUnique({ where: { id } }), 'Prospect not found');
  const data = normalizeProspectData({
    companyName: input.companyName ?? existing.companyName,
    ...input,
  });

  const activities: Prisma.ActivityCreateWithoutProspectInput[] = [
    { type: ActivityType.EDITED, metadata: { fields: Object.keys(input) } },
  ];

  if (input.status && input.status !== existing.status) {
    activities.push({
      type: ActivityType.STATUS_CHANGED,
      metadata: { from: existing.status, to: input.status },
    });
  }

  if (
    input.followUpDate !== undefined &&
    String(input.followUpDate ?? '') !== String(existing.followUpDate?.toISOString() ?? '')
  ) {
    activities.push({
      type: ActivityType.FOLLOW_UP_CHANGED,
      metadata: { from: existing.followUpDate, to: data.followUpDate },
    });
  }

  return prisma.prospect.update({
    where: { id },
    data: {
      ...data,
      activities: { create: activities },
    },
  });
}

export async function deleteProspect(id: string) {
  assertFound(await prisma.prospect.findUnique({ where: { id } }), 'Prospect not found');
  await prisma.prospect.delete({ where: { id } });
}

export async function bulkUpdateStatus(ids: string[], status: ProspectStatus) {
  const prospects = await prisma.prospect.findMany({ where: { id: { in: ids } } });
  if (!prospects.length) throw new AppError(404, 'No prospects found');

  await prisma.$transaction(
    prospects.map((p) =>
      prisma.prospect.update({
        where: { id: p.id },
        data: {
          status,
          activities: {
            create: {
              type: ActivityType.STATUS_CHANGED,
              metadata: { from: p.status, to: status, bulk: true },
            },
          },
        },
      }),
    ),
  );

  return { updated: prospects.length };
}

export async function bulkDelete(ids: string[]) {
  const result = await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
  return { deleted: result.count };
}

export async function addNote(prospectId: string, content: string) {
  assertFound(await prisma.prospect.findUnique({ where: { id: prospectId } }), 'Prospect not found');

  const [note] = await prisma.$transaction([
    prisma.note.create({ data: { prospectId, content } }),
    prisma.activity.create({
      data: {
        prospectId,
        type: ActivityType.NOTE_ADDED,
        metadata: { preview: content.slice(0, 120) },
      },
    }),
  ]);

  return note;
}

export async function deleteNote(noteId: string) {
  assertFound(await prisma.note.findUnique({ where: { id: noteId } }), 'Note not found');
  await prisma.note.delete({ where: { id: noteId } });
}

export async function getFollowUps() {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [today, overdue] = await Promise.all([
    prisma.prospect.findMany({
      where: { followUpDate: { gte: todayStart, lte: todayEnd } },
      orderBy: { followUpDate: 'asc' },
      take: 50,
    }),
    prisma.prospect.findMany({
      where: { followUpDate: { lt: todayStart } },
      orderBy: { followUpDate: 'asc' },
      take: 50,
    }),
  ]);

  return { today, overdue };
}

export async function getStats() {
  const [total, byStatus, withFollowUp] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.groupBy({ by: ['status'], _count: true }),
    prisma.prospect.count({ where: { followUpDate: { not: null } } }),
  ]);

  return {
    total,
    withFollowUp,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
}

export async function searchProspects(q: string, limit = 20) {
  if (!q.trim()) return [];
  return prisma.prospect.findMany({
    where: {
      OR: [
        { companyName: { contains: q, mode: 'insensitive' } },
        { instagramHandle: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q, mode: 'insensitive' } },
        { website: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });
}
