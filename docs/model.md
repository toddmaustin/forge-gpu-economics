# FORGE model

FORGE (**Fabricate OR buy Gpu Economics**) compares the total cost of building a custom AI accelerator with buying vendor GPUs. The definitions below establish the model inputs before the equations that use them. Defaults are illustrative rather than quotes or forecasts.

## Assumptions and defaults

FORGE ships with an **illustrative 2026 baseline**, not a price quote or forecast. Users should replace every default with project-specific measurements or estimates. The machine-readable source of truth is [`defaults.json`](../defaults.json); yield inputs are numeric percentages greater than 0 and no more than 100.

The baseline assumes that useful-compute demand compounds annually, costs are summed without discounting, custom performance reflects real workload throughput at the required SLA rather than peak FLOPS, and vendor HBM is included in the vendor acquisition price. Descriptive choices such as foundry, process node, HBM capacity, and HBM bandwidth do not independently change the calculation; their economic or performance effects enter through the model's numeric inputs.

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

## Model details and equations

### 1. Decision

$$
A = TCO_{BUY} - TCO_{BUILD}
$$

BUILD wins when \(A>0\). BUY wins when \(A<0\).

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

with \(N_V(-1)=N_C(-1)=0\).

### Vendor GPU price

$$
C_V(t)=C_{V,0}(1+g_V)^t
$$

Vendor HBM purchase cost is embedded in \(C_V\).

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

and likewise for the vendor GPU. Bandwidth is descriptive; its workload impact should enter through \(R_P\).

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

where \(A_0\) is the baseline BUILD advantage. Parameters whose baseline is zero require scenario or absolute perturbations rather than multiplicative sensitivity.


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


## Assumption boundaries

### Datacenter cost boundaries

**Platform CAPEX per deployed device** represents host/server chassis, CPU and system memory allocation, PSUs, NICs, rack hardware, local switching/cabling, and similar non-accelerator IT equipment.

**Facility cost per deployed device** is a one-time building/site/general-facility allocation. The $3,000 default is a rough engineering estimate separating non-MEP construction from the power/cooling term. Land is not modeled independently.

**Power and cooling infrastructure capacity** is an annualized electrical and cooling plant charge. It is distinct from both facility CAPEX and consumed electricity.

For construction-cost context, see:

