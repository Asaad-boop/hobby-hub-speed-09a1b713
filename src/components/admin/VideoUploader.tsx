import { useRef, useState } from "react";
import { Loader2, Video as VideoIcon, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUCKET = "reel-videos";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

async function uploadVideo(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Shudhu video file upload kora jabe");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Video 50MB er beshi hote parbe na");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function VideoUploader({
  value,
  onChange,
  folder = "reels",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadVideo(file, folder);
      onChange(url);
      toast.success("Video upload holo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="group relative aspect-[9/16] w-32 overflow-hidden rounded-xl border border-border bg-muted">
          <video src={value} muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={() => onChange("")}
              disabled={busy}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "flex aspect-[9/16] w-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-muted/60 hover:text-foreground",
            busy && "opacity-60",
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <VideoIcon className="h-5 w-5" />
              <span>Upload video</span>
            </>
          )}
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">MP4/WebM · max 50MB · 9:16 ratio recommended</p>
    </div>
  );
}
