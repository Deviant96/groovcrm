import { z } from 'zod';
import { ProspectStatus, TemplateCategory } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const prospectCreateSchema = z.object({
  companyName: z.string().min(1),
  instagramHandle: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  score: z.number().int().min(0).max(100).optional().default(0),
  hasWebsite: z.boolean().optional(),
  status: z.nativeEnum(ProspectStatus).optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  lastContactDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const prospectUpdateSchema = prospectCreateSchema.partial();

export const prospectQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ProspectStatus).optional(),
  hasWebsite: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  scoreMin: z.coerce.number().optional(),
  scoreMax: z.coerce.number().optional(),
  followUp: z.enum(['today', 'overdue', 'upcoming', 'none']).optional(),
  hasInstagram: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  hasPhone: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  hasWebsiteUrl: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
  sortBy: z
    .enum([
      'companyName',
      'instagramHandle',
      'phoneNumber',
      'website',
      'hasWebsite',
      'score',
      'status',
      'followUpDate',
      'lastContactDate',
      'createdAt',
      'updatedAt',
    ])
    .optional()
    .default('updatedAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.nativeEnum(ProspectStatus),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const noteCreateSchema = z.object({
  content: z.string().min(1),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(TemplateCategory).optional().default(TemplateCategory.GENERAL),
  message: z.string().min(1),
});

export const templateUpdateSchema = templateCreateSchema.partial();

export const whatsappGenerateSchema = z.object({
  prospectId: z.string().min(1),
  templateId: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
});

export const importMappingSchema = z.object({
  companyName: z.string().min(1),
  instagramHandle: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  score: z.string().optional().nullable(),
  hasWebsite: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  lastContactDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const importConfirmSchema = z.object({
  mapping: importMappingSchema,
  rows: z.array(z.record(z.string(), z.string().nullable())).min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
