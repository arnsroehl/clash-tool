import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  validateScreenshotTrainingDataset,
  type ScreenshotTrainingDataset,
} from "@/features/screenshot-import/screenshot-training-dataset";

const manifestPath = resolve(
  process.cwd(),
  process.argv[2] || "training/screenshot-dataset.manifest.json",
);

async function main() {
  const raw = await readFile(manifestPath, "utf8");
  const dataset = JSON.parse(raw) as ScreenshotTrainingDataset;
  const result = validateScreenshotTrainingDataset(dataset);
  const lines = [
    `Dataset: ${manifestPath}`,
    `Samples: ${result.counts.samples} (train ${result.counts.train}, validation ${result.counts.validation}, test ${result.counts.test})`,
    ...result.warnings.map((warning) => `WARN: ${warning}`),
    ...result.errors.map((error) => `ERROR: ${error}`),
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  if (!result.valid) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Dataset validation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
