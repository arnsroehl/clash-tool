export async function recognizeScreenshot(file: File, onProgress: (percent: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng+deu", 1, {
    logger: (event) => {
      if (event.status === "recognizing text" && typeof event.progress === "number") onProgress(Math.round(event.progress * 100));
    },
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}
