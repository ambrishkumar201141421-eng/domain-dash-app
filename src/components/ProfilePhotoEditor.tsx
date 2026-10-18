import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { AVATAR_BUCKET, AVATAR_TYPES, validateAvatarFile } from "@/lib/avatar";

const VIEW = 224; // crop circle size in px
const OUT = 512; // saved image size

type Pick = { url: string; img: HTMLImageElement };

export function ProfilePhotoEditor({ userId, name, current }: { userId: string; name: string; current: string | null }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => () => void (pick && URL.revokeObjectURL(pick.url)), [pick]);

  const base = pick ? VIEW / Math.min(pick.img.naturalWidth, pick.img.naturalHeight) : 1;
  const w = pick ? pick.img.naturalWidth * base * zoom : 0;
  const h = pick ? pick.img.naturalHeight * base * zoom : 0;
  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEW - w, x)),
    y: Math.min(0, Math.max(VIEW - h, y)),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) return void toast.error(err);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = VIEW / Math.min(img.naturalWidth, img.naturalHeight);
      setZoom(1);
      setPos({ x: (VIEW - img.naturalWidth * s) / 2, y: (VIEW - img.naturalHeight * s) / 2 });
      setPick({ url, img });
    };
    img.onerror = () => toast.error("That file couldn't be read as an image.");
    img.src = url;
  };

  const setZoomKeep = (z: number) => {
    if (!pick) return;
    const c = VIEW / 2;
    const ratio = z / zoom;
    const nw = pick.img.naturalWidth * base * z;
    const nh = pick.img.naturalHeight * base * z;
    const x = c - (c - pos.x) * ratio;
    const y = c - (c - pos.y) * ratio;
    setZoom(z);
    setPos({ x: Math.min(0, Math.max(VIEW - nw, x)), y: Math.min(0, Math.max(VIEW - nh, y)) });
  };

  const removeOld = async (old: string | null) => {
    // Only files in this user's own folder are ever removed (also enforced by storage rules).
    if (old?.startsWith(`${AVATAR_BUCKET}/${userId}/`)) {
      await supabase.storage.from(AVATAR_BUCKET).remove([old.replace(`${AVATAR_BUCKET}/`, "")]);
    }
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["participants"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task"] });
    qc.invalidateQueries({ queryKey: ["chats"] });
    qc.invalidateQueries({ queryKey: ["chat"] });
    qc.invalidateQueries({ queryKey: ["connection"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!pick) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser couldn't process this image");
      const k = OUT / VIEW;
      ctx.drawImage(pick.img, pos.x * k, pos.y * k, w * k, h * k);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
      const type = blob?.type === "image/webp" ? "webp" : "jpg";
      const file = blob?.type === "image/webp" ? blob : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
      if (!file) throw new Error("Could not prepare the image");
      const path = `${userId}/${crypto.randomUUID()}.${type}`;
      const up = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: type === "webp" ? "image/webp" : "image/jpeg", upsert: false });
      if (up.error) throw new Error(up.error.message);
      const stored = `${AVATAR_BUCKET}/${path}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: stored }).eq("id", userId);
      if (error) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        throw new Error(error.message);
      }
      await removeOld(current);
    },
    onSuccess: () => {
      setPick(null);
      refresh();
      toast.success("Profile photo updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (error) throw error;
      await removeOld(current);
    },
    onSuccess: () => {
      refresh();
      toast.success("Profile photo removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove photo"),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="sr-only"
        aria-label="Choose profile photo"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {pick ? (
        <div className="w-full space-y-3">
          <p className="text-sm font-semibold">Drag to position, slide to zoom</p>
          <div
            className="relative mx-auto touch-none select-none overflow-hidden rounded-full border-2 border-primary bg-muted"
            style={{ width: VIEW, height: VIEW }}
            tabIndex={0}
            role="img"
            aria-label="Photo crop preview. Use arrow keys to move."
            onKeyDown={(e) => {
              const d = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
              if (d) {
                e.preventDefault();
                setPos((p) => clamp(p.x + d[0]!, p.y + d[1]!));
              }
            }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPos(clamp(d.px + e.clientX - d.x, d.py + e.clientY - d.y));
            }}
            onPointerUp={() => (drag.current = null)}
          >
            <img
              src={pick.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: pos.x, top: pos.y, width: w, height: h }}
            />
          </div>
          <Slider
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={(v) => setZoomKeep(v[0] ?? 1)}
            className="mx-auto max-w-56"
          />
          <div className="flex justify-center gap-2">
            <Button onClick={() => save.mutate()} disabled={busy}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Save Photo
            </Button>
            <Button variant="outline" onClick={() => setPick(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <UserAvatar url={current} name={name} className="size-20 text-2xl" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Camera className="size-4" /> {current ? "Change Photo" : "Upload Photo"}
            </Button>
            {current && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={busy}>
                {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove Photo
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
        </>
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your profile photo?</AlertDialogTitle>
            <AlertDialogDescription>Your initials will show instead. Nothing else on your account changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Photo</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
