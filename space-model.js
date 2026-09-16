/* First-order orbital data-center TCO model. Pure model code; no DOM dependencies. */

import { computeTCO } from "./model.js";

export const SPACE_SENSITIVITY_FIELDS = [
  ["launch_cost_per_kg", "Launch cost / kg"],
  ["payload_mass_kg_per_gpu", "Compute payload mass"],
  ["space_useful_performance_ratio", "Space useful performance"],
  ["radiation_redundancy_factor", "Radiation redundancy"],
  ["space_hardware_lifetime_years", "Hardware lifetime"],
  ["solar_power_density_kw_per_m2", "Solar power density"],
  ["solar_mass_kg_per_m2", "Solar areal mass"],
  ["solar_annual_degradation", "Solar degradation"],
  ["device_coolant_temperature_c", "Device coolant temperature"],
  ["heat_pump_efficiency", "Heat-pump efficiency"],
  ["heat_pump_cost_per_kw_cooling", "Heat-pump cost"],
  ["heat_pump_mass_kg_per_kw_cooling", "Heat-pump mass"],
  ["radiator_mass_kg_per_m2", "Radiator mass"],
  ["weather_availability", "Link weather availability"],
  ["data_tb_per_gpu_day", "Daily data volume"],
  ["mission_control_per_year", "Mission control"],
  ["spares_servicing_percent", "Spares and servicing"]
];

