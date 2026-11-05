import { unzip, unzipSync } from "fflate";

export const MAX_AUTOMATIC_FILES = 500;
export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
export const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;

export function isTrainingImagePath(path: string): boolean {
  const segments = path.replace(/\\/g, "/").split("/");
  return /\.(?:jpe?g|png|webp)$/i.test(path)
    && !segments.some((segment) => segment.startsWith(".") || segment === "__MACOSX");
}

export function validateTrainingImageSizes(sizes: number[]): void {
  if (sizes.length > MAX_AUTOMATIC_FILES) throw new Error("too_many_images");
  if (sizes.some((size) => !Number.isSafeInteger(size) || size < 0)
    || sizes.reduce((sum, size) => sum + size, 0) > MAX_EXTRACTED_BYTES) {
    throw new Error("images_too_large");
  }
}

export async function extractTrainingArchive(source: Uint8Array): Promise<Record<string, Uint8Array>> {
  if (source.byteLength > MAX_ARCHIVE_BYTES) throw new Error("archive_too_large");
  const sizes: number[] = [];
  // Inspect the entire directory before allocating buffers for any image.
  unzipSync(source, {
    filter: (entry) => {
      if (isTrainingImagePath(entry.name)) {
        sizes.push(entry.compression === 0 ? entry.size : entry.originalSize);
        validateTrainingImageSizes(sizes);
      }
      return false;
    },
  });
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(source, { filter: (entry) => isTrainingImagePath(entry.name) },
      (error, result) => error ? reject(error) : resolve(result));
  });
  validateTrainingImageSizes(Object.values(entries).map((bytes) => bytes.byteLength));
  return entries;
}
