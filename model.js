/* FORGE — Fabricate OR buy Gpu Economics
 * Pure model code. No DOM dependencies.
 */

export function grossDiesPerWafer(waferDiameterMm, dieAreaMm2) {
  const D = Number(waferDiameterMm);
  const A = Number(dieAreaMm2);
  if (!(D > 0) || !(A > 0)) throw new Error("Wafer diameter and die area must be positive.");
  return Math.PI * (D / 2) ** 2 / A - Math.PI * D / Math.sqrt(2 * A);
}

export function normalizeInputs(raw) {
  const x = { ...raw };
  for (const key of ["logic_yield", "package_yield"]) {
    const percentage = Number(x[key]);
    if (!(percentage > 0 && percentage <= 100)) {
      throw new Error(`${key} must be a percentage greater than 0 and no more than 100.`);
    }
    x[key] = percentage / 100;
  }
  const positive = [
    "fleet_year1", "horizon_years", "custom_performance_ratio", "wafer_diameter_mm",
    "die_area_mm2", "package_yield", "logic_yield", "pue"
  ];
  for (const k of positive) {
    if (!(Number(x[k]) > 0)) throw new Error(`${k} must be positive.`);
  }
  if (x.pue < 1) throw new Error("PUE must be at least 1.0.");
  return x;
}

export function vendorHBM(x) {
  return {
    capacityGB: x.vendor_hbm_stacks * x.vendor_gb_per_stack,
    bandwidthTBps: x.vendor_hbm_stacks * x.vendor_bandwidth_tbps_per_stack,
    powerW: x.vendor_hbm_stacks * x.hbm_power_w_per_stack
  };
}

export function customHBM(x, year) {
  const pricePerGB = x.hbm_price_per_gb * (1 + x.hbm_price_growth) ** year;
  const capacityGB = x.custom_hbm_stacks * x.custom_gb_per_stack;
  return {
    capacityGB,
    bandwidthTBps: x.custom_hbm_stacks * x.custom_bandwidth_tbps_per_stack,
    powerW: x.custom_hbm_stacks * x.hbm_power_w_per_stack,
    pricePerGB,
    rawCost: capacityGB * pricePerGB * (1 + x.custom_hbm_overhead)
  };
}

export function siliconCost(x, year) {
  const gross = grossDiesPerWafer(x.wafer_diameter_mm, x.die_area_mm2);
  const good = gross * x.logic_yield;
  const waferPrice = x.wafer_price * (1 + x.wafer_price_growth) ** year;
  return {
    grossDiesPerWafer: gross,
    goodDiesPerWafer: good,
    waferPrice,
    knownGoodDieCost: waferPrice / good
  };
}

export function customModuleCost(x, year) {
  const silicon = siliconCost(x, year);
  const hbm = customHBM(x, year);
  const logicEffective = silicon.knownGoodDieCost / x.package_yield;
  const hbmEffective = hbm.rawCost / x.package_yield;
  const packageEffective = x.package_interposer_cost / x.package_yield;
  const board = x.board_vrm_test_cost;
  return {
    silicon,
    hbm,
    logicEffective,
    hbmEffective,
    packageEffective,
    board,
    finishedModuleCost: logicEffective + hbmEffective + packageEffective + board
  };
}

