import { computeTCO, breakEvenFleet, sensitivity } from "./model.js?v=1.1.2";

const ASSET_VERSION = "1.1.2";

const $ = s => document.querySelector(s);
const money = x => {
  const a = Math.abs(x);
  if (a >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(x / 1e3).toFixed(1)}k`;
  return `$${x.toFixed(0)}`;
};
const num = x => Math.round(x).toLocaleString();

const groups = [
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

let defaults;

function displayValue(v, kind) {
  if (kind === "percent") return v * 100;
  return v;
}
function readValue(input) {
  let v = Number(input.value);
  if (input.dataset.kind === "percent") v /= 100;
  return v;
}

function buildControls() {
  const root = $("#controls");
  root.innerHTML = "";
  for (const [title, fields] of groups) {
    const section = document.createElement("section");
    section.className = "panel";
    section.innerHTML = `<h2>${title}</h2><div class="control-grid"></div>`;
    const grid = section.querySelector(".control-grid");
    for (const [key, label, kind, step] of fields) {
      const wrap = document.createElement("label");
      wrap.className = "control";
      const suffix = kind === "percent" || kind === "percentage" ? " (%)" : kind === "years" ? " (years)" : kind === "ratio" ? " (×)" : "";
      const bounds = kind === "percentage" ? ' min="0" max="100"' : "";
      wrap.innerHTML = `<span>${label}${suffix}</span><input data-key="${key}" data-kind="${kind}" type="number" step="${step}"${bounds} value="${displayValue(defaults[key], kind)}">`;
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

function renderPie(el, entries) {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let start = 0;
  const colors = ["#2563eb", "#0f766e", "#9333ea", "#d97706", "#dc2626", "#0891b2", "#4f46e5", "#65a30d", "#7c3aed", "#be123c", "#475569", "#a16207"];
  const stops = entries.map(([, v], i) => {
    const end = start + v / total * 360;
    const s = `${colors[i % colors.length]} ${start}deg ${end}deg`;
    start = end;
    return s;
  }).join(",");
  el.querySelector(".pie").style.background = `conic-gradient(${stops})`;
  el.querySelector(".legend").innerHTML = entries.map(([name, v], i) => `<div><i style="background:${colors[i % colors.length]}"></i><span>${name}</span><strong>${money(v)}</strong></div>`).join("");
}

function render() {
  const x = currentInputs();
  try {
    const z = computeTCO(x);
    $("#error").textContent = "";
    $("#decision").textContent = z.decision;
    $("#advantage").textContent = `${z.buildAdvantage >= 0 ? "BUILD" : "BUY"} advantage ${money(Math.abs(z.buildAdvantage))}`;
    $("#build-tco").textContent = money(z.buildTCO);
    $("#buy-tco").textContent = money(z.buyTCO);
    const be = breakEvenFleet(x);
    $("#break-even").textContent = be.type === "value" ? num(be.fleet) : be.type === "below" ? "< 1" : `> ${num(be.fleet)}`;

    const y1 = z.year1;
    $("#fleet-summary").innerHTML = `
      <div><span>Year-1 vendor GPUs</span><strong>${num(z.yearly[0].vendorCount)}</strong></div>
      <div><span>Year-1 custom devices</span><strong>${num(z.yearly[0].customCount)}</strong></div>
      <div><span>Custom / 100 vendor GPUs</span><strong>${(100 / x.custom_performance_ratio).toFixed(1)}</strong></div>
      <div><span>Vendor IT power/device</span><strong>${num(y1.vendorPowerW)} W</strong></div>
      <div><span>Custom IT power/device</span><strong>${num(y1.customPowerW)} W</strong></div>
      <div><span>Custom module cost</span><strong>${money(y1.customModule.finishedModuleCost)}</strong></div>
      <div><span>Gross dies/wafer</span><strong>${y1.silicon.grossDiesPerWafer.toFixed(1)}</strong></div>
      <div><span>Good dies/wafer</span><strong>${y1.silicon.goodDiesPerWafer.toFixed(1)}</strong></div>`;

    const buyEntries = [
      ["Vendor GPUs incl. HBM", z.buy.vendorGPUsInclHBM],
      ["Platform CAPEX", z.buy.platformCapex],
      ["Power & cooling infrastructure", z.buy.powerCoolingInfrastructure],
      ["Electricity", z.buy.electricity],
      ["Facility cost", z.buy.facilityCost],
      ["Software/support", z.buy.softwareSupport]
    ];
    const buildEntries = [
      ["Design NRE", z.build.designNRE],
      ["Platform CAPEX", z.build.platformCapex],
      ["HBM", z.build.hbm],
      ["Power & cooling infrastructure", z.build.powerCoolingInfrastructure],
      ["Facility cost", z.build.facilityCost],
      ["Electricity", z.build.electricity],
      ["Initial software NRE", z.build.initialSoftwareNRE],
      ["Ongoing software", z.build.ongoingSoftware],
      ["Package/interposer", z.build.packageInterposer],
      ["Board/VRM/test", z.build.boardVrmTest],
      ["Logic silicon", z.build.logicSilicon],
      ["Mask/process NRE", z.build.maskProcessNRE]
    ];
    renderPie($("#buy-pie"), buyEntries);
    renderPie($("#build-pie"), buildEntries);

    const rows = (entries, total) => entries.map(([name, v]) => `<tr><td>${name}</td><td>${money(v)}</td><td>${(100 * v / total).toFixed(1)}%</td></tr>`).join("");
    $("#buy-costs").innerHTML = rows(buyEntries, z.buyTCO) + `<tr class="total"><td>Total BUY TCO</td><td>${money(z.buyTCO)}</td><td>100%</td></tr>`;
    $("#build-costs").innerHTML = rows(buildEntries, z.buildTCO) + `<tr class="total"><td>Total BUILD TCO</td><td>${money(z.buildTCO)}</td><td>100%</td></tr>`;

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

async function init() {
  defaults = await fetch(`./defaults.json?v=${ASSET_VERSION}`, { cache: "no-store" }).then(r => r.json());
  buildControls();
  $("#reset").addEventListener("click", () => { buildControls(); render(); });
  render();
}

init();
