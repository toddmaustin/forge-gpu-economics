# Assumptions and defaults

FORGE ships with an **illustrative 2026 baseline**, not a price quote. Users should replace defaults with project-specific values.

The machine-readable source of truth is [`defaults.json`](../defaults.json).
Yield inputs in that file and in the calculator are numeric percentages from greater than 0 through 100.

## Current baseline

| Assumption | Default |
|---|---:|
| Year-1 vendor GPU fleet | 50,000 |
| Demand growth | 20%/year |
| Horizon | 4 years |
| Custom useful performance | 1.5× vendor GPU |
| Vendor GPU incl. HBM | $35,000 |
| Custom HBM | $14.50/GB |
| Custom/vendor HBM | 8 × 36 GB |
| HBM power | 60 W/stack |
| Vendor logic power excl. HBM | 720 W |
| Custom logic power excl. HBM | 400 W |
| Host/network power | 250 W/device |
| Wafer | 300 mm, $20,000 |
| Die area | 775 mm² |
| Known-good logic yield | 55% |
| Package yield | 90% |
| Design NRE | $650M |
| Initial software NRE | $135M |
| Ongoing custom software | $30M/year |
| Electricity | $0.07/kWh |
| PUE | 1.15 |
| Platform CAPEX | $9,000/device |
| Facility cost | $3,000/deployed device |
| Power & cooling infrastructure capacity | $900/IT-kW-year |
| Vendor software/support | $500/GPU-year |

## Datacenter cost boundaries

**Platform CAPEX / deployed device** is intended to represent non-accelerator IT hardware: host/server chassis, CPU and system memory allocation, PSUs, NICs, rack hardware, local switching/cabling, and similar equipment.

**Facility cost / deployed device** is a one-time building/site/general-facility allocation. The $3,000 default is a rough engineering estimate intended to separate non-MEP facility construction from the power/cooling term below. It does not currently model land as an independent input.

**Power & cooling infrastructure capacity** is an annualized $/IT-kW-year charge for datacenter electrical and cooling plant. It is distinct from electricity consumption.

For construction-cost context, see:
- Turner & Townsend, *Data Centre Construction Cost Index 2025*: https://reports.turnerandtownsend.com/data-centre-construction-cost-index-2025/data-centre-cost-trends
- CBRE, *U.S. Real Estate Market Outlook Midyear Review 2026 — Data Centers*: https://www.cbre.com/insights/books/us-real-estate-market-outlook-midyear-review-2026/data-centers

## Important limitations

- No discount rate or NPV.
- No explicit utilization/load factor; the model currently assumes the modeled IT power is continuously incurred over 8760 hours/year.
- No development lead-time penalty.
- No execution-risk reserve.
- No vendor roadmap/performance progression.
- No explicit equipment replacement/failure rate.
- No land-cost parameter.
- HBM bandwidth is descriptive; performance impact must be reflected in the useful-performance ratio.
- Yield is an input rather than a defect-density model.
- Dies-per-wafer is an approximation and does not explicitly model die aspect ratio, scribe lanes, or wafer-edge exclusion.
