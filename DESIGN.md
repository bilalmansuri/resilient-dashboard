# Design

## 1. Problem

Render a dashboard described by saved JSON configuration, where two things are outside
our control and both go wrong in production:

- **The configuration** is old, hand-edited, or written by a different version of the app.
- **The data** is slow, fails, arrives malformed, or has had its fields renamed or
  retyped since the configuration was saved.

The failure mode that matters is not a crash. A crash is obvious. The dangerous outcome is
a widget that renders a confident number which happens to be wrong — `$0` because a field
was renamed, or a total that is 34% short because some rows were unreadable and got
skipped. Nobody audits a number that looks fine.

So the guarantee is:

> **Every widget either shows verified data, or visibly shows why it cannot.**
> There is no third outcome, and no failure degrades into a plausible-looking value.

## 2. Architecture

Three layers, one direction. The bottom layer is pure TypeScript with no React in it,
which is what makes the resilience rules simple to reason about in isolation.

```
domain/      pure     schema · readers · errors · response · format
services/    pure     async mock API
hooks/       react    React Query binding · dashboard-wide state
widgets/     react    registry · KPI · line chart · table · error/loading states
components/  react    dashboard shell · toolbar · renderer
```

```
                       ┌──────────────────────┐
                       │  dashboard.json      │  untrusted
                       └──────────┬───────────┘
                                  ▼
                       parseDashboardConfig()      ◄── boundary 1: is the config sane?
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
        Invalid dashboard                  DashboardConfig
        (nothing renders,                        │
         toolbar still works)      ┌─────────────┼─────────────┐
                                   ▼             ▼             ▼
                                  KPI          Chart         Table
                                   │             │             │
                                   └─────────────┼─────────────┘
                                                 ▼
                                    lookupWidget(type)          ◄── registry, not eval
                                                 │
                                    runtime.prepare(envelope)   ◄── per-widget config
                                                 │
                                    useWidgetData(source)       ◄── React Query
                                                 │
                                       async mock API (500–1000 ms)
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                           throw            malformed             rows
                              │                  │                  │
                              ▼                  ▼                  ▼
                       NETWORK_ERROR    MALFORMED_RESPONSE   readDataResponse()
                              │                  │                  │
                              └────────┬─────────┘                  ▼
                                       │                  select(rows, config)  ◄── boundary 2
                                       │                            │
                                       │              ┌─────────────┴─────────────┐
                                       ▼              ▼                           ▼
                                  <WidgetError/>  WidgetFailure              verified data
                                   + Retry            │                           │
                                       └──────────────┘                           ▼
                                                                              rendered
```

### The key idea: each widget owns its own contract

A registry entry is not just a component. It owns three things
([`src/widgets/registry.ts`](./src/widgets/registry.ts)):

```ts
defineWidget({
  type: 'kpi',
  schema,                        // 1. what settings this widget accepts
  select: (rows, config) => …,   // 2. do the rows satisfy those settings?
  render: (data, config) => …,   // 3. presentation, given verified data only
})
```

`select` is a pure function that returns `Result<TData>` — either verified data or a
`WidgetFailure`. Because it is pure, the truth guarantee is one small function per widget.
`render` can only ever receive data that already passed, so presentation components have
no defensive code in them at all.

Adding a widget is one file plus one line in
[`src/widgets/index.ts`](./src/widgets/index.ts). Nothing else in the app changes.

## 3. Configuration format

[`src/mocks/dashboard.json`](./src/mocks/dashboard.json):

```json
{
  "id": "dashboard-001",
  "name": "Sales Dashboard",
  "version": 1,
  "filters": { "region": "India" },
  "widgets": [
    { "id": "revenue", "type": "kpi", "title": "Total Revenue",
      "dataSource": "sales", "field": "revenue" },
    { "id": "revenue-trend", "type": "line-chart", "title": "Revenue Trend",
      "dataSource": "sales", "xField": "date", "yField": "revenue" },
    { "id": "sales-table", "type": "table", "title": "Recent Sales",
      "dataSource": "sales", "fields": ["date", "customer", "region", "revenue"] }
  ]
}
```

The configuration is **declarative**. It says what should exist; it never contains
rendering code, module paths, or anything that gets executed.

### Two-stage validation, on purpose

The dashboard schema validates only the widget **envelope** — `id`, `type`, `title`. The
type-specific settings (`field`, `xField`, `fields`) stay unvalidated at this stage and
are checked later by the widget definition that owns them.

This is what makes graceful degradation possible. A single discriminated union over all
widget types would mean one unknown `type` fails the whole `widgets` array, and the entire
dashboard would go dark because one widget was misconfigured.

## 4. Data flow

