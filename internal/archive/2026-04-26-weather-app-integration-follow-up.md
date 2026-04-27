# Weather App Integration Follow-Up

Date: 2026-04-26

This note captures SDK issues and usability gaps that showed up while adapting the weather app to the current split architecture (`app` / `server host` / `frontend`) and then trying to make the root browser experience feel like one continuous flow.

The goal is to separate three things clearly:

1. issues that were real SDK problems and are now fixed
2. issues that are still SDK follow-up work
3. issues that were actually weather-app integration mistakes rather than SDK defects

## 1. Issues That Were Real SDK Problems And Are Now Fixed

### 1.1 Browser entry intent was not first-class

Problem:

- frontend entry boot performs a markdown fetch, not a browser `text/html` page request
- runtime logic could not naturally tell the difference between:
  - an agent markdown read
  - the first browser entry read
- apps had to invent their own request markers to make browser-first initialization work

What happened in the weather app:

- root auto/bootstrap behavior depended on knowing that the request was the browser entry path
- the app initially had to add an ad hoc header to recover that intent

Why this was an SDK problem:

- the browser-entry-to-runtime intent bridge is framework responsibility
- apps should not need to understand frontend boot internals just to implement browser-first initialization

Status:

- fixed
- SDK now owns a browser bootstrap intent marker and sends it from frontend entry automatically

### 1.2 Form renderer needed manual dual wiring

Problem:

- custom form rendering originally required separate server-side and browser-side wiring
- snapshot rendering and hydrated rendering were not reached by one declaration path

What happened in the weather app:

- the app had to create extra browser bridge code just to make one custom form renderer apply everywhere

Why this was an SDK problem:

- a custom form renderer should behave like a single capability declaration
- app authors should not have to manually re-bind the same renderer into hydration

Status:

- fixed
- current model supports one form renderer declaration that applies to both snapshot and mounted frontend behavior

### 1.3 Frontend host integration was too manual

Problem:

- custom frontend integration originally required manual shell/static/module plumbing
- host setup felt like low-level assembly instead of a normal SDK path

What happened in the weather app:

- the app had to explicitly manage frontend entry/static serving details before the host/frontend contract was tightened

Why this was an SDK problem:

- the shipped host should own the browser-shell/module wiring story
- app authors should only need to provide a frontend module or frontend object

Status:

- largely fixed
- current host/frontend integration is much more direct and usable

## 2. Issues Still Worth Improving In The SDK

### 2.1 Page vs region update semantics are correct but not obvious enough

Observed behavior:

- `runtime.sync(route)` always performs a page-oriented refresh
- region patching only happens when an operation resolves to `responseMode = "region"` with matching updated regions

Why this matters:

- this distinction is semantically correct, but it is easy for app authors to miss
- the weather app temporarily replaced a hard navigation with `runtime.sync(route)` and expected a lighter update
- in reality that still produced page-level refresh behavior, just without a document reload

SDK follow-up:

- document this much more explicitly
- provide one canonical example showing:
  - page navigation / page sync
  - region submit / region patch
- avoid leaving this as something app authors have to reverse-engineer from runtime behavior

### 2.2 Region patch requirements on fragment shape are too implicit

Observed behavior:

- region patching depends on the fragment carrying named blocks that match `updatedRegions`
- plain fragment markdown alone is not enough

What happened in the weather app:

- the internal root auto endpoint originally returned fragment markdown with `blocks: []`
- frontend region patch could not happen, even though the returned markdown looked visually correct

Why this matters:

- this is a real integration footgun
- the runtime behavior is consistent, but the authoring/runtime contract is too easy to violate accidentally

SDK follow-up:

- document clearly that region-patch fragments must include the relevant named blocks
- ideally add a dev-mode warning when:
  - an operation declares `responseMode = "region"`
  - but the response fragment cannot satisfy the declared region patch target

### 2.3 Browser bootstrap + region update needs a first-class documented pattern

Observed behavior:

- the SDK now has the pieces needed for browser bootstrap and region patch
- but the combination is not yet a clearly documented primary pattern

