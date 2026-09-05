# Pi extension dependencies

This directory contains the npm packages loaded by the Fabric Pi profile.

## pi-zentui git-count patch

`pi-zentui` 0.22.3 reads Git category counts correctly but omits those counts when rendering modified, staged, untracked, and related status icons. The root `postinstall` script applies an idempotent consumer patch after npm installs dependencies.

Run the focused regression check with:

```bash
npm run test:pi-zentui
```

Remove the postinstall patch, its test, and this note after an upstream release passes that check without patching.
