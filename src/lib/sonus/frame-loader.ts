/**
 * LOAD REAL FRAME — ports v3's frame loader: any image (file picker or
 * drag & drop) is cover-cropped to 720x360, projected onto the globe with
 * the v3 renderer and becomes both the 3D sphere texture and the live
 * sonification source of the active disc.
 */

import { useSonusStore } from "@/store/sonus-store";
import { EQ_H, EQ_W } from "./constants";
import { buildDiscFrame, frameStore } from "./textures";

export async function loadUserFrame(file: File): Promise<boolean> {
  if (!file || !file.type.startsWith("image/")) return false;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("image decode failed"));
      im.src = url;
    });
    const tc = document.createElement("canvas");
    tc.width = EQ_W;
    tc.height = EQ_H;
    const tx = tc.getContext("2d");
    if (!tx) return false;
    const s = Math.max(EQ_W / img.width, EQ_H / img.height);
    const sw = EQ_W / s;
    const sh = EQ_H / s;
    tx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, EQ_W, EQ_H);

    const disc = useSonusStore.getState().disc;
    frameStore.set(disc, buildDiscFrame(tc, "raw", true));
    useSonusStore.getState().markRealFrame(disc);
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}
