import { ActivityType, type TemplateCategory } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { assertFound, AppError } from '../utils/errors.js';
import { buildWhatsAppUrl } from '../utils/phone.js';
import { renderTemplate } from '../utils/template.js';

export async function listTemplates() {
  return prisma.template.findMany({ orderBy: { updatedAt: 'desc' } });
}

export async function getTemplate(id: string) {
  return assertFound(await prisma.template.findUnique({ where: { id } }), 'Template not found');
}

export async function createTemplate(data: {
  name: string;
  category: TemplateCategory;
  message: string;
}) {
  return prisma.template.create({ data });
}

export async function updateTemplate(
  id: string,
  data: Partial<{ name: string; category: TemplateCategory; message: string }>,
) {
  assertFound(await prisma.template.findUnique({ where: { id } }), 'Template not found');
  return prisma.template.update({ where: { id }, data });
}

export async function deleteTemplate(id: string) {
  assertFound(await prisma.template.findUnique({ where: { id } }), 'Template not found');
  await prisma.template.delete({ where: { id } });
}

export async function generateWhatsApp(input: {
  prospectId: string;
  templateId?: string;
  message?: string;
}) {
  const prospect = assertFound(
    await prisma.prospect.findUnique({ where: { id: input.prospectId } }),
    'Prospect not found',
  );

  if (!prospect.phoneNumber) {
    throw new AppError(400, 'Prospect has no phone number');
  }

  let message = input.message ?? '';
  let templateName: string | undefined;

  if (input.templateId) {
    const template = assertFound(
      await prisma.template.findUnique({ where: { id: input.templateId } }),
      'Template not found',
    );
    message = renderTemplate(template.message, {
      company: prospect.companyName,
      instagram: prospect.instagramHandle,
      website: prospect.website,
      phone: prospect.phoneNumber,
      score: prospect.score,
    });
    templateName = template.name;
  } else if (input.message) {
    message = renderTemplate(input.message, {
      company: prospect.companyName,
      instagram: prospect.instagramHandle,
      website: prospect.website,
      phone: prospect.phoneNumber,
      score: prospect.score,
    });
  } else {
    throw new AppError(400, 'Provide templateId or message');
  }

  const url = buildWhatsAppUrl(prospect.phoneNumber, message);

  await prisma.$transaction([
    prisma.activity.create({
      data: {
        prospectId: prospect.id,
        type: ActivityType.MESSAGE_GENERATED,
        metadata: { templateId: input.templateId, templateName },
      },
    }),
    ...(input.templateId
      ? [
          prisma.activity.create({
            data: {
              prospectId: prospect.id,
              type: ActivityType.TEMPLATE_USED,
              metadata: { templateId: input.templateId, templateName },
            },
          }),
        ]
      : []),
    prisma.prospect.update({
      where: { id: prospect.id },
      data: { lastContactDate: new Date() },
    }),
  ]);

  return { url, message, phone: prospect.phoneNumber };
}

export function previewTemplate(
  message: string,
  vars: {
    company?: string | null;
    instagram?: string | null;
    website?: string | null;
    phone?: string | null;
    score?: number | null;
  },
) {
  return { preview: renderTemplate(message, vars) };
}
