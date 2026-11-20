# DockBuilder gateway route

Canonical route: https://[name].marineopstech.net/dock-builder. Lakeview deployment: https://lakeviewwebster.marineopstech.net/dock-builder. Each additional company requires its own configured gateway, Microsoft tenant and membership isolation; arbitrary wildcard tenants are not provisioned by this change.

The page uses NativeGatewayGuard. Every runtime asset is served by dock_builder/asset_GET after nativeGatewayAccess checks the Microsoft tenant and current enabled membership. No shared DockBuilder password, cross-site cookies, public asset uploads, Vercel proxy or auth bypass is used. The same-origin editor preserves worksheet integration, catalog editing, print and local JSON imports/exports. Existing browser drafts on the old domain must be exported there and imported at the gateway; browser storage cannot be copied across origins automatically. Online quote controls are not exposed in the current editor.

Source: LVMDockBuilder. Run npm run build:web followed by node tools/build-gateway.cjs there to generate protected helper modules and a source manifest under work/gateway-source. Sync generated modules and the gateway integration to this repository and its marine-ops-gateway mirror, typecheck/test, then publish Floot. Do not deploy the older Next.js gateway. The prior Vercel DockBuilder remains a rollback address and export source.
