# Lakeview dashboard design preview

Dev-only route: /__dev/lakeview-preview. Uses the existing ServiceDashboard and authentication guard, with scoped CSS-module selectors and Lakeview-inspired navy, lake blue, neutral backgrounds, and restrained orange. No template package or backend migration was added. This is a custom skin exploration, not a full CRM or inventory implementation.

Preview uses current service data and existing actions; it is not a read-only mockup. Production dashboard files remain unchanged. Floot excludes __dev pages from publishing.

Verified: targeted Floot typecheck clean; desktop 1280x800 and phone 393x852 screenshots; queue and schedule navigation; desktop page has no horizontal overflow. No production publish requested.

Public gateway source mirror remains pending explicit approval after automatic review rejected the earlier private-to-public source push. Do not include preview access tokens in source control.