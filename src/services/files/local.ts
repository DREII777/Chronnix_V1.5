import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const rootDir = process.cwd();
const uploadDir = path.resolve(rootDir, process.env.FILE_UPLOAD_DIR ?? "./public/uploads");
const publicPrefix = "/uploads";

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export function createStorageFileName(originalName: string) {
  const ext = path.extname(originalName) || "";
  const base = crypto.randomUUID();
  const timestamp = Date.now();
  return `${timestamp}-${base}${ext}`;
}

export async function saveFileFromBuffer(fileName: string, buffer: Buffer) {
  await ensureUploadDir();
  const location = path.join(uploadDir, fileName);
  await fs.writeFile(location, buffer);
  return {
    fileName,
    localPath: location,
    publicUrl: `${publicPrefix}/${fileName}`,
  };
}
