import { useRef, useState } from "react";

export function AvatarUpload({
  overrideUrl,
  fallbackUrl,
  name,
  onChange,
}: {
  overrideUrl: string | null;
  fallbackUrl: string | null;
  name: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = overrideUrl ?? fallbackUrl;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const json: { url?: string; error?: string } = await response.json();
      if (!response.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {displayUrl ? (
        <img src={displayUrl} alt={name} loading="lazy" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 font-serif text-lg text-accent-600">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col items-start gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : overrideUrl ? "Change photo" : "Upload photo"}
          </button>
          {overrideUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
            >
              Use Google photo
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
