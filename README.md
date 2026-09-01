# FORGE — Fabricate OR buy Gpu Economics

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

## Access the model online

Access the model online: <https://toddmaustin.github.io/forge-gpu-economics/>

## Repository structure

```text
forge-gpu-economics/
├── index.html              Interactive calculator
├── model.js                Pure economic model
├── ui.js                   Browser UI, pies, sensitivity
├── styles.css              Styling
├── defaults.json           Machine-readable assumptions
├── docs/
│   └── model.md            Equations, assumptions, and limitations
├── tests/
│   └── model.test.js       Regression/unit tests
├── LICENSE
└── README.md
```

## Methodology

See [`docs/model.md`](docs/model.md) for the equations, parameter definitions, assumptions, boundaries, and limitations.

## Contributing

Issues and pull requests are welcome. For assumption changes, please include:

- the parameter changed,
- proposed value or range,
- date/context,
- source or derivation,
- whether it affects BUILD, BUY, or both.

## Citing This Model

To cite the use of this model (or a derivative), please use the following citation:

Todd M. Austin, (2026). *FORGE: Fabricate OR buy GPU Economics* [Computer software]. GitHub. https://github.com/toddmaustin/forge-gpu-economics

## License

MIT. See [`LICENSE`](LICENSE).
