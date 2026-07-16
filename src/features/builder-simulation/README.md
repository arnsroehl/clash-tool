# Builder Simulation

The builder simulation distributes queue items across every compatible upgrade slot.

## Slot logic

- Input is `UpgradeQueueItem[]`.
- Legacy callers can still provide `builderCount`; modern callers provide typed slots.
- Buildings and heroes use Builders or Goblin Builders.
- Troops, spells and siege machines use the Laboratory.
- Pets use the Pet House and hero equipment uses the Blacksmith.
- Helpers declare the item types they support, so future helpers need no scheduler rewrite.
- The next queue item is assigned to the earliest compatible, enabled slot.
- Screenshot-detected remaining times and manually configured availability delay only that slot.
- Times are relative hours from start `0`.
- Queue order is respected.

Cost and time discounts, pause windows, ore costs and per-item earliest starts are applied before an assignment is finalized. Simulation output stays deterministic and is derived from the persisted queue and slot configuration rather than being stored separately.
