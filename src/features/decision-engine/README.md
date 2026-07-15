# Decision Engine

Framework-independent business logic for deterministic upgrade assessment.

- `decision-engine.ts`: orchestration and ranking
- `decision-engine.utils.ts`: scoring, constraints, schedule and alternatives
- `decision-engine.explanations.ts`: consistent German/English Reason Code text
- `decision-engine.types.ts`: versioned input and output contract
- `decision-engine.test.ts`: executable scoring specification

The module may import other pure feature contracts, but never React, Next.js,
Supabase or service code.