1. **Config** is imported and run through `parseDashboardConfig`.
2. **The region filter** lives in `useDashboard`, at the dashboard level — so every widget
   is guaranteed to be showing the same scope. Nothing is duplicated per widget.
3. **`WidgetRenderer`** resolves the type through the registry, then calls
   `runtime.prepare(envelope)` to validate that widget's own settings and confirm its data
   source is registered.
4. **`useWidgetData`** fetches through React Query. The region and a `reloadKey` are part
   of the query key, so changing the filter or pressing Reload refetches rather than
   serving a stale cached answer.
5. **`readDataResponse`** checks the response envelope before any field is read.
6. **`select`** verifies the rows against the config.
7. **`render`** draws it.

Steps 3–6 can each only produce a rendered widget or an explained refusal, and the refusal
renders inside that widget's own card.

## 5. Validation strategy

**TypeScript is not runtime validation.** `type Widget = { id: string }` does nothing when
the JSON contains `{ "id": 123 }` — the types are erased at compile time. So every
boundary is checked with Zod's `safeParse`, and nothing on the validation path throws.

| Boundary | Where | Produces |
| --- | --- | --- |
| Dashboard envelope | `parseDashboardConfig` | valid config, or fatal issues |
| Widget envelope | `parseDashboardConfig` | accepted widget, or a rejection note |
| Widget settings | `runtime.prepare` | `CONFIG_INVALID` |
| Data source name | `runtime.prepare` | `UNKNOWN_DATA_SOURCE` |
| Response envelope | `readDataResponse` | `MALFORMED_RESPONSE` |
| Field presence & type | `select` → `readers.ts` | `FIELD_MISSING`, `TYPE_MISMATCH`, `AGGREGATE_INCOMPLETE` |

### The readers are the guarantee

Every number on screen goes through [`src/domain/readers.ts`](./src/domain/readers.ts).
There is no `Number(x)`, no `?? 0`, and no dropping of unreadable rows. Two decisions
there are worth calling out:

- **`aggregateField` refuses a partially unreadable column.** If 1 of 3 rows has
  `revenue: "lots"`, it returns `AGGREGATE_INCOMPLETE` rather than totalling the other
  two. A sum over what happened to parse is wrong in the one direction nobody checks —
  too low, but entirely plausible.
- **Charts refuse partial columns too.** A line missing a third of its points still reads
  as a complete trend, so `requireNumericField` fails rather than drawing a gap.

## 6. Failure handling

A closed taxonomy in [`src/domain/errors.ts`](./src/domain/errors.ts) — 10 kinds, each
with a specific title and a detail message that names the field, what was expected, and
what actually arrived. A generic *"Something went wrong"* would leave the user unable to
tell a broken config from a broken backend.

```
CONFIG_INVALID · UNKNOWN_WIDGET_TYPE · UNKNOWN_DATA_SOURCE · NETWORK_ERROR
MALFORMED_RESPONSE · FIELD_MISSING · TYPE_MISMATCH · EMPTY_RESULT
AGGREGATE_INCOMPLETE · RENDER_CRASH
```

Three deliberate choices:

- **Retry only where retrying could help.** `isRetryable` returns true for transport and
  malformed-response faults only. A Retry button on `FIELD_MISSING` would be a lie —
  retrying will not bring the field back.
- **No silent auto-retry.** React Query is configured with `retry: 0`. A spinner that
  hides three failed attempts is a worse lie than an error card.
- **Isolation is enforced twice.** `select` catches everything checkable in advance;
  [`WidgetErrorBoundary`](./src/components/dashboard/WidgetErrorBoundary.tsx) catches a
  throw during React's own render. It is the only class component in the codebase —
  error boundaries are the one thing React still requires a class for — and it exists so
  that one crashing widget costs you that widget and nothing else.

**Empty is not an error.** `EMPTY_RESULT` is rendered in a neutral style, because "no
records match this filter" is a true answer, not a failure.

## 7. Hostile configurations

[`src/mocks/hostileDashboard.json`](./src/mocks/hostileDashboard.json) is selectable from
the toolbar. Each widget is broken differently:

| Case | Expected result |
| --- | --- |
| `type: "unknown-widget"` | `UNKNOWN_WIDGET_TYPE`, listing known types |
| `field: "doesNotExist"` | `FIELD_MISSING` — never `$0` |
| `dataSource: "../../etc/passwd"` | `UNKNOWN_DATA_SOURCE`, nothing fetched |
| numeric axis bound to a text column | `TYPE_MISMATCH` naming both types |
| widget with no `title` | rejected at parse, reported in the banner |
| duplicate widget `id` | first kept, second rejected and reported |
| one correct widget alongside them | **renders normally** |

