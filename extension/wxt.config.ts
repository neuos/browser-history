import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Browser History Sync',
    description: 'Synchronize browser history across devices with real-time updates and cross-browser support',
    version: '1.0.7',
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
        // data_collection_permissions (below) needs Firefox 140+ desktop / 142+ Android - AMO
        // flagged this as an actual inconsistency when it was still 109.0. Set to the higher of
        // the two (142) so it satisfies both; this is a personal extension for a small, known
        // set of devices, so requiring a reasonably current Firefox is a non-issue in practice.
        strict_min_version: '142.0',
        // Required by Mozilla for all new extensions (https://mzl.la/firefox-builtin-data-consent).
        // "browsingActivity" is the honest declaration here: this extension's entire purpose is
        // capturing visited URLs/titles/metadata and transmitting them to a server the user
        // configures - self-hosted and user-controlled, but it is genuinely collected and sent
        // off-device, which is what this field is asking about, not who ends up receiving it.
        //
        // Cast needed: WXT's manifest type for browser_specific_settings.gecko doesn't include
        // this field yet (Mozilla added the requirement more recently than that type), even
        // though it passes straight through to the built manifest.json correctly - confirmed by
        // inspecting the actual build output.
        ...({ data_collection_permissions: { required: ['browsingActivity'] } } as object),
      },
    },
  },
});
