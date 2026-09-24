# Changelog

## v1.0.8

Explicitly declared Firefox for Android compatibility (gecko_android), previously left unspecified/implicit rather than stated directly - Firefox for Android is this extension's primary target platform.

## v1.0.7

Fixed a manifest inconsistency flagged by Mozilla's validator: the minimum Firefox version was too low for the data_collection_permissions field added in 1.0.4.

## v1.0.6

New: favicons are now actually stored and synced as deduplicated image  (content-addressed by hash), not just as a URL. Previously only a URL was synced, which wasunreliable across devices/browsers; icons are now fetched, hashed, cached locally, and shared between devices without re-uploading duplicates.

## v1.0.5

Same change as 1.0.4, re-submitted after an AMO upload conflict on that version number.

## v1.0.4

Added the data_collection_permissions manifest field Mozilla requires for new extensions, declared honestly as "browsingActivity" since this extension's purpose is transmitting visited-page data to a user-configured sync server. (Re-submitted as 1.0.5 due to an AMO upload conflict - same change.)

## v1.0.3

Fixed a timing bug where a page's favicon could be lost when sync events arrived out of order across devices (an older "no favicon yet" event could overwrite a newer "favicon now known" event).

## v1.0.2

A device whose sync token had fully expired could get stuck endlessly retrying the server every 5 seconds with no way to recover. Fixed: a device can now automatically re-register itself (same identity, same history) when refreshing alone can't save it, and the retry loop now backs off exponentially instead of a fixed short interval.

## v1.0.1

Fixed a bug where the sync token was only refreshed once at startup. A device that stayed connected for a while (like a phone asleep for hours) would silently stop syncing forever once the token expired. Now refreshed before every sync attempt.

## v1.0.0

Initial signed build. Added a stable Firefox extension ID so future signed updates keep the same identity instead of a new random one each time.
