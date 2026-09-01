# FORGE model

FORGE (**Fabricate OR buy GPU Economics**) compares the total cost of building a custom AI accelerator with buying vendor GPUs. The definitions below establish the model inputs before the equations that use them. Defaults are illustrative rather than quotes or forecasts.

## Model parameters

### Fleet and performance

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $N_0$ | Year-1 vendor GPU fleet | 50,000 | Vendor GPUs needed to satisfy the first-year workload. |
| $g_D$ | Demand growth/year | 20% | Annual useful-compute growth. |
| $H$ | TCO horizon | 4 years | Analysis period. |
| $R_P$ | Custom useful performance vs. vendor GPU | 1.5× | Useful workload-throughput ratio at the required SLA, not peak FLOPS. |
| $C_{V,0}$ | Vendor GPU price including HBM | $35,000 | Complete initial vendor GPU acquisition price. |
| $g_V$ | Vendor GPU price change/year | 0% | Annual vendor-price change. |

### HBM

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $p_{H,0}$ | Custom HBM price | $14.50/GB | Initial HBM acquisition price on the BUILD side. |
| $g_H$ | HBM price change/year | 0% | Annual custom-HBM price change. |
| $S_C$, $S_V$ | Custom, vendor HBM stacks | 8, 8 | HBM stacks per accelerator. |
| $G_C$, $G_V$ | Custom, vendor GB/stack | 36 GB, 36 GB | Capacity of each HBM stack. |
| $B_C$, $B_V$ | Custom, vendor bandwidth/stack | 1.18, 1.18 TB/s | Descriptive bandwidth per stack. |
| $O_H$ | Custom HBM overhead | 5% | Procurement and scrap allowance. |
| $P_H$ | HBM power/stack | 60 W | Operating power attributed to each stack. |

Vendor HBM purchase cost is already embedded in $C_{V,0}$.

### Power

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $P_V$ | Vendor GPU power excluding HBM | 720 W | Vendor logic/module power. |
| $P_C$ | Custom accelerator power excluding HBM | 400 W | Custom logic/module power. |
| $P_S$ | Host/network power/device | 250 W | Associated CPU, network, and system power. |

### Logic manufacturing

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| — | Foundry | TSMC | Descriptive custom-logic manufacturer. |
| — | Process/node | N3 / N3E (3 nm class) | Descriptive fabrication process. |
| $D$ | Wafer diameter | 300 mm | Diameter used in the die-count approximation. |
| $C_{W,0}$ | Wafer price | $20,000 | Initial wafer cost. |
| $g_W$ | Wafer price change/year | 0% | Annual wafer-price change. |
| $A_D$ | Compute die area | 775 mm² | Area of the custom logic die. |
| $Y_L$ | Known-good logic yield | 55% | Fraction of gross dies that are usable. |
| $C_M$ | Mask/process tooling NRE | $15M | Masks, tapeout, and process-tooling cost. |

### Packaging and engineering

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $C_P$ | Advanced package/interposer | $1,500 | Cost per assembly attempt. |
| $Y_P$ | Final package yield | 90% | Fraction of assemblies producing a finished device. |
| $C_B$ | Board, VRM, and final test | $1,200 | Module-completion cost after package yield. |
| $C_D$ | Design NRE | $650M | Architecture, RTL, verification, and physical design. |
| $C_{SW0}$ | Initial software NRE | $135M | Compiler, runtime, and initial software development. |
| $C_{SWC}$ | Ongoing custom software | $30M/year | Fleet-wide recurring software effort. |

### Datacenter economics

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $c_E$ | Electricity | $0.07/kWh | Price of energy actually consumed. |
| $PUE$ | Power usage effectiveness | 1.15 | Facility energy divided by IT energy. |
| $C_S$ | Platform CAPEX/device | $9,000 | Server, rack, network, and other IT platform hardware. |
| $C_F$ | Facility cost/deployed device | $3,000 | One-time building, site, and general-facility allocation. |
| $c_{PC}$ | Power/cooling infrastructure capacity | $900/IT-kW-year | Annualized electrical and heat-removal plant capacity. |
| $C_{SWV}$ | Vendor software/support | $500/GPU-year | Recurring vendor support and software. |

These infrastructure inputs deliberately have separate boundaries: $C_S$ is IT equipment around the accelerator, $C_F$ is general facility CAPEX, $c_{PC}$ is power-delivery and cooling capacity, and $c_E$ is consumed electricity.

