# Testing

## Table of Contents

- [Current Tests](#current-tests)
- [Command](#command)
- [Strategy](#strategy)
- [Planned Tests](#planned-tests)

## Current Tests

The repository currently has planner tests in:

```text
src/features/planner/planner.test.ts
```

They cover:

- creating a planner result
- empty item lists
- maxed items being excluded
- upgrade candidates across item types
- simple priority calculation
- missing cost sums
- progress calculation

## Command

```bash
npm test
```

The script runs:

```bash
tsx --test src/features/planner/planner.test.ts
```

## Strategy

Current test coverage is focused on framework-independent planner logic. This is appropriate because planner behavior is core business logic and can be tested without a browser or database.

## Planned Tests

Tests not currently present but natural next steps:

- service row mapping tests
- hook behavior tests
- importer validation tests
- component smoke tests
