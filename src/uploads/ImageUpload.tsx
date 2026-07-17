import { useRef, useState } from "react";

export function MultiImageUpload({
  imageUrls,
  onChange,
  label = "Add photos",
  previewClassName = "h-24 w-24 rounded-lg object-cover",
  coverUrl,
  onSetCover,
}: {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  previewClassName?: string;
  coverUrl?: string | null;
  onSetCover?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [rotating, setRotating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<string> {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const json: { url?: string; error?: string } = await response.json();
    if (!response.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
    return json.url;
  }

  async function handleRotate(url: string) {
    setRotating(url);
    setError(null);
    try {
      const response = await fetch("/api/rotate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json: { url?: string; error?: string } = await response.json();
      if (!response.ok || !json.url) throw new Error(json.error ?? "Rotation failed.");
      const newUrl = json.url;
      onChange(imageUrls.map((u) => (u === url ? newUrl : u)));
      if (onSetCover && coverUrl === url) onSetCover(newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotation failed. Please try again.");
    } finally {
      setRotating(null);
    }
  }

  async function handleFiles(files: File[]) {
    setUploading(true);
    setError(null);
    const added: string[] = [];
    try {
      for (const file of files) {
        added.push(await uploadOne(file));
      }
      onChange([...imageUrls, ...added]);
    } catch (e) {
      // Keep whatever did upload before the failure.
      if (added.length > 0) onChange([...imageUrls, ...added]);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) void handleFiles(files);
        }}
      />
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt=""
                className={`${previewClassName} ${url === coverUrl ? "ring-2 ring-accent-500 ring-offset-1" : ""}`}
              />
              <button
                type="button"
                onClick={() => handleRotate(url)}
                disabled={rotating === url}
                aria-label="Rotate photo"
                className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70 disabled:opacity-50"
              >
                {rotating === url ? "…" : "↺"}
              </button>
              {onSetCover && imageUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => onSetCover(url)}
                  aria-pressed={url === coverUrl}
                  className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    url === coverUrl ? "bg-accent-600 text-white" : "bg-black/50 text-white hover:bg-black/70"
                  }`}
                >
                  {url === coverUrl ? "★ Cover" : "☆ Set as cover"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(imageUrls.filter((_, idx) => idx !== i))}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white hover:bg-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : label}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
