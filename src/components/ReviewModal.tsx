import { useState, useRef, useEffect } from "react";
import { X, Star, Camera, Trash2, Check } from "lucide-react";

export type NewReview = {
  name: string;
  location: string;
  rating: number;
  text: string;
  photos: string[];
  photoFiles: File[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  onSubmit: (review: NewReview) => void | Promise<void>;
};

const MAX_PHOTOS = 4;
const MAX_TEXT = 500;

export default function ReviewModal({ open, onClose, productTitle, onSubmit }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const reset = () => {
    setRating(0); setHover(0); setName(""); setLocation(""); setText(""); setPhotos([]); setPhotoFiles([]); setSubmitted(false); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError("");
    const remaining = MAX_PHOTOS - photos.length;
    const valid = Array.from(files).slice(0, remaining).filter((f) => {
      if (!f.type.startsWith("image/")) { setError("Only image files allowed"); return false; }
      if (f.size > 5 * 1024 * 1024) { setError("Each image must be under 5MB"); return false; }
      return true;
    });
    Promise.all(
      valid.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(f);
          }),
      ),
    ).then((urls) => {
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
      setPhotoFiles((p) => [...p, ...valid].slice(0, MAX_PHOTOS));
    });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rating === 0) return setError("Please select a star rating");
    const trimmedName = name.trim();
    const trimmedLoc = location.trim();
    const trimmedText = text.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) return setError("Name must be 2-50 characters");
    if (trimmedLoc.length < 2 || trimmedLoc.length > 50) return setError("Location must be 2-50 characters");
    if (trimmedText.length < 10) return setError("Review must be at least 10 characters");
    if (trimmedText.length > MAX_TEXT) return setError(`Review must be under ${MAX_TEXT} characters`);

    setSubmitting(true);
    try {
      await onSubmit({ name: trimmedName, location: trimmedLoc, rating, text: trimmedText, photos, photoFiles });
      setSubmitted(true);
      setTimeout(handleClose, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted transition hover:bg-muted/70"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-extrabold">Thanks for your review!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your feedback helps other shoppers decide.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              <Star className="h-3 w-3 fill-primary" /> Verified Buyer Review
            </div>
            <h2 id="review-modal-title" className="mt-2 text-2xl font-extrabold leading-tight">
              Write a review
            </h2>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">For: {productTitle}</p>

            {/* Stars */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your rating *</p>
              <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHover(i)}
                    aria-label={`${i} star${i > 1 ? "s" : ""}`}
                    className="rounded-md p-1 transition hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 transition ${
                        (hover || rating) >= i
                          ? "fill-primary text-primary drop-shadow-sm"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
                {(hover || rating) > 0 && (
                  <span className="ml-2 text-sm font-bold text-primary">
                    {["", "Poor", "Fair", "Good", "Very good", "Excellent"][hover || rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Name + location */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone *</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                  className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary"
                />
              </div>
            </div>

            {/* Text */}
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your review *</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
                rows={4}
                placeholder="Share your honest experience with this product..."
                className="mt-1 w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">{text.length}/{MAX_TEXT}</p>
            </div>

            {/* Photos */}
            <div className="mt-3">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Add photos (optional) — {photos.length}/{MAX_PHOTOS}
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photos.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-border">
                    <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotos((p) => p.filter((_, j) => j !== i));
                        setPhotoFiles((p) => p.filter((_, j) => j !== i));
                      }}
                      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80 text-background opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-full border-2 border-border bg-background py-3 text-sm font-bold transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[1.4] rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-lg transition hover:shadow-xl disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
