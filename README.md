# FORGE — Fabricate OR buy GPU Economics

**FORGE** is an open, browser-based economic model for deciding whether to **BUILD a custom AI accelerator** or **BUY vendor GPUs** for large AI datacenter deployments.

It connects computer-architecture assumptions — useful performance, die size/yield, HBM, packaging, power — to datacenter total cost of ownership.

## What FORGE models

- Vendor-GPU fleet growth and acquisition cost
- Custom accelerator fleet normalization by useful performance
- Wafer/die economics and yield
- HBM capacity, bandwidth, power, and custom-build cost
- Advanced packaging and package yield
- Hardware and software NRE
- Platform CAPEX
- Facility cost per deployed device
- Electricity and PUE
- Power & cooling infrastructure capacity
- Vendor and custom software/support
- BUILD-vs-BUY break-even fleet
- One-at-a-time sensitivity analysis

## Run locally

Because the UI loads `defaults.json`, serve the directory through a tiny local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

No package installation, database, API key, or backend is required.

## Publish with GitHub Pages

1. Create a public repository named `forge-gpu-economics`.
2. Put the contents of this directory at the repository root.
3. Push to the `main` branch.
4. In **Settings → Pages**, choose **Deploy from a branch**.
5. Select **main** and **/(root)**, then save.

For the GitHub user `toddmaustin`, the expected URL is:

`https://toddmaustin.github.io/forge-gpu-economics/`

## Repository structure

```text
forge-gpu-economics/
├── index.html              Interactive calculator
├── model.js                Pure economic model
├── ui.js                   Browser UI, pies, sensitivity
├── styles.css              Styling
├── defaults.json           Machine-readable assumptions
├── docs/
│   ├── model.md            Full equations
│   └── assumptions.md      Default rationale and limitations
├── tests/
│   └── model.test.js       Regression/unit tests
├── CITATION.cff
├── LICENSE
└── README.md
```

## Default result

With the shipped illustrative baseline, FORGE estimates approximately:

- **BUY TCO:** $4.820B
- **BUILD TCO:** $2.416B
- **BUILD advantage:** $2.404B

These numbers are not a market quote or investment forecast. They are the output of editable engineering assumptions in `defaults.json`.

## Methodology

See [`docs/model.md`](docs/model.md) for equations and [`docs/assumptions.md`](docs/assumptions.md) for the parameter definitions, boundaries, and limitations.

## Contributing

Issues and pull requests are welcome. For assumption changes, please include:

- the parameter changed,
- proposed value or range,
- date/context,
- source or derivation,
- whether it affects BUILD, BUY, or both.

## License

MIT. See [`LICENSE`](LICENSE).
