## Hide the Lovable "Edit with Lovable" badge

The badge is currently visible on the published site (`hide_badge: false`). As a Pro Lite subscriber, the project can be configured to hide the "Edit with Lovable" badge.

### Action
1. Call `publish_settings--set_badge_visibility` with `hide_badge: true`.

### Verification
1. Re-check `publish_settings--get_badge_visibility` to confirm `hide_badge: true`.
2. The published site will no longer display the badge after the next deployment.