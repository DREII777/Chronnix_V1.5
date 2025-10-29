import { Prisma, type ClientProfile } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { slugify } from "@/utils/strings";

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    timeEntries: true;
    assignments: true;
  };
}>;

type ClientProfileRecord = {
  id: number;
  name: string;
  slug: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type ClientGroup = {
  name: string;
  slug: string;
  projects: ProjectWithRelations[];
  profile: ClientProfile | null;
};

type ClientSummary = {
  name: string;
  slug: string;
  totalProjects: number;
  activeProjects: number;
  totalHours: number;
  totalAmount: number;
  workerCount: number;
  lastActivity: Date | null;
  profile: ClientProfileRecord | null;
};

type ClientDetail = {
  name: string;
  slug: string;
  profile: ClientProfileRecord | null;
  projects: Array<{
    id: number;
    name: string;
    archived: boolean;
    billingRate: number | null;
    defaultHours: number | null;
    clientName: string | null;
    totalHours: number;
    totalAmount: number;
    workerCount: number;
    lastActivity: Date | null;
  }>;
};

export type ClientProfileInput = {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function listClients(accountId: number): Promise<ClientSummary[]> {
  const groups = await getClientGroups(accountId);

  return groups
    .map(({ name, slug, projects, profile }) => {
      const totals = aggregateProjects(projects);
      return {
        name,
        slug,
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => !project.archived).length,
        totalHours: totals.totalHours,
        totalAmount: totals.totalAmount,
        workerCount: totals.workerCount,
        lastActivity: totals.lastActivity,
        profile: profile ? mapProfile(profile) : null,
      } satisfies ClientSummary;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getClientBySlug(accountId: number, slug: string): Promise<ClientDetail | null> {
  const groups = await getClientGroups(accountId);
  const client = groups.find((item) => item.slug === slug);
  if (!client) return null;

  return {
    name: client.name,
    slug: client.slug,
    profile: client.profile ? mapProfile(client.profile) : null,
    projects: client.projects.map((project) => {
      const totals = aggregateProjects([project]);
      return {
        id: project.id,
        name: project.name,
        archived: project.archived,
        billingRate: project.billingRate ? Number(project.billingRate) : null,
        defaultHours: project.defaultHours ? Number(project.defaultHours) : null,
        clientName: project.clientName,
        totalHours: totals.totalHours,
        totalAmount: totals.totalAmount,
        workerCount: totals.workerCount,
        lastActivity: totals.lastActivity,
      };
    }),
  } satisfies ClientDetail;
}

export async function createClientProfile(accountId: number, input: ClientProfileInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Le nom du client est requis");
  }

  const slug = await generateUniqueClientSlug(accountId, name);

  const profile = await prisma.clientProfile.create({
    data: {
      accountId,
      name,
      slug,
      contactName: normalizeOptional(input.contactName),
      email: normalizeOptional(input.email),
      phone: normalizeOptional(input.phone),
      address: normalizeOptional(input.address),
      notes: normalizeOptional(input.notes),
    },
  });

  return mapProfile(profile);
}

export async function updateClientProfile(
  accountId: number,
  profileId: number,
  input: Partial<ClientProfileInput>,
) {
  const existing = await prisma.clientProfile.findFirst({ where: { id: profileId, accountId } });
  if (!existing) {
    throw new Error("Client introuvable");
  }

  const data: Prisma.ClientProfileUpdateInput = {};
  let slug = existing.slug;
  let name = existing.name;

  if (input.name !== undefined) {
    const nextName = input.name.trim();
    if (!nextName) {
      throw new Error("Le nom du client est requis");
    }
    if (nextName !== existing.name) {
      name = nextName;
      slug = await generateUniqueClientSlug(accountId, nextName, existing.id);
      data.name = nextName;
      data.slug = slug;
      await prisma.project.updateMany({
        where: { clientName: existing.name, accountId },
        data: { clientName: nextName },
      });
    }
  }

  if (input.contactName !== undefined) {
    data.contactName = normalizeOptional(input.contactName);
  }
  if (input.email !== undefined) {
    data.email = normalizeOptional(input.email);
  }
  if (input.phone !== undefined) {
    data.phone = normalizeOptional(input.phone);
  }
  if (input.address !== undefined) {
    data.address = normalizeOptional(input.address);
  }
  if (input.notes !== undefined) {
    data.notes = normalizeOptional(input.notes);
  }

  const updated = Object.keys(data).length
    ? await prisma.clientProfile.update({
        where: { id: profileId },
        data,
      })
    : existing;

  return { profile: mapProfile(updated), slug, name };
}

export async function getClientProfileBySlug(accountId: number, slug: string) {
  const profile = await prisma.clientProfile.findFirst({ where: { slug, accountId } });
  return profile ? mapProfile(profile) : null;
}

async function getClientGroups(accountId: number): Promise<ClientGroup[]> {
  const [projects, profiles] = await Promise.all([
    prisma.project.findMany({
      where: { accountId },
      include: {
        timeEntries: true,
        assignments: true,
      },
      orderBy: [{ clientName: "asc" }, { name: "asc" }],
    }),
    prisma.clientProfile.findMany({ where: { accountId } }),
  ]);

  const profileByName = new Map<string, ClientProfile>();
  const usedSlugs = new Set<string>();

  for (const profile of profiles) {
    profileByName.set(profile.name.trim().toLowerCase(), profile);
    usedSlugs.add(profile.slug);
  }

  const buckets = new Map<string, ClientGroup>();

  const ensureSlug = (name: string) => {
    const base = slugify(name) || "client";
    if (!usedSlugs.has(base) && !buckets.has(base)) {
      usedSlugs.add(base);
      return base;
    }
    let index = 2;
    let candidate = `${base}-${index}`;
    while (usedSlugs.has(candidate) || buckets.has(candidate)) {
      index += 1;
      candidate = `${base}-${index}`;
    }
    usedSlugs.add(candidate);
    return candidate;
  };

  for (const project of projects) {
    const rawName = project.clientName?.trim() || "Client indéfini";
    const normalized = rawName.toLowerCase();
    const matchedProfile = profileByName.get(normalized) ?? null;
    const slug = matchedProfile ? matchedProfile.slug : ensureSlug(rawName);
    const displayName = matchedProfile ? matchedProfile.name : rawName;

    const existing = buckets.get(slug);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(slug, {
        name: displayName,
        slug,
        projects: [project],
        profile: matchedProfile,
      });
    }
  }

  for (const profile of profiles) {
    if (!buckets.has(profile.slug)) {
      buckets.set(profile.slug, {
        name: profile.name,
        slug: profile.slug,
        projects: [],
        profile,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

type AggregatedValues = {
  totalHours: number;
  totalAmount: number;
  workerCount: number;
  lastActivity: Date | null;
};

function aggregateProjects(projects: ProjectWithRelations[]): AggregatedValues {
  let totalHours = 0;
  let totalAmount = 0;
  let lastActivity: Date | null = null;
  const workers = new Set<number>();

  for (const project of projects) {
    for (const entry of project.timeEntries) {
      const hours = Number(entry.hours ?? 0);
      totalHours += hours;
      if (project.billingRate) {
        totalAmount += hours * Number(project.billingRate);
      }
      if (!lastActivity || entry.date > lastActivity) {
        lastActivity = entry.date;
      }
    }
    for (const assignment of project.assignments) {
      workers.add(assignment.workerId);
    }
  }

  return {
    totalHours,
    totalAmount,
    workerCount: workers.size,
    lastActivity,
  };
}

function mapProfile(profile: ClientProfile): ClientProfileRecord {
  return {
    id: profile.id,
    name: profile.name,
    slug: profile.slug,
    contactName: profile.contactName ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    address: profile.address ?? null,
    notes: profile.notes ?? null,
  } satisfies ClientProfileRecord;
}

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function generateUniqueClientSlug(accountId: number, name: string, excludeId?: number) {
  const base = slugify(name) || "client";
  const candidates = await prisma.clientProfile.findMany({
    where: {
      slug: { startsWith: base },
      accountId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { slug: true },
  });
  const existing = new Set(candidates.map((candidate) => candidate.slug));
  if (!existing.has(base)) {
    return base;
  }
  let index = 2;
  let candidate = `${base}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}
