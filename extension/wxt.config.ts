import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Browser History Sync',
    description: 'Synchronize browser history across devices with real-time updates and cross-browser support',
    version: '1.0.3',
    permissions: [
      'webNavigation',
      'tabs',
      'storage',
      'unlimitedStorage',
    ],
    // Default icons for the extension
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '96': 'icon/96.png',
      '128': 'icon/128.png'
    },
    action: {
      default_title: 'Browser History Sync',
      default_popup: 'popup.html',
      // Default action icon
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png'
      }
    },
    browser_specific_settings: {
      gecko: {
        id: 'browser-history-sync@neuhuber.eu',
        strict_min_version: '109.0',
      },
    },
  },
});