What happened in the weather app:

- the desired UX was:
  - first browser entry
  - browser-only location bootstrap
  - then update only the root `query` region
- the app had to assemble this by combining:
  - browser bootstrap
  - internal read endpoint
  - region-form submit semantics

Why this matters:

- this is not a niche case
- location bootstrap, auth/session restoration, local-device initialization, and other browser-only entry behaviors all want the same structure

SDK follow-up:

- publish a first-class example or guide for:
  - browser bootstrap leading into a region update
- the key message should be:
  - browser-only initialization does not imply page replacement
  - browser bootstrap may finish by patching one or more regions in the current page

### 2.4 Frontend-side observability is still thinner than it should be

Observed behavior:

- debugging this flow required reading runtime code, surface code, and live markdown payloads to answer basic questions such as:
  - was this a page transition or a region transition?
  - did the response actually include the target region block?
  - did the runtime patch blocks or replace the whole snapshot?

Why this matters:

- the SDK already has the right machinery
- the pain is in seeing what path was taken

SDK follow-up:

- improve dev-time visibility for frontend runtime behavior, especially:
  - transition kind (`page` vs `region`)
  - updated regions
  - whether patch succeeded or fell back to page behavior
  - the route actually requested

This can be docs, debug logging, or a lightweight runtime inspection surface.

## 3. Problems That Looked Like SDK Problems But Were Actually App Integration Mistakes

These are important to record separately so the SDK backlog does not get polluted with app mistakes.

### 3.1 Root route was mixing two incompatible models

The weather app temporarily had both:

- root entry page + auto-filled `query` region
- explicit `/` route handling that returned a fully resolved page when `location` or coordinates were present

This created two competing flows:

- fragment-oriented root updates
- full page replacement on the same root route

That was an app-level integration mistake.

### 3.2 Replacing navigation with `runtime.sync(route)` did not actually make the flow regional

The app initially changed:

- hard navigation

to:

- `runtime.sync(route)`

This improved document-level behavior, but still requested a full page snapshot.

That was not an SDK bug. It was an incorrect app assumption about what `sync()` means.

### 3.3 Internal root auto fragment originally returned no named blocks

The internal endpoint originally returned:

- correct markdown content
- but no named `query` block in the fragment payload

That prevented region patching from working correctly.

Again, this was app-side misuse of the SDK fragment contract.

## 4. Performance Notes From This Integration

These are not core SDK defects, but they matter for perceived frontend smoothness.

### 4.1 The remaining latency is mostly provider latency, not SDK shell overhead

Measured behavior during this work:

- browser shell and frontend module load were fast
- the dominant latency came from the weather provider request path itself

This means:

- SDK/browser-flow cleanup improved structure and visual continuity
- but getting under one second now depends mostly on app/provider optimizations such as:
  - fewer upstream requests
  - parallelization where safe
  - short TTL caching

### 4.2 Flow correctness and latency are now separate concerns

After the root flow was corrected:

- the main remaining UX issue was no longer “wrong navigation semantics”
- it became “the provider request itself is still slow”

This is a useful separation:

- SDK fixes and semantic cleanup should continue to focus on correctness and predictability
- app-level performance work should focus on data-source and caching strategy

## 5. Recommended SDK Follow-Up Priority

### Priority 1

Make page vs region behavior more explicit in docs and examples.

### Priority 2

Document and/or warn about fragment block requirements for region patch.

### Priority 3

Add a first-class browser-bootstrap-to-region-update example.

### Priority 4

Improve dev observability for frontend transition behavior.

## 6. Short Summary

The most important SDK problems exposed by the weather app were:

1. browser entry intent needed to be SDK-owned
2. form renderer needed one declaration path across snapshot and hydration
3. host/frontend integration needed to be simpler

Those are now materially better.

The main remaining SDK work is not new core capability. It is making the existing semantics easier to use correctly:

- page vs region must be more obvious
- region fragment requirements must be more obvious
- browser bootstrap leading into region patch needs a first-class documented pattern
- frontend transition behavior needs better dev observability
