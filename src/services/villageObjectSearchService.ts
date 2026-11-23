import {
  villageFrameSize,
  type VillageObjectCandidate,
} from "@/features/screenshot-import/village-object-search";

export function searchVillageBitmap(bitmap: ImageBitmap): Promise<VillageObjectCandidate[]> {
  const canvas = document.createElement("canvas");
  const { width, height } = villageFrameSize(bitmap.width, bitmap.height);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return Promise.resolve([]);
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./village-object-search.worker.ts", import.meta.url));
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Die Dorfansicht konnte nicht rechtzeitig ausgewertet werden."));
    }, 30_000);
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<VillageObjectCandidate[]>) => {
      finish();
      resolve(event.data);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("Die Dorfansicht konnte nicht ausgewertet werden."));
    };
    worker.postMessage({ data, width, height }, [data.buffer]);
  });
}
