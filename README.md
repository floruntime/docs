# Flo docs

Source for **[docs.floruntime.io](https://docs.floruntime.io)** — the Flo
documentation site, built with [Markline](https://markline.dev) and themed to
match the **Flo Console** ("calm") design: a near-monochrome warm-dark canvas
(`#121210`) with one restrained sage accent (`#7faa8a`), plus a warm-cream light
mode. The topbar uses the official `flo` wordmark from `branding/`.

## Run it

```sh
npm install
npm run dev        # dev server on http://localhost:3000
```

## Build & ship

```sh
npm run build      # production server bundle  (markline build)
npm run start      # serve the built bundle
npm run export     # static HTML  ->  out/   (markline export)
npm run preview    # serve out/ locally with clean-URL resolution
```

We deploy the static export (`out/`) to GitHub Pages on every push to `main`
(see `.github/workflows/deploy.yml`); it serves from the custom domain
`docs.floruntime.io` (see `public/CNAME`). The `llms.txt` / `llms-full.txt`
agent corpora and the Pagefind search index are regenerated on every build.

## Layout

```
markline.json        # nav, theme tokens, branding (single source of truth)
docs/                # all content as .md / .mdx
  index.mdx          # homepage (/)
  getting-started/   # introduction, installation, quickstart, configuration
  primitives/        # KV, streams, queues, time-series
  orchestration/     # actions, workers, workflows, stream processing
  sdks/              # Go, Python, JavaScript, Zig
  architecture/      # overview, storage internals
  deployment/        # docker, terraform, clustering
  reference/         # CLI, web console, REST API, wire protocol, Redis compat
public/
  logo-flo-{light,dark}.svg   # Flo wordmark
  favicon.svg
  CNAME                       # docs.floruntime.io
```

## Theming

All branding lives in `markline.json` → `theme`, mapped onto Markline's token
set (the design tokens `--bg/--ink/--accent/--line/--code-*` **and** the
framework `--c-*` RGB triples) so the docs shell, MDX prose, and code rails all
render on the Flo Console palette:

- `colors.primary: "#46785a"` (deeper sage, light) / `primaryDark: "#7faa8a"` (sage, dark).
- `appearance: "dark"` — dark-first, matching the console.
- `cssVariables.{dark,light}` — the full warm near-black / warm-cream palette.

Fonts use Markline's bundled Geist + Geist Mono, which read essentially
identically to the console's Inter + JetBrains Mono. Markline only loads
system-available or self-hosted font families by name, and exposes no custom-CSS
or `<head>` hook, so the console's exact webfonts (and Collier — which the
console only uses for the `flo` wordmark, shipped here as an SVG) aren't wired in
without forking the framework.

## Content notes

Content is authored as Markdown (`.md`) and MDX (`.mdx`). MDX pages may use the
built-in Markline components (`<Tabs>`/`<Tab>`, `<CardGroup>`/`<Card>`, callouts)
with no imports. MDX is stricter than Markdown about `<`, `>`, `{`, `}` in prose
— keep raw angle-bracket placeholders (e.g. `<name>`) inside backticks or fenced
code.

You never fork or edit the framework — Markline ships the rendering app and the
CLI launches it against the content here; upgrade it like any dependency.
