import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Extension is derived from the verified MIME type, never from the client filename.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(EXTENSION_BY_MIME).map(([mime, ext]) => [ext, mime]),
);

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return null;
}

export async function saveImageUpload(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size === 0) return { error: "Empty file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Image is too large (max 5 MB)." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." };

  const name = `${randomBytes(16).toString("hex")}.${EXTENSION_BY_MIME[mime]}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), bytes);
  return { url: `/uploads/${name}` };
}

export async function readUpload(name: string): Promise<{ bytes: Buffer; mime: string } | null> {
  // Strict allowlisted shape (hex + known extension) — no path traversal possible.
  const match = /^([0-9a-f]{32})\.(jpg|png|webp|gif)$/.exec(name);
  if (!match) return null;
  const mime = MIME_BY_EXTENSION[match[2]];
  try {
    const bytes = await readFile(path.join(UPLOADS_DIR, name));
    return { bytes, mime };
  } catch {
    return null;
  }
}
