import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, TemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@groovcrm.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  const templateCount = await prisma.template.count();
  if (templateCount === 0) {
    await prisma.template.createMany({
      data: [
        {
          name: 'Website Offer',
          category: TemplateCategory.WEBSITE_OFFER,
          message: `Halo {{company}},

Kami GroovDev.

Kami melihat bisnis Anda memiliki potensi yang sangat bagus. Apakah Anda tertarik untuk memiliki website profesional yang bisa membantu meningkatkan penjualan?

Salam,
GroovDev`,
        },
        {
          name: 'Follow Up Ringkas',
          category: TemplateCategory.FOLLOW_UP,
          message: `Halo {{company}},

Menindaklanjuti pesan sebelumnya. Apakah masih ada minat untuk membahas website / digital presence bisnis Anda?

Terima kasih,
GroovDev`,
        },
        {
          name: 'SEO Intro',
          category: TemplateCategory.SEO,
          message: `Halo {{company}},

Kami GroovDev. Website {{website}} punya potensi untuk lebih mudah ditemukan di Google.

Mau kami bantu audit singkat SEO-nya?

Salam,
GroovDev`,
        },
      ],
    });
  }

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
