# @mdanai/sdk

Official SDK for building MDAN agent apps, skills apps, and online skills.

Recommended path:

- `@mdanai/sdk`: define apps with the root app API
- `@mdanai/sdk/server/node`: host a server with Node HTTP
- `@mdanai/sdk/server/bun`: host a server with Bun

Advanced path:

- `@mdanai/sdk/surface`: build a custom frontend on top of the headless surface runtime
- `@mdanai/sdk/server`: use lower-level server runtime helpers when you intentionally need runtime control

Start with the root app API unless you are building your own frontend or runtime integration.
