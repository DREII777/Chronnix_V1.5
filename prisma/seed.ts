import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.timeEntry.deleteMany();
  await prisma.projectWorker.deleteMany();
  await prisma.document.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.project.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.account.deleteMany();

  const account = await prisma.account.create({
    data: {
      name: "Chronnix Entreprise",
      slug: "chronnix",
      primaryEmail: "contact@chronnix.local",
      phone: "+3212345678",
      addressLine1: "Rue du Test 123",
      postalCode: "1000",
      city: "Bruxelles",
      country: "Belgique",
      locale: "fr-BE",
      timezone: "Europe/Brussels",
    },
  });

  await prisma.companySettings.create({
    data: {
      accountId: account.id,
      verified: true,
    },
  });

  const alice = await prisma.worker.create({
    data: {
      accountId: account.id,
      firstName: "Alice",
      lastName: "Dupont",
      email: "alice.dupont@example.com",
      phone: "+32470111222",
      nationalId: "93010112345",
      status: "SALARIE",
      vatNumber: null,
      payRate: new Prisma.Decimal(32),
      chargesPct: new Prisma.Decimal(12.5),
      includeInExport: true,
    },
  });

  const bruno = await prisma.worker.create({
    data: {
      accountId: account.id,
      firstName: "Bruno",
      lastName: "Martin",
      email: "bruno.martin@example.com",
      phone: "+32460123456",
      nationalId: "88010198765",
      status: "ASSOCIE",
      vatNumber: "BE0123456789",
      payRate: new Prisma.Decimal(40),
      chargesPct: new Prisma.Decimal(0),
      includeInExport: true,
    },
  });

  const claire = await prisma.worker.create({
    data: {
      accountId: account.id,
      firstName: "Claire",
      lastName: "Rossi",
      email: "claire.rossi@example.com",
      phone: "+32485123456",
      nationalId: "99010145678",
      status: "INDEPENDANT",
      vatNumber: "BE9876543210",
      payRate: new Prisma.Decimal(55),
      chargesPct: new Prisma.Decimal(0),
      includeInExport: false,
    },
  });

  await prisma.workerAdditionalCost.createMany({
    data: [
      {
        workerId: alice.id,
        label: "Prime ponctuelle",
        unit: "DAY",
        amount: new Prisma.Decimal(50),
      },
      {
        workerId: bruno.id,
        label: "Location machine",
        unit: "HOUR",
        amount: new Prisma.Decimal(5),
      },
    ],
  });

  await prisma.team.create({
    data: {
      accountId: account.id,
      name: "Equipe A",
      members: {
        create: [
          { workerId: alice.id, role: "Chef d'équipe" },
          { workerId: bruno.id, role: "Ouvrier" },
        ],
      },
    },
  });

  const alpha = await prisma.project.create({
    data: {
      accountId: account.id,
      name: "Chantier Alpha",
      clientName: "Client One",
      billingRate: new Prisma.Decimal(65),
      defaultHours: new Prisma.Decimal(8),
      archived: false,
    },
  });

  const beta = await prisma.project.create({
    data: {
      accountId: account.id,
      name: "Chantier Beta",
      clientName: "Client Two",
      billingRate: new Prisma.Decimal(72.5),
      defaultHours: new Prisma.Decimal(6),
      archived: false,
    },
  });

  await prisma.clientProfile.createMany({
    data: [
      {
        accountId: account.id,
        name: "Client One",
        slug: "client-one",
        contactName: "Jean Client",
        email: "jean.client@example.com",
        phone: "+3220000001",
        address: "12 Avenue des Clients, 1000 Bruxelles",
        notes: "Client historique",
      },
      {
        accountId: account.id,
        name: "Client Two",
        slug: "client-two",
        contactName: "Marie Prospect",
        email: "marie.prospect@example.com",
        phone: "+3220000002",
        address: "45 Rue des Partenaires, 1050 Ixelles",
        notes: null,
      },
    ],
  });

  await prisma.projectWorker.createMany({
    data: [
      { projectId: alpha.id, workerId: alice.id },
      { projectId: alpha.id, workerId: bruno.id },
      { projectId: beta.id, workerId: bruno.id },
      { projectId: beta.id, workerId: claire.id },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        workerId: alice.id,
        kind: "CAREER_ATTESTATION",
        fileName: "alice_attestation.pdf",
        fileUrl: "/uploads/alice_attestation.pdf",
        validUntil: new Date(new Date().getFullYear(), 11, 31),
      },
      {
        workerId: alice.id,
        kind: "CI",
        fileName: "alice_ci.pdf",
        fileUrl: "/uploads/alice_ci.pdf",
        validUntil: new Date(new Date().getFullYear(), 11, 31),
      },
      {
        workerId: alice.id,
        kind: "VCA",
        fileName: "alice_vca.pdf",
        fileUrl: "/uploads/alice_vca.pdf",
        validUntil: new Date(new Date().getFullYear(), 5, 30),
      },
      {
        workerId: bruno.id,
        kind: "CAREER_ATTESTATION",
        fileName: "bruno_attestation.pdf",
        fileUrl: "/uploads/bruno_attestation.pdf",
        validUntil: new Date(new Date().getFullYear(), 3, 15),
      },
      {
        workerId: bruno.id,
        kind: "CI",
        fileName: "bruno_ci.pdf",
        fileUrl: "/uploads/bruno_ci.pdf",
        validUntil: new Date(new Date().getFullYear(), 3, 15),
      },
    ],
  });

  const referenceMonth = new Date();
  referenceMonth.setDate(1);

  const entriesData: Prisma.TimeEntryCreateManyInput[] = [];
  for (let day = 1; day <= 5; day++) {
    const date = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), day);
    if (day <= 3) {
      entriesData.push(
        {
          projectId: alpha.id,
          workerId: alice.id,
          date,
          hours: new Prisma.Decimal(8),
          status: "WORKED",
          note: day === 1 ? "Démarrage chantier" : null,
          startTime: "08:00",
          endTime: "16:00",
        },
        {
          projectId: alpha.id,
          workerId: bruno.id,
          date,
          hours: new Prisma.Decimal(7.5),
          status: "WORKED",
          note: null,
          startTime: "08:00",
          endTime: "15:30",
        },
      );
    } else {
      entriesData.push({
        projectId: beta.id,
        workerId: bruno.id,
        date,
        hours: new Prisma.Decimal(day === 5 ? 4 : 6),
        status: "WORKED",
        note: null,
        startTime: day === 5 ? "08:00" : "08:00",
        endTime: day === 5 ? "12:00" : "14:00",
      });
    }
  }

  await prisma.timeEntry.createMany({ data: entriesData });

  await prisma.companySettings.create({
    data: {
      id: 1,
      accountId: account.id,
      bceFileName: "bce_2024.pdf",
      bceFileUrl: "/uploads/bce_2024.pdf",
      validUntil: new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 15),
      verified: true,
    },
  });
}

main()
  .then(async () => {
    console.log("Database seeded successfully");
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
