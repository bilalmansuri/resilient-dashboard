# Configurable Dashboard

A dashboard whose widgets are described by JSON configuration rather than hardcoded
placement. Both the configuration and the API responses are treated as untrusted input.

**The one rule the whole thing is built around:**

> Every widget either shows verified data, or visibly shows why it cannot.
> Missing or invalid data is never turned into a plausible-looking value such as `0`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck  # tsc -b, strict mode
npm run build      # production build
```

> **Node version:** use Node **22.12+** or **20.19+**. On older Node (this machine has
> 22.4.0) the app, tests and build all work, but `npm run lint` cannot load oxlint's
> native binding. See *Known limitations* in [DESIGN.md](./DESIGN.md).

## The 5-minute demo

Everything is driven from the toolbar at the top of the dashboard: **Region**,
**Configuration**, and **Reload dashboard**.

### 1. A dashboard built from configuration

Open the app. Three widgets render: a KPI, a line chart and a table.

None of them are placed by hand — they come from
[`src/mocks/dashboard.json`](./src/mocks/dashboard.json). Change a `title`, a `field`, or
the order of the `widgets` array and the dashboard follows.

> "The renderer reads a JSON config, validates it, resolves each widget type through a
> registry, fetches data asynchronously, verifies the data against what the config asked
> for, and only then renders."

### 2. Independent loading states

Press **Reload dashboard**. Each widget shows its own `Loading…` while the mock API
takes 500–1000 ms. The page stays interactive throughout.

### 3. A hostile configuration *(the strongest part)*

Switch **Configuration** to **Broken Dashboard (hostile)**
([`src/mocks/hostileDashboard.json`](./src/mocks/hostileDashboard.json)). Every widget in
it is broken in a different way, and the app stays completely stable:

| Widget | What is wrong | What you see |
| --- | --- | --- |
| `bad-widget` | `type: "unknown-widget"` | **Unsupported widget type**, listing the known types |
| `missing-field` | binds to `doesNotExist` | **Field no longer exists** — *not* `$0` |
| `bad-source` | `dataSource: "../../etc/passwd"` | **Unknown data source** — nothing was fetched |
| `wrong-type` | plots the text column `customer` | **Field has an unexpected type** (expected number, received string) |
| `no-title` | no `title` at all | rejected before render, reported in the banner |
| duplicate `missing-field` | reuses an existing `id` | rejected, reported in the banner |
| `still-works` | nothing | **renders normally** |

Two things to point at here:

- **`missing-field` shows an error, not `$0`.** `data.revenue || 0` would have produced a
  confident, wrong, unfalsifiable number. This is the requirement the whole design exists
  to satisfy.
- **Six broken widgets do not stop the seventh from working**, and the two rejected ones
  are reported in a banner rather than silently vanishing.

### 4. A broken dashboard-level config

Every widget above fails *locally*. A dashboard whose own envelope is unreadable
(`null`, `widgets: null`, a missing `name`, `version: "banana"`, an unsupported version)
is refused as a whole with a specific message — and the toolbar stays usable so you can
switch back to something that works.

### 5. The dashboard filter

The **Region** filter (All / India / USA) lives at the dashboard level, so all three
widgets are guaranteed to be showing the same scope.

| Region | KPI total |
| --- | --- |
| India | `$133,344` (10 records) |
| USA | `$131,846` (8 records) |
| All | `$265,190` (18 records) |

## Where to look in the code

| Concern | File |
| --- | --- |
| Config validation | [`src/domain/dashboard.schema.ts`](./src/domain/dashboard.schema.ts) |
| **The truth guarantee** | [`src/domain/readers.ts`](./src/domain/readers.ts) |
| Every reason a widget can refuse | [`src/domain/errors.ts`](./src/domain/errors.ts) |
| Widget registry | [`src/widgets/registry.ts`](./src/widgets/registry.ts) |
| Resolution pipeline | [`src/components/dashboard/WidgetRenderer.tsx`](./src/components/dashboard/WidgetRenderer.tsx) |
| Async mock API | [`src/services/mockDataApi.ts`](./src/services/mockDataApi.ts) |

See [DESIGN.md](./DESIGN.md) for architecture, trade-offs and known limitations.
