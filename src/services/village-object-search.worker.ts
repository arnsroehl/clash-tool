import catalog from "@/data/village-object-templates.json";
import { findVillageObjects, type VillageSearchInput } from "@/features/screenshot-import/village-object-search";

self.addEventListener("message", (event: MessageEvent<VillageSearchInput>) => {
  self.postMessage(findVillageObjects(event.data, catalog.templates));
});
