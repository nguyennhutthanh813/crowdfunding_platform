import { PrismaClient, CampaignStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: {
      OR: [
        { id: '384e4406-8dbd-420d-a983-ed110e1d7559' },
        { slug: 'bep-nho-khong-rac' },
      ],
    },
  });

  if (campaign) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.IN_REVIEW,
        submittedAt: new Date(),
      },
    });
    console.log(`Campaign ${campaign.title} (${campaign.id}) is set to IN_REVIEW`);
  } else {
    console.log('Campaign not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
