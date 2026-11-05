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

## Importing labeled building crops

In the dedicated training-image import, select a folder or ZIP using either
`town-hall/18/image.png`, `town-hall/level-18/image.png`, or
`town-hall__18__001.png`. A surrounding dataset folder is allowed. Building IDs,
localized names and known aliases are accepted. Check the group preview before
uploading and explicitly enable improvement consent. Labels come from paths;
the importer does not verify what a picture actually depicts.

Each automatic import allows up to 500 JPEG, PNG or WebP images totaling
250 MB. ZIP files must be at most 100 MB. ZIP image counts and declared sizes
are checked before image decompression; unrelated files, hidden files and
`__MACOSX` metadata are skipped. Folder imports use the same image limits.
Unknown buildings and levels above the account's Town Hall limit block upload.
Use correctly labeled crops from multiple buildings and levels before assessing
recognition quality; a batch containing only Town Hall 18 is not a general test.
