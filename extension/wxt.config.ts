import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Browser History Sync',
    description: 'Synchronize browser history across devices with real-time updates and cross-browser support',
    version: '1.0.5',
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
        // Required by Mozilla for all new extensions (https://mzl.la/firefox-builtin-data-consent).
        // "browsingActivity" is the honest declaration here: this extension's entire purpose is
        // capturing visited URLs/titles/metadata and transmitting them to a server the user
        // configures - self-hosted and user-controlled, but it is genuinely collected and sent
        // off-device, which is what this field is asking about, not who ends up receiving it.
        data_collection_permissions: {
          required: ['browsingActivity'],
        },
      },
    },
  },
});
