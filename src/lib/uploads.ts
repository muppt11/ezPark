import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local disk storage for listing photos (MVP). Files live in ./uploads (gitignored) and are
 * served by app/uploads/[file]/route.ts. Before launch, move to object storage (S3/R2) — see README.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function savePhoto(file: File): Promise<{ url: string } | { error: string }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP photo." };
  if (file.size > MAX_BYTES) return { error: "That photo is over 8 MB. Try a smaller one." };
  if (file.size === 0) return { error: "Add a photo of your driveway." };

  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${name}` };
}
