// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://el-cerito.vercel.app',
  output: 'static',
  adapter: vercel(),
  // Bilingual: Spanish is the primary/default language (the ranch is in Mexico),
  // English is secondary. Spanish stays at the site root (no /es prefix) to keep
  // existing indexed URLs and canonical SEO; English lives under /en/.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  },
});
