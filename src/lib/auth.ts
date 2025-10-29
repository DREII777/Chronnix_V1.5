import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/data/prisma";

const SESSION_COOKIE = "chronnix_session";

function generateCode(): string {
  const digits = crypto.randomInt(0, 10 ** 8).toString().padStart(8, "0");
  return digits;
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function slugFromEmail(email: string): string {
  const [localPart] = email.split("@");
  return `${localPart.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${crypto.randomBytes(3).toString("hex")}`;
}

export async function requestLoginCode(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Adresse email invalide");
  }

  let user = await prisma.user.findUnique({
    where: { email: normalized },
    include: { account: true },
  });

  if (!user || !user.account) {
    const account = user?.account
      ? user.account
      : await prisma.account.create({
        data: {
          name: "Nouvelle entreprise",
          slug: slugFromEmail(normalized),
          primaryEmail: normalized,
          companySettings: {
            create: {},
          },
        },
      });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalized,
          accountId: account.id,
        },
        include: { account: true },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { accountId: account.id },
        include: { account: true },
      });
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.authCode.create({
    data: {
      userId: user.id,
      code,
      expiresAt,
    },
  });

  await sendAuthCodeEmail(normalized, code);
}

export async function verifyLoginCode(email: string, code: string): Promise<NextResponse> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (!user) {
    throw new Error("Utilisateur introuvable");
  }

  const authCode = await prisma.authCode.findFirst({
    where: {
      userId: user.id,
      code,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!authCode) {
    throw new Error("Code invalide ou expiré");
  }

  await prisma.$transaction([
    prisma.authCode.update({ where: { id: authCode.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: new Date(),
        },
      },
    }),
  ]);

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return response;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const session = await prisma.userSession.findFirst({
    where: {
      token: sessionToken,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          account: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return session.user;
}

export async function requireUser(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

export async function logoutResponse(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.userSession.deleteMany({ where: { token } });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}

async function sendAuthCodeEmail(email: string, code: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[auth] Code de connexion pour ${email} : ${code}`);
    return;
  }

  if (!process.env.AUTH_EMAIL_SENDER || !process.env.AUTH_EMAIL_CLIENT) {
    console.warn("AUTH_EMAIL_SENDER / AUTH_EMAIL_CLIENT non configurés. Aucun email envoyé.");
    return;
  }

  // TODO: intégrer un service d'email (SendGrid, Resend, etc.)
  console.log(`Code ${code} pour ${email}. Configurez un provider d'email.`);
}
