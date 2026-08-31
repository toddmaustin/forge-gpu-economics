# Publish FORGE on GitHub Pages

The ChatGPT GitHub connection used to prepare this package can edit existing repositories but cannot create a new repository. To publish FORGE:

## GitHub web UI

1. Create a new **public** repository named `forge-gpu-economics` under the desired account.
2. Upload all files from this package to the repository root, preserving directories.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch **main** and folder **/(root)**.
6. Save.

For the `toddmaustin` account, the expected public URL is:

`https://toddmaustin.github.io/forge-gpu-economics/`

## Command line

From inside the unpacked directory:

```bash
git init
git add .
git commit -m "Initial FORGE release"
git branch -M main
git remote add origin https://github.com/toddmaustin/forge-gpu-economics.git
git push -u origin main
```

Then enable GitHub Pages as described above.

## Verify

- The Actions tab should show the `test` workflow passing.
- The Pages site should load the calculator.
- Changing an assumption should update TCO, pies, ledgers, break-even fleet, and sensitivity immediately in the browser.
