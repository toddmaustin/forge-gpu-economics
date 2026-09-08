import { computeTCO, breakEvenFleet, sensitivity } from "./model.js?v=1.5.1";
import { DEFAULT_MODEL_ID, FORGE_MODELS, getForgeModel } from "./forge-models.js?v=1.5.1";
import { inputPresentation, valueFromInput } from "./input-units.js?v=1.5.1";
import { computeSpaceTCO, spaceSensitivity } from "./space-model.js?v=1.5.1";

const ASSET_VERSION = "1.5.1";

const $ = s => document.querySelector(s);
const money = x => {
  const a = Math.abs(x);
  if (a >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(x / 1e3).toFixed(1)}k`;
  return `$${x.toFixed(0)}`;
};
const num = x => Math.round(x).toLocaleString();
const power = watts => {
  if (Math.abs(watts) >= 1e9) return `${(watts / 1e9).toFixed(2)} GW`;
  if (Math.abs(watts) >= 1e6) return `${(watts / 1e6).toFixed(1)} MW`;
  if (Math.abs(watts) >= 1e3) return `${(watts / 1e3).toFixed(1)} kW`;
  return `${num(watts)} W`;
};
const mass = kilograms => Math.abs(kilograms) >= 1000
  ? `${(kilograms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} tonnes`
  : `${kilograms.toFixed(1)} kg`;
const groupLabel = (name, entries) => `${name} (${money(entries.reduce((sum, [, value]) => sum + value, 0))})`;

const buyBuildGroups = [
  ["Fleet & performance", [
    ["fleet_year1", "Year-1 vendor GPU fleet", "number", 1],
    ["demand_growth", "Demand growth / year", "percent", 1],
    ["horizon_years", "TCO horizon", "years", 1],
    ["custom_performance_ratio", "Custom useful performance vs vendor GPU", "ratio", 0.05],
    ["vendor_gpu_price", "Vendor GPU price incl. HBM", "currency", 1000],
    ["vendor_gpu_price_growth", "Vendor GPU price change / year", "percent", 1]
  ]],
  ["HBM architecture", [
    ["hbm_price_per_gb", "Custom HBM price / GB", "currency", 0.1],
    ["hbm_price_growth", "HBM price change / year", "percent", 1],
    ["custom_hbm_stacks", "Custom HBM stacks", "number", 1],
    ["custom_gb_per_stack", "Custom GB / stack", "number", 1],
    ["custom_bandwidth_tbps_per_stack", "Custom bandwidth / stack (TB/s)", "number", 0.01],
    ["custom_hbm_overhead", "Custom HBM overhead", "percent", 1],
    ["vendor_hbm_stacks", "Vendor HBM stacks", "number", 1],
    ["vendor_gb_per_stack", "Vendor GB / stack", "number", 1],
    ["vendor_bandwidth_tbps_per_stack", "Vendor bandwidth / stack (TB/s)", "number", 0.01],
    ["hbm_power_w_per_stack", "HBM power / stack (W)", "number", 5]
  ]],
  ["Power", [
    ["vendor_logic_power_w", "Vendor GPU power excl. HBM (W)", "number", 10],
    ["custom_logic_power_w", "Custom accelerator power excl. HBM (W)", "number", 10],
    ["host_network_power_w_per_device", "Host/network power / device (W)", "number", 10]
  ]],
  ["Logic process & manufacturing", [
    ["wafer_diameter_mm", "Wafer diameter (mm)", "number", 10],
    ["wafer_price", "Wafer price", "currency", 500],
    ["wafer_price_growth", "Wafer price change / year", "percent", 1],
    ["die_area_mm2", "Compute die area (mm²)", "number", 5],
    ["logic_yield", "Known-good logic yield", "percentage", 1],
    ["mask_process_nre", "Mask/process tooling NRE", "currency", 1000000]
  ]],
  ["Packaging & NRE", [
    ["package_interposer_cost", "Advanced package/interposer", "currency", 100],
    ["package_yield", "Final package yield", "percentage", 1],
    ["board_vrm_test_cost", "Board, VRM & final test", "currency", 100],
    ["design_nre", "Architecture / RTL / verification / PD NRE", "currency", 25000000],
    ["initial_software_nre", "Compiler/software initial NRE", "currency", 5000000],
    ["ongoing_custom_software_per_year", "Ongoing custom software / year", "currency", 5000000]
  ]],
  ["Datacenter economics", [
    ["electricity_per_kwh", "Electricity ($/kWh)", "currency", 0.01],
    ["pue", "PUE", "number", 0.01],
    ["platform_capex_per_device", "Platform CAPEX / deployed device", "currency", 500],
    ["facility_cost_per_deployed_device", "Facility cost / deployed device", "currency", 500],
    ["power_cooling_capacity_per_it_kw_year", "Power & cooling infrastructure capacity ($/IT-kW-year)", "currency", 50],
    ["vendor_software_support_per_gpu_year", "Vendor software/support / GPU-year", "currency", 100]
  ]]
];

const spaceGroups = [
  ["Workload & Vendor IT baseline", [
    ["fleet_year1", "Year-1 workload (vendor-GPU equivalents)", "number", 1000], ["demand_growth", "Demand growth / year", "percent", 1], ["horizon_years", "TCO horizon", "years", 1],
    ["vendor_gpu_price", "Vendor GPU price incl. HBM", "currency", 1000], ["vendor_logic_power_w", "Vendor GPU power excl. HBM (W)", "number", 10],
    ["vendor_hbm_stacks", "HBM stacks / GPU", "number", 1], ["hbm_power_w_per_stack", "HBM power / stack (W)", "number", 5], ["host_network_power_w_per_device", "Host/network power / GPU (W)", "number", 10]
  ]],
  ["Launch & orbital architecture", [
    ["launch_cost_per_kg", "All-in launch cost / kg", "currency", 100], ["payload_mass_kg_per_gpu", "Compute payload mass / GPU (kg)", "number", 1], ["bus_structure_mass_kg_per_gpu", "Bus/structure mass / GPU (kg)", "number", 1],
    ["shielding_mass_kg_per_gpu", "Radiation shielding / GPU (kg)", "number", 1], ["propulsion_mass_kg_per_gpu", "Station-keeping/collision avoidance / GPU (kg)", "number", 1], ["end_of_life_cost_per_kg", "End-of-life disposal / kg", "currency", 10]
  ]],
  ["Compute hardware & resilience", [
    ["space_useful_performance_ratio", "Useful performance vs terrestrial GPU", "ratio", 0.05], ["radiation_redundancy_factor", "Radiation/fault redundancy factor", "ratio", 0.05], ["space_hardware_lifetime_years", "Replacement lifetime", "years", 0.5],
    ["qualification_nre", "Space qualification NRE", "currency", 10000000], ["space_platform_cost_per_gpu", "Space platform electronics / GPU", "currency", 1000], ["spares_servicing_percent", "Spares & servicing / new hardware", "percentage", 1]
  ]],
  ["Solar power & batteries", [
    ["solar_power_density_kw_per_m2", "Solar power density (kW/m²)", "number", 0.01], ["solar_mass_kg_per_m2", "Solar panel mass (kg/m²)", "number", 0.1], ["solar_array_cost_per_w", "Solar array cost / W", "currency", 1], ["solar_annual_degradation", "Solar degradation / year", "percent", 0.5],
    ["solar_pointing_efficiency", "Solar pointing efficiency", "percent", 1], ["compute_duty_cycle", "Peak-vs-average compute duty cycle", "percent", 1], ["spacecraft_bus_power_w_per_gpu", "Spacecraft bus power / GPU (W)", "number", 10],
    ["eclipse_hours_per_day", "Eclipse hours / day (sun-sync default: 0)", "number", 0.1], ["battery_specific_energy_wh_per_kg", "Battery specific energy (Wh/kg)", "number", 10], ["battery_cost_per_kwh", "Battery cost / kWh", "currency", 100]
  ]],
  ["Radiative thermal system", [
    ["radiator_thermal_radiation_kw_per_m2", "Thermal radiation (kW/m²)", "number", 0.01], ["radiator_view_factor", "Radiator view factor", "percent", 1], ["radiator_mass_kg_per_m2", "Radiator panel mass (kg/m²)", "number", 0.5], ["radiator_cost_per_m2", "Radiator cost / m²", "currency", 500]
  ]],
  ["Communications", [
    ["data_tb_per_gpu_day", "Data transferred / GPU-day (TB)", "number", 0.01], ["data_transfer_kwh_per_tb", "Transfer energy (kWh/TB)", "number", 0.1], ["weather_availability", "Ground-link weather availability", "percent", 1],
    ["ground_station_capex", "Ground-station CapEx", "currency", 10000000], ["inter_node_link_cost_per_gpu", "Inter-node link CapEx / GPU", "currency", 100], ["spectrum_licensing_per_year", "Spectrum/licensing / year", "currency", 1000000], ["ground_network_ops_per_year", "Ground network operations / year", "currency", 1000000]
  ]],
  ["Mission operations", [
    ["mission_control_per_year", "Mission control & staffing / year", "currency", 1000000], ["cybersecurity_per_year", "Cybersecurity / year", "currency", 1000000], ["telemetry_software_per_year", "Autonomy/telemetry software / year", "currency", 1000000], ["operations_per_spacecraft_year", "Operations / deployed GPU-year", "currency", 50]
  ]]
];
const groupsForModel = () => activeModel.id === "terrestrial-space" ? spaceGroups : buyBuildGroups;

let defaults;
let activeModel = getForgeModel(new URLSearchParams(window.location.search).get("model"));

function buildModelSelector() {
  const selector = $("#model-selector");
  selector.innerHTML = Object.values(FORGE_MODELS).map(model => `
    <button class="model-option" type="button" role="radio" aria-checked="${model.id === activeModel.id}" data-model-id="${model.id}">
      <span>${model.shortName}</span><small>${model.description}</small>
    </button>`).join("");
  selector.querySelectorAll("[data-model-id]").forEach(button => button.addEventListener("click", () => selectModel(button.dataset.modelId)));
}

function selectModel(id) {
  activeModel = getForgeModel(id);
  const url = new URL(window.location);
  if (activeModel.id === DEFAULT_MODEL_ID) url.searchParams.delete("model");
  else url.searchParams.set("model", activeModel.id);
  window.history.replaceState({}, "", url);

  document.querySelectorAll("[data-model-id]").forEach(button => {
    button.setAttribute("aria-checked", String(button.dataset.modelId === activeModel.id));
  });
  $("#model-title").textContent = activeModel.title;
  $("#model-description").textContent = activeModel.description;
  $("#model-note").textContent = activeModel.considerations
    ? "First-draft orbital architecture with mass, power, thermal, resilience, communications, operations, and disposal; terrestrial costs use Vendor IT."
    : "Adjust the shared hardware, fleet, and data-center assumptions below.";

  if (activeModel.considerations) {
    console.group("FORGE terrestrial vs. space-based CapEx/OpEx considerations");
    activeModel.considerations.forEach((consideration, index) => console.info(`${index + 1}. ${consideration}`));
    console.groupEnd();
  }
  loadModelDefaults().catch(showError);
}

function displayValue(v, kind) {
  if (kind === "percent") return v * 100;
  return v;
}
function readValue(input) {
  let v = valueFromInput(input.value, input.dataset.scale);
  if (input.dataset.kind === "percent") v /= 100;
  return v;
}

function buildControls() {
  const root = $("#controls");
  root.innerHTML = "";
  for (const [title, fields] of groupsForModel()) {
    const section = document.createElement("section");
    section.className = "panel";
    section.innerHTML = `<h2>${title}</h2><div class="control-grid"></div>`;
    const grid = section.querySelector(".control-grid");
    for (const [key, label, kind, step] of fields) {
      const wrap = document.createElement("label");
      wrap.className = "control";
      const presentation = inputPresentation(defaults[key], step);
      const unitSuffix = kind === "percent" || kind === "percentage" ? " (%)" : kind === "years" ? " (years)" : kind === "ratio" ? " (×)" : "";
      const bounds = kind === "percentage" ? ' min="0" max="100"' : "";
      wrap.innerHTML = `<span>${label}${unitSuffix}${presentation.suffix}</span><input data-key="${key}" data-kind="${kind}" data-scale="${presentation.scale}" type="number" step="${presentation.step}"${bounds} value="${displayValue(presentation.value, kind)}">`;
      grid.appendChild(wrap);
    }
    root.appendChild(section);
  }
  root.querySelectorAll("input").forEach(i => i.addEventListener("input", render));
}

function currentInputs() {
  const x = { ...defaults };
  document.querySelectorAll("[data-key]").forEach(i => x[i.dataset.key] = readValue(i));
  return x;
}

function renderPie(el, groups, costTypes) {
  const entries = groups.flatMap(([, groupEntries]) => groupEntries);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let start = 0;
  const slices = [];
  const colors = ["#2563eb", "#0f766e", "#9333ea", "#d97706", "#dc2626", "#0891b2", "#4f46e5", "#65a30d", "#7c3aed", "#be123c", "#475569", "#a16207"];
  const stops = entries.map(([name, v], i) => {
    const end = start + v / total * 360;
    const s = `${colors[i % colors.length]} ${start}deg ${end}deg`;
    slices.push({ name, value: v, start, end });
    start = end;
    return s;
  }).join(",");
  const pie = el.querySelector(".pie");
  pie.style.background = `conic-gradient(${stops})`;

  let tooltip = pie.querySelector(".pie-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    tooltip.innerHTML = "<span></span><strong></strong>";
    pie.appendChild(tooltip);
  }
  pie.onmousemove = event => {
    const bounds = pie.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const angle = (Math.atan2(x - bounds.width / 2, bounds.height / 2 - y) * 180 / Math.PI + 360) % 360;
    const slice = slices.find(item => angle >= item.start && angle < item.end) || slices.at(-1);
    if (!slice) return;
    tooltip.querySelector("span").textContent = slice.name;
    tooltip.querySelector("strong").textContent = money(slice.value);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.classList.add("visible");
  };
  pie.onmouseleave = () => tooltip.classList.remove("visible");

  let colorIndex = 0;
  el.querySelector(".legend").innerHTML = groups.map(([groupName, groupEntries]) => `
    <h4>${groupLabel(groupName, groupEntries)}</h4>
    ${groupEntries.map(([name, v]) => {
      const color = colors[colorIndex++ % colors.length];
      return `<div><i style="background:${color}"></i><span>${name}</span><strong>${money(v)}</strong></div>`;
    }).join("")}`).join("") + `
    <div class="cost-type-summary">
      <span><b>CapEx</b> (one-time): ${money(costTypes.capex)} (${(100 * costTypes.capex / total).toFixed(1)}%)</span>
      <span><b>OpEx</b> (recurring): ${money(costTypes.opex)} (${(100 * costTypes.opex / total).toFixed(1)}%)</span>
    </div>`;
}

function render() {
  if (!defaults) return;
  if (activeModel.id === "terrestrial-space") return renderSpace();
  const x = currentInputs();
  try {
    const z = computeTCO(x);
    $("#error").textContent = "";
    const winner = z.buildAdvantage >= 0 ? activeModel.left : activeModel.right;
    $("#decision").textContent = winner;
    $("#advantage").textContent = `${winner} advantage ${money(Math.abs(z.buildAdvantage))}`;
    $("#build-tco-label").textContent = `${activeModel.left} TCO`;
    $("#buy-tco-label").textContent = `${activeModel.right} TCO`;
    $("#build-tco").textContent = money(z.buildTCO);
    $("#buy-tco").textContent = money(z.buyTCO);
    $("#build-composition-label").textContent = `${activeModel.left} (${money(z.buildTCO)})`;
    $("#buy-composition-label").textContent = `${activeModel.right} (${money(z.buyTCO)})`;
    $("#build-ledger-label").textContent = `${activeModel.left} cost ledger`;
    $("#buy-ledger-label").textContent = `${activeModel.right} cost ledger`;
    $("#break-even-detail").textContent = activeModel.id === "buy-build" ? "year-1 vendor GPUs" : "shared-model fleet units";
    $("#sensitivity-description").textContent = `+20% one-at-a-time perturbation. Positive change favors ${activeModel.left}; negative favors ${activeModel.right}.`;
    const be = breakEvenFleet(x);
    $("#break-even").textContent = be.type === "value" ? num(be.fleet) : be.type === "below" ? "< 1" : `> ${num(be.fleet)}`;

    const y1 = z.year1;
    $("#fleet-summary").innerHTML = `
      <div><span>Year-1 vendor GPUs</span><strong>${num(z.yearly[0].vendorCount)}</strong></div>
      <div><span>Year-1 custom devices</span><strong>${num(z.yearly[0].customCount)}</strong></div>
      <div><span>Custom / 100 vendor GPUs</span><strong>${(100 / x.custom_performance_ratio).toFixed(1)}</strong></div>
      <div><span>Custom module cost</span><strong>${money(y1.customModule.finishedModuleCost)}</strong></div>
      <div><span>Vendor IT power/device</span><strong>${num(y1.vendorPowerW)} W</strong></div>
      <div><span>Custom IT power/device</span><strong>${num(y1.customPowerW)} W</strong></div>
      <div><span>Total Vendor IT power</span><strong>${power(z.yearly[0].vendorCount * y1.vendorPowerW)}</strong></div>
      <div><span>Total Custom IT power</span><strong>${power(z.yearly[0].customCount * y1.customPowerW)}</strong></div>
      <div><span>Gross dies/wafer</span><strong>${y1.silicon.grossDiesPerWafer.toFixed(1)}</strong></div>
      <div><span>Good dies/wafer</span><strong>${y1.silicon.goodDiesPerWafer.toFixed(1)}</strong></div>`;

    const buyGroups = [
      ["Device cost", [
        ["Vendor GPUs incl. HBM", z.buy.vendorGPUsInclHBM]
      ]],
      ["Common data center costs", [
        ["Platform CAPEX", z.buy.platformCapex],
        ["Power & cooling infrastructure", z.buy.powerCoolingInfrastructure],
        ["Electricity", z.buy.electricity],
        ["Facility cost", z.buy.facilityCost],
        ["Software/support", z.buy.softwareSupport]
      ]]
    ];
    const buildGroups = [
      ["Device cost", [
        ["Design NRE", z.build.designNRE],
        ["HBM", z.build.hbm],
        ["Package/interposer", z.build.packageInterposer],
        ["Board/VRM/test", z.build.boardVrmTest],
        ["Logic silicon", z.build.logicSilicon],
        ["Mask/process NRE", z.build.maskProcessNRE]
      ]],
      ["Common data center costs", [
        ["Platform CAPEX", z.build.platformCapex],
        ["Power & cooling infrastructure", z.build.powerCoolingInfrastructure],
        ["Electricity", z.build.electricity],
        ["Facility cost", z.build.facilityCost],
        ["Software/support", z.build.initialSoftwareNRE + z.build.ongoingSoftware]
      ]]
    ];
    renderPie($("#buy-pie"), buyGroups, z.buyCostTypes);
    renderPie($("#build-pie"), buildGroups, z.buildCostTypes);

    const rows = (entries, total) => entries.map(([name, v]) => `<tr><td>${name}</td><td>${money(v)}</td><td>${(100 * v / total).toFixed(1)}%</td></tr>`).join("");
    const groupedRows = (groups, total) => groups.map(([name, entries]) => `<tr class="cost-group"><th colspan="3">${groupLabel(name, entries)}</th></tr>${rows(entries, total)}`).join("");
    $("#buy-costs").innerHTML = groupedRows(buyGroups, z.buyTCO) + `<tr class="total"><td>Total ${activeModel.right} TCO</td><td>${money(z.buyTCO)}</td><td>100%</td></tr>`;
    $("#build-costs").innerHTML = groupedRows(buildGroups, z.buildTCO) + `<tr class="total"><td>Total ${activeModel.left} TCO</td><td>${money(z.buildTCO)}</td><td>100%</td></tr>`;

    try {
      const s = sensitivity(x);
      const max = Math.max(...s.map(v => Math.abs(v.delta)), 1);
      $("#sensitivity").classList.remove("sens-error");
      $("#sensitivity").innerHTML = s.map((v, i) => `<div class="sens-row"><div><span>${i + 1}. ${v.label}</span><strong>${v.delta >= 0 ? "+" : ""}${money(v.delta)}</strong></div><div class="bar"><b style="width:${Math.max(1, 100 * Math.abs(v.delta) / max)}%"></b></div></div>`).join("");
    } catch (e) {
      $("#sensitivity").classList.add("sens-error");
      $("#sensitivity").textContent = `Sensitivity unavailable: ${e.message}`;
    }
  } catch (e) {
    $("#error").textContent = e.message;
  }
}

function showError(error) { $("#error").textContent = error.message; }

function renderSpace() {
  const x = currentInputs();
  try {
    const z = computeSpaceTCO(x);
    $("#error").textContent = "";
    const winner = z.decision;
    $("#decision").textContent = winner;
    $("#advantage").textContent = `${winner} advantage ${money(Math.abs(z.spaceAdvantage))}`;
    $("#build-tco-label").textContent = "SPACE-BASED TCO";
    $("#buy-tco-label").textContent = "TERRESTRIAL TCO";
    $("#build-tco").textContent = money(z.spaceTCO);
    $("#buy-tco").textContent = money(z.terrestrialTCO);
    $("#build-composition-label").textContent = `SPACE-BASED (${money(z.spaceTCO)})`;
    $("#buy-composition-label").textContent = `TERRESTRIAL (${money(z.terrestrialTCO)})`;
    $("#build-ledger-label").textContent = "SPACE-BASED cost ledger";
    $("#buy-ledger-label").textContent = "TERRESTRIAL Vendor IT cost ledger";
    $("#break-even").textContent = "—";
    $("#break-even-detail").textContent = "not calculated in first draft";
    const y = z.yearly[0];
    $("#fleet-summary").innerHTML = `<div><span>Year-1 workload</span><strong>${num(y.workloadGPUs)} GPU-eq.</strong></div><div><span>Required orbital GPUs</span><strong>${num(y.requiredGPUs)}</strong></div>
      <div><span>Useful service availability</span><strong>${(100*x.space_useful_performance_ratio*x.compute_duty_cycle*x.weather_availability).toFixed(1)}%</strong></div><div><span>IT power / GPU</span><strong>${power(y.itPowerW)}</strong></div>
      <div><span>IT power consumption</span><strong>${power(y.totalITPowerW)}</strong></div><div><span>Total solar power generation</span><strong>${power(y.totalSolarPowerW)}</strong></div>
      <div><span>Solar panel size</span><strong>${y.totalSolarAreaKm2.toFixed(3)} km²</strong></div><div><span>Total heat radiation</span><strong>${power(y.totalHeatRadiationW)}</strong></div>
      <div><span>Radiator size</span><strong>${y.totalRadiatorAreaKm2.toFixed(3)} km²</strong></div>
      <div><span>Average orbital power / GPU</span><strong>${power(y.averagePowerW)}</strong></div><div><span>Launch mass / GPU</span><strong>${y.dryMassKg.toFixed(1)} kg</strong></div>
      <div><span>Total launch mass</span><strong>${mass(y.totalLaunchMassKg)}</strong></div>
      <div><span>Solar panel area / GPU</span><strong>${y.solarAreaM2.toFixed(1)} m²</strong></div><div><span>Solar mass / GPU</span><strong>${y.solarMassKg.toFixed(1)} kg</strong></div>
      <div><span>Battery mass / GPU</span><strong>${y.batteryMassKg.toFixed(1)} kg</strong></div>
      <div><span>Radiator area / GPU</span><strong>${y.radiatorAreaM2.toFixed(1)} m²</strong></div><div><span>Radiator mass / GPU</span><strong>${y.radiatorMassKg.toFixed(1)} kg</strong></div>`;
    const spaceGroups = [["Orbital hardware", [["Vendor compute hardware", z.space.computeHardware], ["Space platform", z.space.spacePlatform], ["Qualification NRE", z.space.qualification]]],
      ["Launch & spacecraft systems", [["All-in launch", z.space.launch], ["Solar arrays", z.space.solarArrays], ["Batteries", z.space.batteries], ["Radiators", z.space.thermal]]],
      ["Communications & operations", [["Ground/inter-node communications", z.space.communications], ["Mission operations", z.space.missionOperations], ["Spares & servicing", z.space.sparesServicing], ["End-of-life disposal", z.space.endOfLife]]]];
    const terrestrialGroups = [["Vendor IT hardware", [["Vendor GPUs incl. HBM", z.terrestrial.vendorGPUsInclHBM], ["Platform CAPEX", z.terrestrial.platformCapex], ["Facility cost", z.terrestrial.facilityCost]]],
      ["Terrestrial operations", [["Electricity", z.terrestrial.electricity], ["Power & cooling capacity", z.terrestrial.powerCoolingInfrastructure], ["Software/support", z.terrestrial.softwareSupport]]]];
    renderPie($("#build-pie"), spaceGroups, z.spaceCostTypes);
    renderPie($("#buy-pie"), terrestrialGroups, z.terrestrialCostTypes);
    const rows = (groups, total) => groups.map(([name, entries]) => `<tr class="cost-group"><th colspan="3">${groupLabel(name, entries)}</th></tr>${entries.map(([label,value]) => `<tr><td>${label}</td><td>${money(value)}</td><td>${(100*value/total).toFixed(1)}%</td></tr>`).join("")}`).join("");
    $("#build-costs").innerHTML = rows(spaceGroups,z.spaceTCO)+`<tr class="total"><td>Total SPACE-BASED TCO</td><td>${money(z.spaceTCO)}</td><td>100%</td></tr>`;
    $("#buy-costs").innerHTML = rows(terrestrialGroups,z.terrestrialTCO)+`<tr class="total"><td>Total TERRESTRIAL TCO</td><td>${money(z.terrestrialTCO)}</td><td>100%</td></tr>`;
    const sensitivities = spaceSensitivity(x);
    const max = Math.max(...sensitivities.map(value => Math.abs(value.delta)), 1);
    $("#sensitivity-description").textContent = "+20% one-at-a-time perturbation. Positive favors SPACE-BASED; negative favors TERRESTRIAL.";
    $("#sensitivity").innerHTML = sensitivities.map((value,index) => `<div class="sens-row"><div><span>${index+1}. ${value.label}</span><strong>${value.delta>=0?"+":""}${money(value.delta)}</strong></div><div class="bar"><b style="width:${Math.max(1,100*Math.abs(value.delta)/max)}%"></b></div></div>`).join("");
  } catch (error) { showError(error); }
}

async function loadModelDefaults() {
  const file = activeModel.defaultsFile || "defaults.json";
  defaults = await fetch(`./${file}?v=${ASSET_VERSION}`, { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error(`Unable to load ${file}.`);
    return response.json();
  });
  buildControls();
  $(".parameter-glossary").hidden = activeModel.id === "terrestrial-space";
  render();
}

async function init() {
  buildModelSelector();
  $("#reset").addEventListener("click", () => loadModelDefaults().catch(showError));
  selectModel(activeModel.id);
}

init();
