# Flo Documentation

Source for **[docs.floruntime.io](https://docs.floruntime.io)** — built with [Astro Starlight](https://starlight.astro.build).

## Structure

```
src/content/docs/
├── getting-started/    # Introduction, installation, quickstart, configuration
├── primitives/         # KV, Streams, Queues, Time-Series
├── orchestration/      # Actions, Workers, Workflows, Stream Processing
├── sdks/               # Go, Python, JavaScript, Zig
├── architecture/       # Overview, storage internals
├── deployment/         # Docker, clustering
└── reference/          # CLI, REST API, wire protocol
```

## Local Development

```bash
npm install
npm run dev       # http://localhost:4321
```

## Build

```bash
npm run build     # output in dist/
npm run preview   # preview the built site
```

## Deployment

Deployed automatically to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`. The site is served at the custom domain `docs.floruntime.io`.

## Contributing

Edit pages under `src/content/docs/`. Each file is Markdown or MDX. The "Edit page" link on every docs page links directly to the source file on GitHub.
