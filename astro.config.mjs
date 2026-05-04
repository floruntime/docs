import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.floruntime.io',
  redirects: {
    '/': '/getting-started/introduction',
  },
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
            href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;1,14..32,400&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap',
          },
        },
        {
          tag: 'script',
          content: `
(function() {
  const STORAGE_KEY = 'flo-docs-theme';
  const getTheme = () => localStorage.getItem(STORAGE_KEY) || 'light';
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcon(theme);
  };
  const toggle = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

  // Phosphor icons (regular weight, 256x256 viewBox)
  const SUN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>';
  const MOON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg>';

  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = (theme === 'dark' ? SUN_ICON : MOON_ICON) + '<span>' + (theme === 'dark' ? 'Light' : 'Dark') + '</span>';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function rearrange() {
    const sidebarPane = document.querySelector('.sidebar-pane');
    if (!sidebarPane) return;
    const sidebarContent = sidebarPane.querySelector('.sidebar-content');
    if (!sidebarContent) return;

    // Move site-search from header into top of sidebar
    const search = document.querySelector('header.header site-search');
    if (search && !sidebarPane.querySelector('site-search')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'sidebar-search';
      wrapper.appendChild(search);
      sidebarPane.insertBefore(wrapper, sidebarContent);
    }

    // Append theme toggle at bottom of sidebar
    if (!sidebarPane.querySelector('#theme-toggle')) {
      const footer = document.createElement('div');
      footer.className = 'sidebar-footer';
      const btn = document.createElement('button');
      btn.id = 'theme-toggle';
      btn.type = 'button';
      btn.addEventListener('click', toggle);
      footer.appendChild(btn);
      sidebarPane.appendChild(footer);
      updateToggleIcon(getTheme());
    }
  }

  // Init: set correct theme before paint
  const saved = getTheme();
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rearrange);
  } else {
    rearrange();
  }
})();
          `,
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