const finite = (x, key) => {
  const value = Number(x[key]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number.`);
  return value;
};

export function normalizeSpaceInputs(raw) {
  const x = { ...raw };
  // Compatibility for pre-1.6 scenarios: only the product affected radiator area.
  if (x.radiator_radiation_efficiency == null && x.radiator_emissivity != null && x.radiator_view_factor != null) {
    x.radiator_radiation_efficiency = Number(x.radiator_emissivity) * Number(x.radiator_view_factor);
  }
  Object.keys(x).filter(key => typeof x[key] === "number").forEach(key => { x[key] = finite(x, key); });
  for (const key of ["fleet_year1", "horizon_years", "space_useful_performance_ratio", "space_hardware_lifetime_years",
    "solar_power_density_kw_per_m2", "solar_mass_kg_per_m2", "solar_pointing_efficiency", "radiator_radiation_efficiency",
    "battery_specific_energy_wh_per_kg", "weather_availability", "heat_pump_efficiency"]) {
    if (!(x[key] > 0)) throw new Error(`${key} must be positive.`);
  }
  for (const key of ["demand_growth", "solar_annual_degradation", "solar_pointing_efficiency", "weather_availability"]) {
    if (x[key] > 1) throw new Error(`${key} must be no more than 100%.`);
  }
  if (x.eclipse_hours_per_day >= 24) throw new Error("eclipse_hours_per_day must be less than 24 hours.");
  if (!["direct", "heat_pump", "auto"].includes(x.cooling_strategy)) throw new Error("cooling_strategy must be direct, heat_pump, or auto.");
  if (x.heat_pump_efficiency > 1) throw new Error("heat_pump_efficiency must be no more than 1.0.");
  if (x.radiator_radiation_efficiency > 1) throw new Error("radiator_radiation_efficiency must be no more than 1.0.");
  return x;
}

const STEFAN_BOLTZMANN = 5.670374419e-8;

/** Optimize physical panel area and compressor power for one cooling strategy. */
export function optimizeCooling(raw, tcoForCandidate = () => 0) {
  const x = normalizeSpaceInputs(raw);
  const qColdW = x.vendor_logic_power_w + x.vendor_hbm_stacks * x.hbm_power_w_per_stack + x.host_network_power_w_per_device;
  const candidate = (strategy, radiatorTemperatureC) => {
    let compressorPowerW = 0;
    let cop = null;
    if (strategy === "heat_pump") {
      const coldK = x.device_coolant_temperature_c + 273.15 - x.heat_exchanger_cold_approach_k;
      const hotK = radiatorTemperatureC + 273.15 + x.heat_exchanger_hot_approach_k;
      if (hotK <= coldK) return null;
      cop = x.heat_pump_efficiency * coldK / (hotK - coldK);
      compressorPowerW = qColdW / cop;
    }
    const rejectedHeatW = qColdW + compressorPowerW;
    // Physical edge-on panel area; both unobstructed emitting faces radiate.
    const radiatorAreaM2 = rejectedHeatW / (2 * x.radiator_radiation_efficiency *
      STEFAN_BOLTZMANN * (radiatorTemperatureC + 273.15) ** 4);
    const result = { strategy, radiatorTemperatureC, qColdW, cop, compressorPowerW, rejectedHeatW, radiatorAreaM2 };
    result.tco = tcoForCandidate(result);
    return result;
  };

  const direct = candidate("direct", x.device_coolant_temperature_c - x.direct_cooling_approach_k);
  const heatPump = [];
  const firstHeatPumpTemperature = Math.floor(x.device_coolant_temperature_c) + 1;
  for (let temperature = firstHeatPumpTemperature; temperature <= x.radiator_max_temperature_c; temperature += 1) {
    const result = candidate("heat_pump", temperature);
    if (result) heatPump.push(result);
  }
  const bestHeatPump = heatPump.reduce((best, item) => !best || item.tco < best.tco ? item : best, null);
  const selected = x.cooling_strategy === "direct" ? direct
    : x.cooling_strategy === "heat_pump" ? bestHeatPump
      : !bestHeatPump || direct.tco <= bestHeatPump.tco ? direct : bestHeatPump;
  if (!selected) throw new Error("No feasible heat-pump radiator temperature is available.");
  return { selected, direct, bestHeatPump, candidates: [direct, ...heatPump] };
}

export function computeSpaceTCO(raw) {
  const x = normalizeSpaceInputs(raw);
  const terrestrialResult = computeTCO(x);
  const terrestrial = { ...terrestrialResult.buy };
  const terrestrialTCO = terrestrialResult.buyTCO;
  const H = Math.max(1, Math.round(x.horizon_years));
  const itPowerW = x.vendor_logic_power_w + x.vendor_hbm_stacks * x.hbm_power_w_per_stack + x.host_network_power_w_per_device;
  const transferPowerW = x.data_tb_per_gpu_day * x.data_transfer_kwh_per_tb * 1000 / 24;

  const candidateTCO = thermal => {
    let incremental = 0;
    let priorRequired = 0;
    for (let t = 0; t < H; t++) {
      const workloadGPUs = x.fleet_year1 * (1 + x.demand_growth) ** t;
      const requiredGPUs = workloadGPUs * x.radiation_redundancy_factor /
        (x.space_useful_performance_ratio * x.weather_availability);
      const newUnits = Math.max(0, requiredGPUs - priorRequired) + (t === 0 ? 0 : priorRequired / x.space_hardware_lifetime_years);
      const averagePowerW = itPowerW + thermal.compressorPowerW + x.spacecraft_bus_power_w_per_gpu + transferPowerW;
      const sunlightFraction = (24 - x.eclipse_hours_per_day) / 24;
      const solarOutputWPerM2 = x.solar_power_density_kw_per_m2 * 1000 * x.solar_pointing_efficiency * (1 - x.solar_annual_degradation) ** t;
      const solarAreaM2 = averagePowerW / sunlightFraction / solarOutputWPerM2;
      const batteryEnergyWh = averagePowerW * x.eclipse_hours_per_day;
      const hpMassKg = thermal.strategy === "heat_pump" ? x.heat_pump_mass_kg_per_kw_cooling * thermal.qColdW / 1000 : 0;
      const hpCost = thermal.strategy === "heat_pump" ? x.heat_pump_cost_per_kw_cooling * thermal.qColdW / 1000 : 0;
      const thermalMassKg = thermal.radiatorAreaM2 * x.radiator_mass_kg_per_m2 + hpMassKg;
      incremental += newUnits * (solarAreaM2 * x.solar_power_density_kw_per_m2 * 1000 * x.solar_array_cost_per_w +
        batteryEnergyWh / 1000 * x.battery_cost_per_kwh + thermal.radiatorAreaM2 * x.radiator_cost_per_m2 + hpCost +
        thermalMassKg * (x.launch_cost_per_kg + x.end_of_life_cost_per_kg));
      priorRequired = requiredGPUs;
    }
    return incremental;
  };
  const cooling = optimizeCooling(x, candidateTCO);
  const selectedCooling = cooling.selected;
  const space = {
    computeHardware: 0, spacePlatform: 0, qualification: x.qualification_nre, launch: 0,
    solarArrays: 0, batteries: 0, thermal: 0, communications: x.ground_station_capex,
    missionOperations: 0, sparesServicing: 0, endOfLife: 0
  };
  const yearly = [];
  let priorRequired = 0;

  for (let t = 0; t < H; t++) {
    const workloadGPUs = x.fleet_year1 * (1 + x.demand_growth) ** t;
    const effectiveFraction = x.space_useful_performance_ratio * x.weather_availability;
    const requiredGPUs = workloadGPUs * x.radiation_redundancy_factor / effectiveFraction;
    const growthUnits = Math.max(0, requiredGPUs - priorRequired);
    const replacementUnits = t === 0 ? 0 : priorRequired / x.space_hardware_lifetime_years;
    const newUnits = growthUnits + replacementUnits;
    const averagePowerW = itPowerW + selectedCooling.compressorPowerW + x.spacecraft_bus_power_w_per_gpu + transferPowerW;
    const solarOutputWPerM2 = x.solar_power_density_kw_per_m2 * 1000 * x.solar_pointing_efficiency *
      (1 - x.solar_annual_degradation) ** t;
    const sunlightFraction = (24 - x.eclipse_hours_per_day) / 24;
    const requiredSunlightPowerW = averagePowerW / sunlightFraction;
    const solarAreaM2 = requiredSunlightPowerW / solarOutputWPerM2;
    const solarMassKg = solarAreaM2 * x.solar_mass_kg_per_m2;
    const batteryEnergyWh = averagePowerW * x.eclipse_hours_per_day;
    const batteryMassKg = batteryEnergyWh / x.battery_specific_energy_wh_per_kg;
    const radiatorAreaM2 = selectedCooling.radiatorAreaM2;
    const radiatorOutputWPerM2 = selectedCooling.rejectedHeatW / radiatorAreaM2;
    const radiatorMassKg = radiatorAreaM2 * x.radiator_mass_kg_per_m2;
    const heatPumpMassKg = selectedCooling.strategy === "heat_pump" ? x.heat_pump_mass_kg_per_kw_cooling * selectedCooling.qColdW / 1000 : 0;
    const totalITPowerW = requiredGPUs * itPowerW;
    const totalSolarPowerW = requiredGPUs * solarAreaM2 * solarOutputWPerM2;
    const totalSolarAreaKm2 = requiredGPUs * solarAreaM2 / 1e6;
    const totalHeatRadiationW = requiredGPUs * selectedCooling.rejectedHeatW;
    const totalRadiatorAreaKm2 = requiredGPUs * radiatorAreaM2 / 1e6;
    const dryMassKg = x.payload_mass_kg_per_gpu + x.bus_structure_mass_kg_per_gpu + x.shielding_mass_kg_per_gpu +
      x.propulsion_mass_kg_per_gpu + solarMassKg + batteryMassKg + radiatorMassKg + heatPumpMassKg;
    const totalLaunchMassKg = requiredGPUs * dryMassKg;
    const gpuPrice = x.vendor_gpu_price * (1 + x.vendor_gpu_price_growth) ** t;
    const hardwareCost = newUnits * gpuPrice;
    const platformCost = newUnits * x.space_platform_cost_per_gpu;

    space.computeHardware += hardwareCost;
    space.spacePlatform += platformCost;
    space.launch += newUnits * dryMassKg * x.launch_cost_per_kg;
    space.solarArrays += newUnits * solarAreaM2 * x.solar_power_density_kw_per_m2 * 1000 * x.solar_array_cost_per_w;
    space.batteries += newUnits * batteryEnergyWh / 1000 * x.battery_cost_per_kwh;
    const heatPumpCost = selectedCooling.strategy === "heat_pump" ? x.heat_pump_cost_per_kw_cooling * selectedCooling.qColdW / 1000 : 0;
    space.thermal += newUnits * (radiatorAreaM2 * x.radiator_cost_per_m2 + heatPumpCost);
    space.communications += newUnits * x.inter_node_link_cost_per_gpu + x.spectrum_licensing_per_year + x.ground_network_ops_per_year;
    space.missionOperations += x.mission_control_per_year + x.cybersecurity_per_year + x.telemetry_software_per_year + requiredGPUs * x.operations_per_spacecraft_year;
    space.sparesServicing += (hardwareCost + platformCost) * x.spares_servicing_percent / 100;
    space.endOfLife += newUnits * dryMassKg * x.end_of_life_cost_per_kg;
    yearly.push({
      year: t + 1, workloadGPUs, requiredGPUs, newUnits, replacementUnits, itPowerW, averagePowerW,
      sunlightFraction, requiredSunlightPowerW, solarAreaM2, solarMassKg, batteryMassKg, radiatorAreaM2, radiatorMassKg, heatPumpMassKg, dryMassKg,
      totalLaunchMassKg, totalITPowerW, totalSolarPowerW, totalSolarAreaKm2, totalHeatRadiationW, totalRadiatorAreaKm2
    });
    priorRequired = requiredGPUs;
  }

  const spaceTCO = Object.values(space).reduce((sum, value) => sum + value, 0);
  const spaceCostTypes = {
    capex: space.computeHardware + space.spacePlatform + space.qualification + space.launch + space.solarArrays + space.batteries + space.thermal + x.ground_station_capex,
    opex: space.communications - x.ground_station_capex + space.missionOperations + space.sparesServicing + space.endOfLife
  };
  return {
    inputs: x, yearly, space, terrestrial, spaceTCO, terrestrialTCO, spaceCostTypes, cooling: {
      ...selectedCooling,
      directTCO: spaceTCO + cooling.direct.tco - selectedCooling.tco,
      tcoSavingsVsDirect: cooling.direct.tco - selectedCooling.tco,
      bestHeatPump: cooling.bestHeatPump
    },
    terrestrialCostTypes: terrestrialResult.buyCostTypes,
    spaceAdvantage: terrestrialTCO - spaceTCO,
    decision: spaceTCO <= terrestrialTCO ? "SPACE-BASED" : "TERRESTRIAL"
  };
}

export function spaceSensitivity(raw, fraction = 0.20) {
  const base = computeSpaceTCO(raw).spaceAdvantage;
  return SPACE_SENSITIVITY_FIELDS.map(([key, label]) => {
    const upperBound = ["weather_availability", "solar_annual_degradation"].includes(key) ? 1 : Infinity;
    const perturbed = { ...raw, [key]: Math.min(raw[key] * (1 + fraction), upperBound) };
    const advantage = computeSpaceTCO(perturbed).spaceAdvantage;
    return { key, label, advantage, delta: advantage - base };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