export function computeTCO(raw, fleetOverride = null) {
  const x = normalizeInputs(raw);
  const H = Math.max(1, Math.round(x.horizon_years));
  const N0 = fleetOverride == null ? x.fleet_year1 : Number(fleetOverride);
  const R = x.custom_performance_ratio;
  const vendorHbm = vendorHBM(x);
  const vendorPowerW = x.vendor_logic_power_w + vendorHbm.powerW + x.host_network_power_w_per_device;

  const buy = {
    vendorGPUsInclHBM: 0,
    platformCapex: 0,
    facilityCost: 0,
    electricity: 0,
    powerCoolingInfrastructure: 0,
    softwareSupport: 0
  };

  const build = {
    designNRE: x.design_nre,
    initialSoftwareNRE: x.initial_software_nre,
    maskProcessNRE: x.mask_process_nre,
    logicSilicon: 0,
    hbm: 0,
    packageInterposer: 0,
    boardVrmTest: 0,
    platformCapex: 0,
    facilityCost: 0,
    electricity: 0,
    powerCoolingInfrastructure: 0,
    ongoingSoftware: 0
  };

  const yearly = [];
  let prevVendor = 0;
  let prevCustom = 0;

  for (let t = 0; t < H; t++) {
    const vendorCount = N0 * (1 + x.demand_growth) ** t;
    const customCount = vendorCount / R;
    const newVendor = Math.max(0, vendorCount - prevVendor);
    const newCustom = Math.max(0, customCount - prevCustom);

    const vendorPrice = x.vendor_gpu_price * (1 + x.vendor_gpu_price_growth) ** t;
    const module = customModuleCost(x, t);
    const customPowerW = x.custom_logic_power_w + module.hbm.powerW + x.host_network_power_w_per_device;

    buy.vendorGPUsInclHBM += newVendor * vendorPrice;
    buy.platformCapex += newVendor * x.platform_capex_per_device;
    buy.facilityCost += newVendor * x.facility_cost_per_deployed_device;
    buy.electricity += vendorCount * (vendorPowerW / 1000) * 8760 * x.pue * x.electricity_per_kwh;
    buy.powerCoolingInfrastructure += vendorCount * (vendorPowerW / 1000) * x.power_cooling_capacity_per_it_kw_year;
    buy.softwareSupport += vendorCount * x.vendor_software_support_per_gpu_year;

    build.logicSilicon += newCustom * module.logicEffective;
    build.hbm += newCustom * module.hbmEffective;
    build.packageInterposer += newCustom * module.packageEffective;
    build.boardVrmTest += newCustom * module.board;
    build.platformCapex += newCustom * x.platform_capex_per_device;
    build.facilityCost += newCustom * x.facility_cost_per_deployed_device;
    build.electricity += customCount * (customPowerW / 1000) * 8760 * x.pue * x.electricity_per_kwh;
    build.powerCoolingInfrastructure += customCount * (customPowerW / 1000) * x.power_cooling_capacity_per_it_kw_year;
    build.ongoingSoftware += x.ongoing_custom_software_per_year;

    yearly.push({
      year: t + 1,
      vendorCount,
      customCount,
      newVendor,
      newCustom,
      vendorPrice,
      vendorPowerW,
      customPowerW,
      customModuleCost: module.finishedModuleCost
    });

    prevVendor = vendorCount;
    prevCustom = customCount;
  }

  const sum = obj => Object.values(obj).reduce((a, b) => a + b, 0);
  const buyTCO = sum(buy);
  const buildTCO = sum(build);
  const buyCostTypes = {
    capex: buy.vendorGPUsInclHBM + buy.platformCapex + buy.facilityCost,
    opex: buy.electricity + buy.powerCoolingInfrastructure + buy.softwareSupport
  };
  const buildCostTypes = {
    capex: build.designNRE + build.initialSoftwareNRE + build.maskProcessNRE +
      build.logicSilicon + build.hbm + build.packageInterposer + build.boardVrmTest +
      build.platformCapex + build.facilityCost,
    opex: build.electricity + build.powerCoolingInfrastructure + build.ongoingSoftware
  };

  return {
    inputs: x,
    yearly,
    buy,
    build,
    buyTCO,
    buildTCO,
    buyCostTypes,
    buildCostTypes,
    buildAdvantage: buyTCO - buildTCO,
    decision: buyTCO >= buildTCO ? "BUILD" : "BUY",
    year1: {
      vendorHBM: vendorHbm,
      customHBM: customHBM(x, 0),
      silicon: siliconCost(x, 0),
      customModule: customModuleCost(x, 0),
      vendorPowerW,
      customPowerW: yearly[0].customPowerW
    }
  };
}

export function breakEvenFleet(raw, maxFleet = 2_000_000) {
  const lowResult = computeTCO(raw, 1).buildAdvantage;
  if (lowResult >= 0) return { type: "below", fleet: 1 };
  const highResult = computeTCO(raw, maxFleet).buildAdvantage;
  if (highResult < 0) return { type: "above", fleet: maxFleet };

  let low = 1;
  let high = maxFleet;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (computeTCO(raw, mid).buildAdvantage >= 0) high = mid;
    else low = mid;
  }
  return { type: "value", fleet: high };
}

export const SENSITIVITY_FIELDS = [
  ["custom_performance_ratio", "Custom performance"],
  ["fleet_year1", "Deployment volume"],
  ["demand_growth", "Demand growth"],
  ["vendor_gpu_price", "Vendor GPU price incl. HBM"],
  ["design_nre", "Design NRE"],
  ["initial_software_nre", "Initial software NRE"],
  ["mask_process_nre", "Mask/tooling NRE"],
  ["ongoing_custom_software_per_year", "Ongoing custom software"],
  ["hbm_price_per_gb", "Custom HBM $/GB"],
  ["custom_hbm_stacks", "Custom HBM stacks"],
  ["custom_gb_per_stack", "Custom HBM GB/stack"],
  ["custom_hbm_overhead", "Custom HBM overhead"],
  ["custom_logic_power_w", "Custom logic power"],
  ["vendor_logic_power_w", "Vendor GPU power"],
  ["hbm_power_w_per_stack", "HBM power/stack"],
  ["host_network_power_w_per_device", "Host/network power"],
  ["wafer_price", "Wafer price"],
  ["die_area_mm2", "Die area"],
  ["logic_yield", "Logic yield"],
  ["package_interposer_cost", "Package/interposer cost"],
  ["package_yield", "Package yield"],
  ["board_vrm_test_cost", "Board/VRM/test"],
  ["electricity_per_kwh", "Electricity price"],
  ["pue", "PUE"],
  ["platform_capex_per_device", "Platform CAPEX/device"],
  ["facility_cost_per_deployed_device", "Facility cost/deployed device"],
  ["power_cooling_capacity_per_it_kw_year", "Power & cooling infrastructure capacity"],
  ["vendor_software_support_per_gpu_year", "Vendor software/support"]
];

export function sensitivity(raw, fraction = 0.20) {
  const base = computeTCO(raw).buildAdvantage;
  return SENSITIVITY_FIELDS.map(([key, label]) => {
    // Yields are probabilities. A straight +20% perturbation can push a valid
    // input (such as the default 90% package yield) above 100%, causing the
    // whole sensitivity panel to fail validation instead of rendering.
    const upperBound = key === "logic_yield" || key === "package_yield" ? 100 : Infinity;
    const perturbedValue = Math.min(raw[key] * (1 + fraction), upperBound);
    const perturbed = { ...raw, [key]: perturbedValue };
    const advantage = computeTCO(perturbed).buildAdvantage;
    return { key, label, delta: advantage - base, advantage };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
