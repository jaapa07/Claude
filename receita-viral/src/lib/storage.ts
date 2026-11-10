import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

const SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { type: "image/gif", ext: "gif", test: (b) => b.subarray(0, 4).toString() === "GIF8" },
  { type: "video/mp4", ext: "mp4", test: (b) => b.subarray(4, 8).toString() === "ftyp" },
];

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.type]));

/** Detecta o tipo real pelo conteúdo (não confia no nome/Content-Type enviado). */
export function sniff(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export function maxUploadBytes(kind: "image" | "video") {
  const mb = Number(process.env.UPLOAD_MAX_MB) || 5;
  return (kind === "video" ? mb * 6 : mb) * 1024 * 1024;
}

export async function saveUpload(buf: Buffer, ext: string): Promise<string> {
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  await mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, dir, name), buf);
  return `/api/uploads/${dir}/${name}`;
}

/** Lê um arquivo enviado, impedindo path traversal. */
export async function readUpload(parts: string[]): Promise<{ data: Buffer; type: string } | null> {
  if (!parts.every((p) => /^[\w.-]+$/.test(p) && p !== ".." && p !== ".")) return null;
  const full = path.resolve(UPLOAD_DIR, ...parts);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;
  const ext = path.extname(full).slice(1).toLowerCase();
  const type = MIME_BY_EXT[ext];
  if (!type) return null;
  try {
    return { data: await readFile(full), type };
  } catch {
    return null;
  }
}
