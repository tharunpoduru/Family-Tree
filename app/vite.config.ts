import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { familyConfig, pack } from './src/family.config'

/**
 * Fills index.html's {{…}} placeholders from src/family.config.ts, so
 * the static shell, title, and social tags stay in step with the app
 * without anyone editing HTML by hand.
 */
function familyBranding(): Plugin {
  const { name, tagline, description, siteUrl, socialImage } = familyConfig
  const title = name.native ? `${name.en} · ${name.native}` : name.en
  const nativeLine = name.native
    ? `<p lang="${pack.langTag ?? ''}" style="margin:.35em 0 0;font-size:1.6rem;opacity:.75">${name.native}</p>`
    : ''
  const imageUrl = siteUrl && socialImage ? `${siteUrl}${socialImage}` : ''
  const socialMeta = siteUrl
    ? [
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${name.en}" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${siteUrl}/" />`,
        ...(imageUrl
          ? [
              `<meta property="og:image" content="${imageUrl}" />`,
              `<meta property="og:image:width" content="1200" />`,
              `<meta property="og:image:height" content="630" />`,
              `<meta name="twitter:card" content="summary_large_image" />`,
              `<meta name="twitter:image" content="${imageUrl}" />`,
            ]
          : [`<meta name="twitter:card" content="summary" />`]),
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`,
      ].join('\n    ')
    : ''
  return {
    name: 'family-branding',
    transformIndexHtml(html) {
      return html
        .replaceAll('{{TITLE}}', title)
        .replaceAll('{{DESCRIPTION}}', description)
        .replaceAll('{{TAGLINE}}', tagline)
        .replaceAll('{{FAMILY_EN}}', name.en)
        .replaceAll('{{NATIVE_LINE}}', nativeLine)
        .replaceAll('{{SOCIAL_META}}', socialMeta)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), familyBranding()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          // Firebase must NOT be one blob: the doorstep needs Auth only,
          // while Firestore and Storage are useless until someone is
          // approved. Grouping them together put ~350kB of database SDK
          // on the critical path and was the real cause of a slow LCP
          // (PRD R7).
          if (id.includes('firebase') || id.includes('@firebase')) {
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore'))
              return 'vendor-firestore'
            if (id.includes('@firebase/storage') || id.includes('firebase/storage'))
              return 'vendor-fbstorage'
            return 'vendor-firebase-core'
          }
          return 'vendor'
        },
      },
    },
  },
})
