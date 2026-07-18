import QRCode from "qrcode";

export async function generateQrCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 300, margin: 1 });
}
