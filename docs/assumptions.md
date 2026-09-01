# Assumptions and defaults

FORGE ships with an **illustrative 2026 baseline**, not a price quote or forecast. Users should replace every default with project-specific measurements or estimates. The machine-readable source of truth is [`defaults.json`](../defaults.json); yield inputs are numeric percentages greater than 0 and no more than 100.

## Fleet and performance defaults

| Assumption | Default | Interpretation |
|---|---:|---|
| Year-1 vendor GPU fleet | 50,000 | Vendor GPUs required for year-1 useful compute. |
| Demand growth | 20%/year | Useful-compute demand compounds annually. |
| TCO horizon | 4 years | Costs are summed without discounting. |
| Custom useful performance | 1.5× vendor GPU | Real workload throughput at the required SLA, not peak FLOPS. |
| Vendor GPU including HBM | $35,000 | Complete acquisition price; vendor HBM is not separately costed. |
| Vendor GPU price change | 0%/year | No baseline price escalation or decline. |

## HBM and power defaults

| Assumption | Default | Interpretation |
|---|---:|---|
| Custom HBM price | $14.50/GB | BUILD-side initial HBM acquisition price. |
| Custom HBM price change | 0%/year | No baseline price escalation or decline. |
| Custom HBM | 8 stacks × 36 GB × 1.18 TB/s | 288 GB and 9.44 TB/s per custom device. |
| Vendor HBM | 8 stacks × 36 GB × 1.18 TB/s | 288 GB and 9.44 TB/s per vendor device. |
| Custom HBM overhead | 5% | Procurement/scrap allowance. |
| HBM power | 60 W/stack | Adds 480 W to either eight-stack device. |
| Vendor logic/module power excluding HBM | 720 W | Excludes HBM and host/network allocation. |
| Custom logic/module power excluding HBM | 400 W | Excludes HBM and host/network allocation. |
| Host/network power | 250 W/device | CPU, network, and associated system allocation. |

HBM bandwidth is descriptive. Its performance effect is represented only through the custom useful-performance ratio.

## Logic manufacturing defaults

| Assumption | Default | Interpretation |
|---|---:|---|
| Foundry | TSMC | Descriptive; it does not independently change an equation. |
| Process/node | N3 / N3E (3 nm class) | Descriptive; economics enter through wafer, area, and yield inputs. |
| Wafer diameter | 300 mm | Used by the approximate dies-per-wafer equation. |
| Initial wafer price | $20,000 | Cost per wafer in year 1. |
| Wafer price change | 0%/year | No baseline price escalation or decline. |
| Compute die area | 775 mm² | Custom logic die area. |
| Known-good logic yield | 55% | Usable fraction of approximate gross dies. |
| Mask/process tooling NRE | $15M | One-time masks, tapeout, and tooling. |

## Packaging and engineering defaults

| Assumption | Default | Interpretation |
|---|---:|---|
| Advanced package/interposer | $1,500/attempt | Enters the package-yield-adjusted BOM. |
| Final package yield | 90% | Logic, HBM, and package cost are divided by this yield. |
| Board, VRM, and final test | $1,200/device | Added after the package-yield term. |
| Design NRE | $650M | Architecture, RTL, verification, and physical design. |
| Initial software NRE | $135M | One-time compiler/runtime/software development. |
| Ongoing custom software | $30M/year | Fleet-wide recurring effort, not per-device cost. |

## Datacenter economics defaults

| Assumption | Default | Interpretation |
|---|---:|---|
| Electricity | $0.07/kWh | Energy actually consumed. |
| PUE | 1.15 | Total facility energy divided by IT energy. |
| Platform CAPEX | $9,000/device | Non-accelerator IT platform hardware. |
| Facility cost | $3,000/deployed device | One-time general building/site allocation. |
| Power/cooling infrastructure capacity | $900/IT-kW-year | Recurring annualized plant-capacity charge. |
| Vendor software/support | $500/GPU-year | Recurring per-vendor-GPU cost. |

### Datacenter cost boundaries

**Platform CAPEX / deployed device** represents host/server chassis, CPU and system memory allocation, PSUs, NICs, rack hardware, local switching/cabling, and similar non-accelerator IT equipment.

**Facility cost / deployed device** is a one-time building/site/general-facility allocation. The $3,000 default is a rough engineering estimate separating non-MEP construction from the power/cooling term. Land is not modeled independently.

**Power and cooling infrastructure capacity** is an annualized electrical and cooling plant charge. It is distinct from both facility CAPEX and consumed electricity.

For construction-cost context, see:
- Turner & Townsend, *Data Centre Construction Cost Index 2025*: https://reports.turnerandtownsend.com/data-centre-construction-cost-index-2025/data-centre-cost-trends
- CBRE, *U.S. Real Estate Market Outlook Midyear Review 2026 — Data Centers*: https://www.cbre.com/insights/books/us-real-estate-market-outlook-midyear-review-2026/data-centers

## Important limitations

- No discount rate or NPV.
- No explicit utilization/load factor; modeled IT power is continuously incurred for 8,760 hours/year.
- No development lead-time penalty or execution-risk reserve.
- No vendor roadmap/performance progression.
- No explicit equipment replacement/failure rate.
- No independent land-cost parameter.
- Yield is an input rather than a defect-density model.
- Dies per wafer is an approximation without explicit die aspect ratio, scribe lanes, or wafer-edge exclusion.
