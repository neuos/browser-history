import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Browser History Sync',
    description: 'Synchronize browser history across devices with real-time updates and cross-browser support',
    version: '1.0.8',
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
      // Firefox for Android is the actual primary target for this extension (per the whole
      // point of this project), but without this block AMO/Firefox track its compatibility
      // range independently of gecko.strict_min_version above and leave it unspecified/implicit
      // - the earlier "142 introduced support" vs "140" validation warnings were exactly this:
      // Mozilla already tracks desktop and Android minimums separately, so this needs to be
      // declared separately too, not inferred from the desktop block.
      ...({ gecko_android: { strict_min_version: '142.0' } } as object),
    },
  },
});
