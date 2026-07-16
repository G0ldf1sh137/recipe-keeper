import { randomBytes } from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION ?? "us-east-2";
const S3_PUBLIC_URL_BASE =
  process.env.S3_PUBLIC_URL_BASE ?? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

const s3 = new S3Client({
  region: S3_REGION,
  // Without these, a network/credential problem hangs the upload request indefinitely
  // instead of failing — requestTimeout alone only warns; throwOnRequestTimeout makes it throw.
  requestHandler: { connectionTimeout: 5000, requestTimeout: 10000, throwOnRequestTimeout: true },
});

// Extension is derived from the verified MIME type, never from the client filename.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

function sniffPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function savePdfUpload(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size === 0) return { error: "Empty file." };
  if (file.size > MAX_PDF_BYTES) return { error: "PDF is too large (max 10 MB)." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffPdf(bytes)) return { error: "Unsupported file type. Upload a PDF." };

  const name = `${randomBytes(16).toString("hex")}.pdf`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: name,
        Body: bytes,
        ContentType: "application/pdf",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error("S3 upload failed:", error);
    return { error: "Could not upload the PDF. Please try again." };
  }
  return { url: `${S3_PUBLIC_URL_BASE}/${name}` };
}

export async function uploadImageBytes(bytes: Uint8Array): Promise<{ url: string } | { error: string }> {
  if (bytes.length === 0) return { error: "Empty file." };
  if (bytes.length > MAX_UPLOAD_BYTES) return { error: "Image is too large (max 5 MB)." };

  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." };

  const name = `${randomBytes(16).toString("hex")}.${EXTENSION_BY_MIME[mime]}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: name,
        Body: bytes,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error("S3 upload failed:", error);
    return { error: "Could not upload the image. Please try again." };
  }
  return { url: `${S3_PUBLIC_URL_BASE}/${name}` };
}

export async function saveImageUpload(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size === 0) return { error: "Empty file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Image is too large (max 5 MB)." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  return uploadImageBytes(bytes);
}

// Best-effort cleanup: deletes URLs pointing at our own bucket, ignoring
// anything else and swallowing errors so a cleanup failure never blocks the
// recipe delete/update it's attached to.
export async function deleteImageUrls(urls: string[]) {
  const prefix = `${S3_PUBLIC_URL_BASE}/`;
  const keys = urls.filter((url) => url.startsWith(prefix)).map((url) => url.slice(prefix.length));
  if (keys.length === 0) return;

  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  } catch (error) {
    console.error("S3 cleanup failed:", error);
  }
}

export async function rotateImageUpload(sourceUrl: string): Promise<{ url: string } | { error: string }> {
  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch {
    return { error: "Could not fetch the image to rotate." };
  }
  if (!response.ok) return { error: "Could not fetch the image to rotate." };

  const original = new Uint8Array(await response.arrayBuffer());
  let rotated: Buffer;
  try {
    rotated = await sharp(original).rotate(-90).toBuffer();
  } catch (error) {
    console.error("Image rotation failed:", error);
    return { error: "Could not rotate this image." };
  }
  return uploadImageBytes(rotated);
}
