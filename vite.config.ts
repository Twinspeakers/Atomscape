import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const mdxPlugin = mdx()
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const githubPagesBase = repoName ? `/${repoName}/` : '/'
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? githubPagesBase : '/')

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@state': path.resolve(__dirname, 'src/state'),
      '@platform': path.resolve(__dirname, 'src/platform'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  plugins: [
    { enforce: 'pre', ...mdxPlugin },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('babylonjs')) {
            return 'vendor-babylon'
          }

          if (id.includes('@mdx-js') || id.includes('remark') || id.includes('rehype')) {
            return 'vendor-mdx'
          }

          return undefined
        },
      },
    },
  },
})