## Assumptions, boundaries, and limitations

FORGE ships with an **illustrative 2026 baseline**, not a price quote or forecast. Users should replace every default with project-specific measurements or estimates. The machine-readable source of truth is [`defaults.json`](../defaults.json). Yield inputs are numeric percentages greater than 0 and no more than 100.

HBM bandwidth is descriptive. Its performance effect is represented only through the custom useful-performance ratio, $R_P$.

### Datacenter cost boundaries

**Platform CAPEX per deployed device**, $C_S$, represents host/server chassis, CPU and system memory allocation, PSUs, NICs, rack hardware, local switching/cabling, and similar non-accelerator IT equipment.

**Facility cost per deployed device**, $C_F$, is a one-time building, site, and general-facility allocation. The $3,000 default is a rough engineering estimate separating non-MEP construction from the power and cooling term. Land is not modeled independently.

**Power and cooling infrastructure capacity**, $c_{PC}$, is an annualized electrical and cooling plant charge. It is distinct from both facility CAPEX and consumed electricity.

For construction-cost context, see:

- [Turner & Townsend, *Data Centre Construction Cost Index 2025*](https://reports.turnerandtownsend.com/data-centre-construction-cost-index-2025/data-centre-cost-trends)
- [CBRE, *U.S. Real Estate Market Outlook Midyear Review 2026 — Data Centers*](https://www.cbre.com/insights/books/us-real-estate-market-outlook-midyear-review-2026/data-centers)

### Important limitations

- No discount rate or net present value calculation.
- No explicit utilization or load factor; modeled IT power is continuously incurred for 8,760 hours per year.
- No development lead-time penalty or execution-risk reserve.
- No vendor roadmap or performance progression.
- No explicit equipment replacement or failure rate.
- No independent land-cost parameter.
- Yield is an input rather than a defect-density model.
- Dies per wafer is an approximation without explicit die aspect ratio, scribe lanes, or wafer-edge exclusion.

## Model details and equations

### 1. Decision

$$
A = TCO_{BUY} - TCO_{BUILD}
$$

BUILD wins when $A>0$. BUY wins when $A<0$.

### Fleet

$$
N_V(t)=N_0(1+g_D)^t
$$

$$
N_C(t)=\frac{N_V(t)}{R_P}
$$

Only fleet growth requires new hardware:

$$
\Delta N_V(t)=\max(0,N_V(t)-N_V(t-1))
$$

$$
\Delta N_C(t)=\max(0,N_C(t)-N_C(t-1))
$$

with $N_V(-1)=N_C(-1)=0$.

### Vendor GPU price

$$
C_V(t)=C_{V,0}(1+g_V)^t
$$

Vendor HBM purchase cost is embedded in $C_V$.

### Gross dies per wafer

$$
N_{gross}=\frac{\pi(D/2)^2}{A_D}-\frac{\pi D}{\sqrt{2A_D}}
$$

The first term is ideal wafer-area packing. The second is an edge-loss approximation.

### Good dies and logic cost

$$
N_{good}=N_{gross}Y_L
$$

$$
C_W(t)=C_{W,0}(1+g_W)^t
$$

$$
C_L(t)=\frac{C_W(t)}{N_{good}}
$$

### Custom HBM

$$
p_H(t)=p_{H,0}(1+g_H)^t
$$

$$
C_H(t)=S_C G_C p_H(t)(1+O_H)
$$

Capacity and bandwidth are:

$$
M_C=S_CG_C, \qquad BW_C=S_CB_C
$$

and likewise for the vendor GPU. Bandwidth is descriptive; its workload impact should enter through $R_P$.

### Finished custom module

$$
C_C(t)=\frac{C_L(t)+C_H(t)+C_P}{Y_P}+C_B
$$

Final package yield therefore economically affects logic, HBM, and package/interposer cost. Board/VRM/final-test cost is added after this yield term.

### Fixed NRE

$$
NRE=C_D+C_{SW0}+C_M
$$

### IT power

$$
P_{IT,V}=P_V+S_VP_H+P_S
$$

$$
P_{IT,C}=P_C+S_CP_H+P_S
$$

### Electricity

There are 8760 hours in a non-leap year.

$$
E_V(t)=N_V(t)\frac{P_{IT,V}}{1000}(8760)(PUE)c_E
$$

$$
E_C(t)=N_C(t)\frac{P_{IT,C}}{1000}(8760)(PUE)c_E
$$

### Platform CAPEX

$$
S_V(t)=\Delta N_V(t)C_S
$$

$$
S_C(t)=\Delta N_C(t)C_S
$$

Platform CAPEX represents non-accelerator IT hardware: host/server, rack, local network, etc.

### Facility cost per deployed device

$$
F_V(t)=\Delta N_V(t)C_F
$$

$$
F_C(t)=\Delta N_C(t)C_F
$$

This is a one-time building/site/general-facility allocation.

### Power and cooling infrastructure capacity

$$
I_V(t)=N_V(t)\frac{P_{IT,V}}{1000}c_{PC}
$$

$$
I_C(t)=N_C(t)\frac{P_{IT,C}}{1000}c_{PC}
$$

This annualized capacity charge represents electrical and cooling plant required to support IT kW. It is distinct from the electricity bill.

### Software

$$
SW_V(t)=N_V(t)C_{SWV}
$$

$$
SW_C(t)=C_{SWC}
$$

### Complete BUY TCO

$$
TCO_{BUY}=\sum_{t=0}^{H-1}\left[\Delta N_V(t)(C_V(t)+C_S+C_F)+E_V(t)+I_V(t)+SW_V(t)\right]
$$

### Complete BUILD TCO

$$
TCO_{BUILD}=NRE+\sum_{t=0}^{H-1}\left[\Delta N_C(t)(C_C(t)+C_S+C_F)+E_C(t)+I_C(t)+C_{SWC}\right]
$$

### Sensitivity

FORGE currently uses a +20% one-at-a-time perturbation:

$$
x'=1.2x
$$

$$
S_x=\left[TCO_{BUY}(x')-TCO_{BUILD}(x')\right]-A_0
$$

where $A_0$ is the baseline BUILD advantage. Parameters whose baseline is zero require scenario or absolute perturbations rather than multiplicative sensitivity.


## Default scenario results

With the baseline parameters, the workload-equivalent vendor fleet is 50,000, 60,000, 72,000, and 86,400 GPUs across the four years. At $R_P=1.5$, BUILD deploys 57,600 custom devices in total versus 86,400 vendor GPUs purchased by BUY.

The manufacturing equations produce approximately 67.27 gross dies and 37.0 known-good dies per wafer, about $541 of logic silicon per good die, $4,384.80 of HBM per assembly attempt, and approximately $8,339 per finished custom module. Fixed BUILD NRE is $800M ($650M design + $135M initial software + $15M masks/tooling). Modeled IT power is 1,450 W per vendor device and 1,130 W per custom device.

| BUY cost | Four-year total | Share |
|---|---:|---:|
| Vendor GPUs including HBM | $3.0240B | 62.7% |
| Platform CAPEX | $777.6M | 16.1% |
| Power/cooling infrastructure capacity | $350.3M | 7.3% |
| Electricity | $274.4M | 5.7% |
| Facility cost | $259.2M | 5.4% |
| Vendor software/support | $134.2M | 2.8% |
| **Total BUY TCO** | **$4.8197B** | **100%** |

| BUILD cost | Four-year total | Share |
|---|---:|---:|
| Design NRE | $650.0M | 26.9% |
| Platform CAPEX | $518.4M | 21.5% |
| HBM including package-yield loss | $280.6M | 11.6% |
| Power/cooling infrastructure capacity | $182.0M | 7.5% |
| Facility cost | $172.8M | 7.2% |
| Electricity | $142.6M | 5.9% |
| Initial software NRE | $135.0M | 5.6% |
| Ongoing custom software | $120.0M | 5.0% |
| Package/interposer including yield loss | $96.0M | 4.0% |
| Board, VRM, and final test | $69.1M | 2.9% |
| Logic silicon including package-yield loss | $34.6M | 1.4% |
| Mask/process tooling NRE | $15.0M | 0.6% |
| **Total BUILD TCO** | **$2.4161B** | **100%** |

The default result is therefore a **$2.4036B BUILD advantage**. Custom HBM costs about 8.1 times the custom logic silicon over the fleet, so the compute die is not the dominant recurring accelerator BOM item under these assumptions. BUILD wins primarily because the $800M fixed development investment is offset by avoiding the $35,000 vendor acquisition price at large scale, while the 1.5× useful-performance assumption also reduces device count, platform and facility CAPEX, electricity, and power/cooling capacity.
