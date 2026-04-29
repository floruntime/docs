import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.floruntime.io',
  integrations: [
    starlight({
      title: 'Flo',
      description: 'The Universal Distributed Runtime — Streams, KV, Queues, Actions, and Workflows in a single binary.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/floruntime/flo' },
        { icon: 'x.com', label: 'X', href: 'https://x.com/floruntime' },
      ],
      favicon: '/favicon.svg',
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
          },
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/floruntime/docs/edit/main/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { slug: 'getting-started/introduction' },
            { slug: 'getting-started/installation' },
            { slug: 'getting-started/quickstart' },
            { slug: 'getting-started/configuration' },
          ],
        },
        {
          label: 'Primitives',
          items: [
            { slug: 'primitives/kv', label: 'KV' },
            { slug: 'primitives/streams' },
            { slug: 'primitives/queues' },
            { slug: 'primitives/time-series', label: 'Time-Series' },
          ],
        },
        {
          label: 'Orchestration',
          items: [
            { slug: 'orchestration/actions' },
            { slug: 'orchestration/workers' },
            { slug: 'orchestration/workflows' },
            { slug: 'orchestration/processing', label: 'Stream Processing' },
          ],
        },
        {
          label: 'SDKs',
          items: [
            { slug: 'sdks/overview' },
            { slug: 'sdks/go', label: 'Go' },
            { slug: 'sdks/python', label: 'Python' },
            { slug: 'sdks/javascript', label: 'JavaScript' },
            { slug: 'sdks/zig', label: 'Zig' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { slug: 'architecture/overview' },
            { slug: 'architecture/storage' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { slug: 'deployment/docker' },
            { slug: 'deployment/clustering' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/cli', label: 'CLI' },
            { slug: 'reference/rest-api', label: 'REST API' },
            { slug: 'reference/wire-protocol' },
            { slug: 'reference/redis', label: 'Redis Compatibility' },
          ],
        },
      ],
    }),
  ],
});
