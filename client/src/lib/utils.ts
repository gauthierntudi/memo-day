import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MAX_PHOTO_BYTES = 600 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function resizePhoto(file: File): Promise<File> {
  if (file.size <= MAX_PHOTO_BYTES) return file;

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let { width, height } = img;
  let scale = 1;
  let quality = 0.8;

  const maxDim = 1920;
  if (width > maxDim || height > maxDim) {
    scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > MAX_PHOTO_BYTES && quality > 0.1) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  while (blob.size > MAX_PHOTO_BYTES && width > 200) {
    scale = 0.75;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    blob = await canvasToBlob(canvas, Math.max(quality, 0.3));
  }

  const name = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], name, { type: "image/jpeg" });
}

export async function resizePhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizePhoto));
}