Fatal cases (`null`, `widgets: null`, a missing `name`, `version: "banana"`, an
unsupported version) refuse the whole dashboard with a specific message, while leaving the
toolbar usable so you can switch back to something that works.

### Security posture

Configuration is data, never code. There is no `eval`, no dynamic `import()` of a
config-supplied string, and no `dangerouslySetInnerHTML`. Both `type` and `dataSource`
resolve through closed registries — a `Map.get` and an `Object.hasOwn` check — so a
hostile string resolves to nothing rather than reaching anything. Layout is derived from
the widget *type*, not read from the config, so a config cannot supply hostile geometry.

## 8. Concurrency and versioning

Not implemented — there is no backend to be concurrent with. The intended approach:

**Optimistic concurrency on a version number.** Every dashboard carries a `version`.
A save sends the version the client loaded; the server accepts it only if that still
matches the stored version, and otherwise returns `VERSION_CONFLICT`. The client then
shows *"This dashboard was updated by another user"* with the option to reload or resolve,
rather than silently overwriting the newer revision. Last-write-wins is the one behaviour
to avoid: it loses work with no signal that anything was lost.

**Schema evolution** uses the same version field. Today `parseDashboardConfig` refuses any
`version` it does not recognise, which is the safe default — guessing at an unknown format
could show numbers the author never intended. Adding a v2 means adding a migration step
that runs *before* validation and raises v1 configs to v2. Migrations belong in one
isolated, pure module — never scattered through components — and a migration must never
invent a data binding: if it cannot interpret something, it passes it through and lets the
validator reject it with a precise message.

## 9. Trade-offs

| Decision | Why | What it costs |
| --- | --- | --- |
| Envelope validated separately from widget settings | One bad widget cannot black out the dashboard | Two validation stages to explain instead of one |
| Refuse partial columns rather than plot what parsed | A partial total or trend is plausible and wrong | A single bad row hides an otherwise useful widget |
| `retry: 0`, manual Retry only | Hidden retries hide the truth | Transient blips surface to the user |
| Filters at dashboard level, not per widget | Guarantees every widget shares one scope | Cross-source filtering would need per-widget applicability checks |
| Layout from widget type, not config | A config cannot supply hostile geometry | No user-defined resize or drag |
| Mock API, no backend | Failures can be triggered on demand in a demo | Says nothing about real infrastructure |
| MUI for everything | No custom CSS to review; polished by default | ~930 kB bundle, mostly MUI + Recharts |

## 10. Known limitations

1. **No persistence, versioning or sharing.** Configuration is imported from JSON, so
   Save / version history / restore / share are all absent. The versioning *approach* is
   described in §8 but not built. This is the largest gap against a full brief.
2. **No editor.** Widgets cannot be added, removed, moved or resized from the UI — the
   configuration is edited as JSON. The registry's `configFields` groundwork for a
   generic config panel is not there either.
3. **No failure-injection UI.** Transport failures, malformed responses and field renames
   are all handled (`NETWORK_ERROR`, `MALFORMED_RESPONSE`, `FIELD_MISSING`, Retry), but
   there is no toggle to trigger them on demand — they have to be provoked by editing the
   mock data or stopping the server. The interactive demo therefore covers the
   configuration-level failures only.
4. **`npm run lint` does not run on Node 22.4.** oxlint's native binding needs Node
   ≥22.12 (`require(esm)`), the same reason jsdom could not load here. The app, typecheck
   and build are unaffected. Upgrading Node fixes it.
5. **Widgets sharing a source and region share one request.** Correct and efficient, but
   it means a transport failure would hit all of them together.
6. **One bundle, no code splitting.** 930 kB (280 kB gzipped). Fine for a demo; a real
   deployment would lazy-load Recharts.
7. **Region filter is a fixed list** (All / India / USA) rather than derived from the data.

## 11. How to run

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

Use Node 22.12+ or 20.19+.

## 12. How to test the failure scenarios

Everything is driven from the dashboard toolbar. See the
[README demo script](./README.md#the-5-minute-demo) for the full walkthrough.

| To see | Do this |
| --- | --- |
| Independent loading states | **Reload dashboard** |
| Unknown widget type, unknown data source, missing field, wrong type, duplicate ids | **Configuration → Broken Dashboard (hostile)** |
| A missing field is not `$0` | Same — look at the `missing-field` widget |
| Widget isolation | Same — `still-works` renders while six others fail |
| A refused dashboard envelope | Edit `version` in `src/mocks/dashboard.json` to `2` |
| A renamed backend field | In `src/mocks/salesData.json`, rename `revenue` to `totalRevenue` |
| Transport failure + Retry | Stop the dev server, then press **Reload dashboard** |
| Shared filter scope | **Region** → India `$133,344` · USA `$131,846` · All `$265,190` |
