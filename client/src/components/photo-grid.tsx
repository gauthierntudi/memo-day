import { useState } from "react";
import { X, ImagePlus, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resizePhoto, resizePhotos } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PhotoGridProps {
  photos: string[];
  onChange?: (photos: string[]) => void;
  maxPhotos?: number;
  defaultVisible?: number;
  canEdit?: boolean;
  multiple?: boolean;
  thumbWidth?: number;
  thumbHeight?: number;
  uploadLabel?: string;
  icon?: "image" | "camera";
  testIdPrefix?: string;
}

export function PhotoGrid({
  photos,
  onChange,
  maxPhotos = 20,
  defaultVisible = 3,
  canEdit = true,
  multiple = true,
  thumbWidth = 96,
  thumbHeight = 96,
  uploadLabel = "Upload",
  icon = "image",
  testIdPrefix = "photo",
}: PhotoGridProps) {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const visiblePhotos = showAll ? photos : photos.slice(0, defaultVisible);
  const hiddenCount = photos.length - defaultVisible;
  const IconComp = icon === "camera" ? Camera : ImagePlus;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const remaining = maxPhotos - photos.length;
      const toUpload = Array.from(files).slice(0, remaining);
      let resized: Blob[];
      if (toUpload.length === 1) {
        const single = await resizePhoto(toUpload[0]);
        resized = [single];
      } else {
        resized = await resizePhotos(toUpload);
      }
      const formData = new FormData();
      resized.forEach(f => formData.append("photos", f));
      const res = await fetch("/api/uploads", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onChange?.([...photos, ...data.urls].slice(0, maxPhotos));
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const url = photos[index];
    try {
      await fetch("/api/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {}
    onChange?.(photos.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 items-end">
        {visiblePhotos.map((url, i) => (
          <div
            key={i}
            className="relative group rounded-md overflow-hidden border cursor-pointer"
            style={{ width: thumbWidth, height: thumbHeight }}
            data-testid={`${testIdPrefix}-${i}`}
          >
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
              onClick={() => setEnlargedPhoto(url)}
            />
            {canEdit && onChange && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-remove-${testIdPrefix}-${i}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {canEdit && onChange && photos.length < maxPhotos && (
          <label
            className="rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            style={{ width: thumbWidth, height: thumbHeight }}
            data-testid={`button-upload-${testIdPrefix}`}
          >
            <IconComp className="h-5 w-5 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground mt-1">
              {uploading ? "..." : uploadLabel}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>
      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 text-xs gap-1"
          onClick={() => setShowAll(prev => !prev)}
          data-testid={`button-toggle-${testIdPrefix}s`}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show all {photos.length} photos
            </>
          )}
        </Button>
      )}
      {enlargedPhoto && (
        <Dialog open onOpenChange={() => setEnlargedPhoto(null)}>
          <DialogContent className="max-w-3xl p-2" data-testid={`dialog-enlarged-${testIdPrefix}`}>
            <img src={enlargedPhoto} alt="Enlarged photo" className="w-full h-auto rounded-md" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
