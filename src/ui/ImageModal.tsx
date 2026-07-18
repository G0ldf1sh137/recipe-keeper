import { useEffect } from "react";

export function ImageModal({
  image,
  onClose,
}: {
  image: { src: string; alt: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!image) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <img src={image.src} alt={image.alt} className="max-h-full max-w-full rounded-lg object-contain" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
