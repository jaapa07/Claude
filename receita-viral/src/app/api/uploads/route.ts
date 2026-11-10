import { HttpError, json, requireUser, route } from "@/lib/api";
import { maxUploadBytes, saveUpload, sniff } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

/** Upload de imagem (qualquer usuário logado) ou vídeo curto (somente admin). */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000)) throw new HttpError(429, "Limite de uploads atingido. Tente mais tarde.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "Envie um arquivo no campo 'file'");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new HttpError(415, "Formato não suportado. Use JPG, PNG, WEBP, GIF ou MP4.");
  const isVideo = kind.type.startsWith("video/");
  if (isVideo && user.role !== "ADMIN") throw new HttpError(403, "Somente administradores podem enviar vídeos");
  if (buf.length > maxUploadBytes(isVideo ? "video" : "image")) {
    throw new HttpError(413, `Arquivo muito grande (máx. ${Math.round(maxUploadBytes(isVideo ? "video" : "image") / 1024 / 1024)} MB)`);
  }
  const url = await saveUpload(buf, kind.ext);
  return json({ url, type: kind.type }, 201);
});