- [Turner & Townsend, *Data Centre Construction Cost Index 2025*](https://reports.turnerandtownsend.com/data-centre-construction-cost-index-2025/data-centre-cost-trends)
- [CBRE, *U.S. Real Estate Market Outlook Midyear Review 2026 — Data Centers*](https://www.cbre.com/insights/books/us-real-estate-market-outlook-midyear-review-2026/data-centers)

## Important limitations

- No discount rate or net-present-value calculation.
- No explicit utilization/load factor; modeled IT power is continuously incurred for 8,760 hours/year.
- No development lead-time penalty or execution-risk reserve.
- No vendor roadmap or performance progression.
- No explicit equipment replacement or failure rate.
- No independent land-cost parameter.
- Yield is an input rather than a defect-density model.
- Dies per wafer is an approximation without explicit die aspect ratio, scribe lanes, or wafer-edge exclusion.

## Space-based data-center TCO model

The **Terrestrial vs. space-based** view is a separate, parameterized scenario model. Its terrestrial side is the existing **Vendor IT (BUY)** calculation above, keeping GPU, platform, facility, electricity, cooling-capacity, and vendor-support accounting consistent. The orbital side estimates the fleet, power-system, thermal-system, launch, communications, operations, replacement, and disposal costs needed to deliver the same useful workload. Its illustrative inputs are stored in [`space-defaults.json`](../space-defaults.json), and the Reset button reloads that file.

The comparison reports:

$$A_S=TCO_{terrestrial}-TCO_{space}$$

A positive $A_S$ favors SPACE-BASED, while a negative value favors TERRESTRIAL. As elsewhere in FORGE, costs are nominal sums over the model horizon rather than discounted cash flows.

### Space-model variable glossary

The terrestrial workload and hardware variables retain the definitions in the earlier tables. The following inputs are specific to the orbital model; defaults are the illustrative values in `space-defaults.json`.

#### Fleet, platform, and launch

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $c_L$ | Launch cost | $200/kg | Mature, dedicated heavy-lift launch to dawn-dusk sun-synchronous LEO, including the intended allowances for integration, schedule/risk, insurance, and replenishment. |
| $m_{payload}$ | Compute payload mass | 35 kg/GPU | Compute-payload mass allocated to each orbital GPU. |
| $m_{bus}$ | Bus and structure mass | 18 kg/GPU | Spacecraft bus and structural mass allocated to each GPU. |
| $m_{shield}$ | Shielding mass | 12 kg/GPU | Radiation and physical shielding mass allocated to each GPU. |
| $m_{prop}$ | Propulsion mass | 3 kg/GPU | Propulsion and propellant mass allocated to each GPU for station keeping and collision avoidance. |
| $R_{perf}$ | Space useful performance vs. terrestrial GPU | 0.95× | Useful workload throughput of one available orbital GPU relative to one terrestrial vendor GPU. |
| $R_{rad}$ | Radiation/fault redundancy factor | 1.15× | Extra fleet multiplier for radiation effects, faults, and redundancy. |
| $L$ | Space hardware lifetime | 10 years | Assumed orbital hardware service life used by the annual replacement allowance. |
| $C_Q$ | Space qualification NRE | $250M | One-time space-qualification engineering and non-recurring cost. |
| $c_{platform}$ | Space platform cost | $20,000/GPU | Spacecraft platform hardware cost allocated to each newly launched GPU. |

#### Power and thermal systems

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $q_{solar}$ | Solar power density | 0.3 kW/m² | Beginning-of-life rated solar-array output per square meter. |
| $\mu_{solar}$ | Solar panel mass | 2 kg/m² | Solar-array mass per square meter, used to calculate launched mass. |
| $c_{solar}$ | Solar array cost | $35/W | Solar-array acquisition cost per watt of rated output. |
| $d_{solar}$ | Solar degradation/year | 2.5% | Fractional annual degradation in solar output. |
| $\eta_{point}$ | Solar pointing efficiency | 90% | Fraction of rated solar output delivered after pointing losses. |
| $D_{compute}$ | Compute duty cycle | 90% | Fraction of time for which the IT load is assumed to compute and produce heat. |
| $H_{eclipse}$ | Eclipse duration | 0 hours/day | Daily hours of battery-supported eclipse operation. |
| $e_{battery}$ | Battery specific energy | 180 Wh/kg | Usable battery energy per kilogram. |
| $c_{battery}$ | Battery cost | $1,000/kWh | Battery acquisition cost per kWh of capacity. |
| $P_{bus}$ | Spacecraft bus power | 100 W/GPU | Continuous spacecraft-bus power allocated to each GPU. |
| $q_{radiator}$ | Thermal radiation | 0.35 kW/m² | Radiator heat-rejection capability per square meter. |
| $f_{view}$ | Radiator view factor | 0.8 | Effective radiator view factor used to derate heat rejection. |
| $\mu_{radiator}$ | Radiator panel mass | 7 kg/m² | Deployed radiator mass per square meter. |
| $c_{radiator}$ | Radiator cost | $10,000/m² | Radiator acquisition cost per square meter. |

For compatibility with cached versions of the calculator, `space-defaults.json` also retains the deprecated `solar_specific_power_w_per_kg` value. Version 1.4.0 and later do not use that field; its default is equivalent to the two area-based defaults above.

The defaults likewise retain the deprecated `thermal_rejection_w_per_m2` value for cached pre-1.5 calculator code. Version 1.5.0 and later use `radiator_thermal_radiation_kw_per_m2` instead.

#### Communications, operations, and disposal

| Symbol | Parameter | Default | Definition |
|---|---|---:|---|
| $V_{data}$ | Data transferred | 0.1 TB/GPU-day | Daily transferred data volume per orbital GPU. |
| $e_{transfer}$ | Data-transfer energy | 2 kWh/TB | Electrical energy required to transfer one TB. |
| $A_{weather}$ | Ground-link weather availability | 98% | Fraction of time the ground link is available after weather effects. |
| $C_{ground}$ | Ground-station CAPEX | $150M | One-time ground-station capital cost. |
| $c_{link}$ | Inter-node link cost | $2,000/GPU | Inter-node communications hardware cost for each new GPU. |
| $C_{spectrum}$ | Spectrum licensing | $10M/year | Annual spectrum and licensing expense. |
| $C_{network}$ | Ground-network operations | $30M/year | Annual ground-network operating expense. |
| $C_{mission}$ | Mission control | $60M/year | Annual mission-control and staffing expense. |
| $C_{cyber}$ | Cybersecurity | $20M/year | Annual cybersecurity expense. |
| $C_{telemetry}$ | Telemetry software | $25M/year | Annual autonomy and telemetry software expense. |
| $c_{ops}$ | Spacecraft operations | $500/GPU-year | Annual per-orbital-GPU operations cost. |
| $s$ | Spares and servicing | 5% | Spares and servicing allowance as a percentage of new compute and platform acquisition cost. |
| $c_{EOL}$ | End-of-life cost | $150/kg | End-of-life handling and disposal cost per kilogram launched. |

Derived quantities used below are:

| Symbol | Definition |
|---|---|
| $N_S(t)$ | Orbital GPUs required in year $t$. |
| $\Delta N_S(t)$ | New orbital GPUs acquired and launched in year $t$, including replacements. |
| $P_{IT}$ | Per-GPU IT power before applying compute duty cycle. |
| $P_{transfer}$ | Average per-GPU data-transfer power. |
| $P_{avg}$ | Average per-GPU orbital electrical load. |
| $A_{solar}(t)$, $m_{solar}(t)$ | Solar-array area and mass per new GPU in year $t$. |
| $E_{battery}(t)$, $m_{battery}(t)$ | Required battery energy and mass per new GPU. |
| $A_{radiator}$ | Radiator area per new GPU. |
| $m_{dry}(t)$ | Total launched dry mass per new GPU. |

### Workload-equivalent orbital fleet

The model converts terrestrial GPU-equivalent demand into an orbital fleet using useful performance, compute duty cycle, ground-link weather availability, and radiation/fault redundancy:

$$N_S(t)=\frac{N_V(t)R_{rad}}{R_{perf}D_{compute}A_{weather}}$$

#### Distinguishing useful performance from radiation redundancy

$R_{perf}$ describes the useful throughput delivered by each **available, functioning** orbital GPU relative to a terrestrial GPU. The default value of 0.95 means that an orbital GPU is assumed to complete 95% as much useful work in a given unit of active compute time. This modest derating can represent conservative clock or power limits, thermal constraints, space-qualified packaging and system bottlenecks, or processing overhead such as error checking, checkpointing, retries, and validation. It is an aggregate scenario assumption rather than a physical prediction that a GPU intrinsically becomes slower in orbit.

$R_{rad}$ instead describes **additional deployed fleet capacity**. The default value of 1.15 means that 15% extra GPUs are provisioned to tolerate radiation upsets, faults, and unavailable hardware while maintaining the target workload. It does not reduce the throughput of a functioning device; it increases the number of devices purchased, launched, powered, and operated.

The two parameters therefore represent different consequences even though both increase the fleet in the equation above: useful-performance losses reduce productive work per available GPU and appear in the denominator, whereas redundancy adds standby or substitute capacity and appears in the numerator. To avoid double counting, temporary or permanent device unavailability covered by spare capacity should be assigned to $R_{rad}$, while recurring per-device processing overhead should be assigned to $R_{perf}$. Radiation effects should affect both only when independently justified—for example, error-checking overhead may reduce useful performance while separate spare hardware covers devices taken offline. Radiation-driven early retirement belongs in the hardware-lifetime assumption rather than either factor.

If an orbital GPU is expected to match terrestrial useful throughput whenever it is operating, $R_{perf}$ should be set to 1.0 and any additional fault-tolerance capacity should be represented by $R_{rad}$. Compute scheduling gaps belong to $D_{compute}$, and ground-link outages belong to $A_{weather}$.

New hardware covers both demand growth and a first-order annual replacement allowance:

$$\Delta N_S(t)=\max(0,N_S(t)-N_S(t-1))+\begin{cases}0,&t=0\\N_S(t-1)/L,&t>0\end{cases}$$

This is a continuous economic approximation: it permits fractional units and does not batch GPUs into spacecraft or launch vehicles.

#### Interpreting hardware lifetime

The space hardware lifetime is an assumed average service life that the model converts into a steady annual replenishment allowance. A lifetime of $L$ years replaces $1/L$ of the prior year's required orbital fleet each year after the first modeled year. For example, the default ten-year lifetime produces a replacement allowance equal to 10% of the prior year's required fleet per year, beginning in year 2.

Replacement units are added to the units required for demand growth. They therefore increase compute-hardware and space-platform purchases as well as the associated launch, solar-array, battery, radiator, communications-hardware, spares-and-servicing, and end-of-life costs. Lifetime does not change the required active fleet, its power draw, or its service availability directly; the model assumes that replenishment maintains the required fleet.

The reciprocal $1/L$ can be read as an implied average annual replacement fraction, but it is **not an explicit device failure rate or reliability model**. The calculation does not track device ages or deployment cohorts, sample random failures, apply a time-varying failure hazard, distinguish scheduled retirement from unexpected failure, or represent downtime while failed hardware awaits replacement. The lifetime parameter is therefore best interpreted as an economic proxy for all causes of retirement and replacement, not as a prediction that each device has an independent $1/L$ probability of failing in a given year.

### Orbital electrical load

Per-GPU IT power uses the vendor logic, HBM, and host/network assumptions:

$$P_{IT}=P_V+S_VP_H+P_S$$

Average data-transfer power is:

$$P_{transfer}=\frac{V_{data}e_{transfer}(1000)}{24}$$

where the factor of 1000 converts kW to W. Average orbital load applies the compute duty cycle to IT power but treats bus and transfer power as continuous:

$$P_{avg}=P_{IT}D_{compute}+P_{bus}+P_{transfer}$$

### Solar arrays and batteries

Solar-panel area is derived first from power density, pointing efficiency, and annual degradation (the factor of 1000 converts kW to W). Panel mass is then derived from its area and areal mass density:

$$A_{solar}(t)=\frac{P_{avg}}{1000q_{solar}\eta_{point}(1-d_{solar})^t}$$

$$m_{solar}(t)=A_{solar}(t)\mu_{solar}$$

Solar-array cost is charged on the rated output needed before pointing losses:

$$C_{solar}(t)=\Delta N_S(t)A_{solar}(t)(1000q_{solar})c_{solar}$$

The 0.3 kW/m² default is 300 W/m² of beginning-of-life rated electrical output, not 0.3 W/m². It is a plausible array-level round number near Earth: incident solar flux is approximately 1,361 W/m², and 300 W/m² corresponds to about 22% net conversion after cell efficiency, packing, wiring, temperature, mismatch, and structural losses. It is also internally consistent with the retained legacy defaults because 300 W/m² divided by 2 kg/m² is 150 W/kg. Pointing efficiency and annual degradation are applied separately, so effective first-year output at the default 90% pointing efficiency is 270 W/m².

The model assumes that solar arrays reject their own unconverted absorbed solar energy from their panel surfaces; it does not route all array waste heat through the compute radiators. Power-conditioning, cable, and other conversion losses are not separately modeled. A detailed design should verify array equilibrium temperature and add any losses conducted into the spacecraft thermal loop.

Battery energy, mass, and cost are:

$$E_{battery}=P_{avg}H_{eclipse}$$

$$m_{battery}=\frac{E_{battery}}{e_{battery}}$$

$$C_{battery}(t)=\Delta N_S(t)\frac{E_{battery}}{1000}c_{battery}$$

The illustrative sun-synchronous default assumes continuous sunlight and sets eclipse hours, battery energy, battery mass, and battery cost to zero. Other orbital scenarios should provide an appropriate eclipse duration.

### Radiative thermal system

With no convective cooling, radiator-panel area is derived first from duty-cycled IT heat, thermal radiation, and view factor (the factor of 1000 converts kW to W). Panel mass is then derived from that area and its areal mass:

$$A_{radiator}=\frac{P_{IT}D_{compute}}{1000q_{radiator}f_{view}}$$

$$m_{radiator,total}=A_{radiator}\mu_{radiator}$$

$$C_{thermal}(t)=\Delta N_S(t)A_{radiator}c_{radiator}$$

The 0.35 kW/m² default is 350 W/m² of gross thermal emission. By the Stefan-Boltzmann relation, $q=\epsilon\sigma T^4$, this is approximately the ideal blackbody flux at 280 K; an emissivity below one would require a higher radiator temperature to produce the same gross flux. The separate 0.8 view factor represents geometric obstruction and imperfect exposure to cold space, reducing modeled useful rejection to 280 W/m². At that effective rate, each continuous kilowatt of modeled heat requires about 3.57 m² of radiator and, at 7 kg/m², 25 kg of radiator mass.

The view factor is not a calculation of absorbed sunlight. The baseline assumes that attitude, placement, or sunshields keep the compute housings and radiators out of direct sunlight even though the solar arrays remain illuminated, and that the arrays reject their own waste heat locally. If a radiator or housing is sunlit, absorbed solar heat should be modeled separately using surface solar absorptivity, incident flux, and projected area; it can be comparable to the nominal rejection rate and materially increase required radiator area.

The present first-order radiator equation includes only duty-cycled IT power. It omits spacecraft-bus and power-conversion heat, the dissipated portion of communications power, absorbed solar and albedo loads, Earth infrared radiation, detailed surface emissivity and temperature, and thermal transients. These omissions are acceptable only as an explicitly shaded, first-pass economic scenario. Mission-level sizing should use a complete steady-state and transient thermal balance.

The Fleet & hardware summary scales the per-GPU results by the required orbital fleet. It reports total launch mass, total IT power at nameplate load, effective solar generation after pointing and degradation losses, and duty-cycled IT heat rejection. Total solar-panel and radiator areas are converted from square meters to square kilometers.

### Launch mass and cost

Per-GPU launched dry mass includes compute payload, bus/structure, shielding, propulsion, solar array, battery, and radiator mass:

$$m_{dry}(t)=m_{payload}+m_{bus}+m_{shield}+m_{prop}+m_{solar}(t)+m_{battery}+m_{radiator,total}$$

Launch and end-of-life charges are:

$$C_{launch}(t)=\Delta N_S(t)m_{dry}(t)c_L$$

$$C_{EOL}(t)=\Delta N_S(t)m_{dry}(t)c_{EOL}$$

The launch-rate input is intended to represent all-in vehicle, integration, schedule/risk, insurance, and replenishment economics rather than only an advertised vehicle price.

The $200/kg baseline is a forward-looking mature-launch scenario for a very large space data center using dedicated, high-cadence, fully reusable heavy-lift vehicles. It is not current market pricing. Current small-payload SSO rideshare pricing is roughly $7,000/kg, a current reusable Falcon-class benchmark is roughly $3,600/kg, and the best historical bulk Falcon Heavy LEO economics are roughly $1,800/kg. The baseline instead follows the mid-2030s scale assumed in Google's Project Suncatcher analysis, which identifies approximately $200/kg as plausible if launch volume and reuse increase dramatically. More aggressive estimates of roughly $60/kg with about 10-fold component reuse, below $15/kg with about 100-fold reuse, and an approximately $8/kg propellant floor are projected internal costs rather than achieved customer prices. A provider may charge $200--$300/kg even if its internal cost is substantially lower.

A dawn-dusk sun-synchronous orbit is still low Earth orbit. A vehicle launched directly onto the appropriate near-polar trajectory avoids the prohibitive plane change that would follow an equatorial insertion. A purpose-built, high-volume launch system is therefore assumed to incur only an approximately 0--20% SSO increment over its ordinary LEO economics, rather than a multiple of the LEO price. This assumption requires a compatible launch site and trajectory; the relevant orbit is approximately 500--800 km altitude and 97--99 degrees inclination.

Recommended launch-cost cases for sensitivity analysis are $500/kg conservative, $200/kg baseline, and $100/kg optimistic, with $50/kg reserved as a technology-limit case. At the baseline, a 100-tonne payload costs $20 million to launch; the same $20 million mission carrying 200 tonnes would reach $100/kg. These economics depend on large dedicated payloads, rapid complete reuse, and very high flight cadence, and remain unproven. Launch cost should therefore be treated as one of the space model's most important sensitivity inputs rather than as a forecast.

### Space cost ledger

The space ledger contains these CAPEX components:

- vendor GPU acquisition for new and replacement units, including vendor GPU price growth;
- space-platform acquisition;
- space-qualification NRE;
- launch;
- solar arrays, batteries, and deployable radiators; and
- initial ground-station CAPEX.

Its OPEX components are:

- inter-node links, annual spectrum/licensing, and ground-network operations;
- mission control and staffing, cybersecurity, and autonomy/telemetry software;
- per-node annual operations;
- spares and on-orbit servicing; and
- end-of-life disposal.

The recurring spares and servicing allowance is:

$$C_{spares}(t)=s\left[C_{hardware}(t)+C_{platform}(t)\right]$$

where $s$ is entered as a percentage and converted to a fraction by the implementation. Total space TCO is the sum of every ledger category over the horizon plus one-time qualification and ground-station costs.

### Space sensitivity analysis

The space view applies the same +20% one-at-a-time method to selected orbital inputs, then ranks them by the absolute change in $A_S$. The tested inputs cover launch cost, payload mass, useful performance, radiation redundancy, hardware lifetime, solar performance and degradation, compute duty cycle, radiator mass, weather availability, data volume, mission control, and spares/servicing. Inputs representing bounded fractions are capped at 100% where applicable.

### Space-model limitations

The orbital relationships omit launch batching, vehicle payload constraints, detailed orbital mechanics, financing/discounting, revenue, latency valuation, communications and spectrum throughput constraints, detailed radiation degradation, thermal transients, attitude constraints, discrete unit counts, and correlated failures. The redundancy factor, duty cycle, weather availability, and lifetime allowance are simplified proxies rather than availability or reliability simulations. The model is therefore suitable for first-pass scenario and sensitivity exploration, not mission design, a price quote, or a forecast.
