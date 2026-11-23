import catalog from "@/data/village-object-templates.json";
import { findVillageObjects, type VillagePixels } from "@/features/screenshot-import/village-object-search";

self.addEventListener("message", (event: MessageEvent<VillagePixels>) => {
  self.postMessage(findVillageObjects(event.data, catalog.templates));
});
