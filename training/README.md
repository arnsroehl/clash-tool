# Screenshot recognition dataset

This directory defines the privacy and split contract for a future trained
screenshot object model. It does not contain user screenshots. The committed
manifest is intentionally empty and acts as a validated template.

Only screenshots covered by explicit improvement consent may be added. Replace
account and capture-series identifiers with separate lowercase SHA-256 hashes;
never put a user ID, player tag, player name, raw account ID, storage URL or
absolute local path in the manifest. Images belong below a private, untracked
dataset root and `imagePath` must remain relative.

Each sample records the screenshot type and the variants required by the
product specification: device type, resolution, German or English language,
Town Hall level, game version, light/dark display, overlay state, scale,
compression and crop quality. Supported region annotations are:

- `object_card`
- `object_icon`
- `level_region`
- `status_icon`
- `time_region`
- `resource_region`
- `ui_anchor`

Bounding boxes use normalized coordinates from 0 to 1. The validator rejects
invalid boxes, missing consent and unsafe paths. Most importantly, the same
account hash or capture-series hash may occur in only one of `train`,
`validation` and `test`; this prevents visually related screenshots leaking
into evaluation data.

Validate a manifest with:

```bash
npm run validate-screenshot-dataset
```

Or pass a different private manifest:

```bash
npm run validate-screenshot-dataset -- /absolute/path/to/manifest.json
```

Warnings identify missing annotation coverage. Errors make the command exit
non-zero and must block training or release.

## Release workflow after a game update

1. Disable all imports or only affected types in Vercel.
2. Collect consented examples for the new UI version and annotate them.
3. Validate the manifest and train with the fixed train/validation/test split.
4. Evaluate on the untouched test split and manually verify every supported
   screenshot type.
5. Publish new, immutable model and layout version identifiers.
6. Set `NEXT_PUBLIC_SUPPORTED_GAME_UI_VERSION`,
   `NEXT_PUBLIC_SCREENSHOT_MODEL_VERSION`, and
   `NEXT_PUBLIC_SCREENSHOT_LAYOUT_VERSION` together.
7. Set `NEXT_PUBLIC_SCREENSHOT_SUPPORTED_TYPES` only to the verified types and
   redeploy. Add further types only after their layout is verified.

The application rejects sessions with a different game UI version. The
complete-account import is enabled only when every required screenshot type is
active, so it cannot bypass a partial rollout.
