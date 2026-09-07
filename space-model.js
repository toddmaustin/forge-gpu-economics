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
  ["compute_duty_cycle", "Compute duty cycle"],
  ["radiator_thermal_radiation_kw_per_m2", "Radiator thermal radiation"],
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
  Object.keys(x).filter(key => typeof x[key] === "number").forEach(key => { x[key] = finite(x, key); });
  for (const key of ["fleet_year1", "horizon_years", "space_useful_performance_ratio", "space_hardware_lifetime_years",
    "solar_power_density_kw_per_m2", "solar_mass_kg_per_m2", "solar_pointing_efficiency", "compute_duty_cycle", "radiator_thermal_radiation_kw_per_m2",
    "radiator_view_factor", "battery_specific_energy_wh_per_kg", "weather_availability"]) {
    if (!(x[key] > 0)) throw new Error(`${key} must be positive.`);
  }
  for (const key of ["demand_growth", "solar_annual_degradation", "compute_duty_cycle", "solar_pointing_efficiency", "weather_availability"]) {
    if (x[key] > 1) throw new Error(`${key} must be no more than 100%.`);
  }
  return x;
}

export function computeSpaceTCO(raw) {
  const x = normalizeSpaceInputs(raw);
  const terrestrialResult = computeTCO(x);
  const terrestrial = { ...terrestrialResult.buy };
  const terrestrialTCO = terrestrialResult.buyTCO;
  const space = {
    computeHardware: 0, spacePlatform: 0, qualification: x.qualification_nre, launch: 0,
    solarArrays: 0, batteries: 0, thermal: 0, communications: x.ground_station_capex,
    missionOperations: 0, sparesServicing: 0, endOfLife: 0
  };
  const yearly = [];
  let priorRequired = 0;

  for (let t = 0; t < Math.max(1, Math.round(x.horizon_years)); t++) {
    const workloadGPUs = x.fleet_year1 * (1 + x.demand_growth) ** t;
    const effectiveFraction = x.space_useful_performance_ratio * x.compute_duty_cycle * x.weather_availability;
    const requiredGPUs = workloadGPUs * x.radiation_redundancy_factor / effectiveFraction;
    const growthUnits = Math.max(0, requiredGPUs - priorRequired);
    const replacementUnits = t === 0 ? 0 : priorRequired / x.space_hardware_lifetime_years;
    const newUnits = growthUnits + replacementUnits;
    const itPowerW = x.vendor_logic_power_w + x.vendor_hbm_stacks * x.hbm_power_w_per_stack + x.host_network_power_w_per_device;
    const transferPowerW = x.data_tb_per_gpu_day * x.data_transfer_kwh_per_tb * 1000 / 24;
    const averagePowerW = itPowerW * x.compute_duty_cycle + x.spacecraft_bus_power_w_per_gpu + transferPowerW;
    const solarOutputWPerM2 = x.solar_power_density_kw_per_m2 * 1000 * x.solar_pointing_efficiency *
      (1 - x.solar_annual_degradation) ** t;
    const solarAreaM2 = averagePowerW / solarOutputWPerM2;
    const solarMassKg = solarAreaM2 * x.solar_mass_kg_per_m2;
    const batteryEnergyWh = averagePowerW * x.eclipse_hours_per_day;
    const batteryMassKg = batteryEnergyWh / x.battery_specific_energy_wh_per_kg;
    const radiatorOutputWPerM2 = x.radiator_thermal_radiation_kw_per_m2 * 1000 * x.radiator_view_factor;
    const radiatorAreaM2 = itPowerW * x.compute_duty_cycle / radiatorOutputWPerM2;
    const radiatorMassKg = radiatorAreaM2 * x.radiator_mass_kg_per_m2;
    const totalITPowerW = requiredGPUs * itPowerW;
    const totalSolarPowerW = requiredGPUs * solarAreaM2 * solarOutputWPerM2;
    const totalSolarAreaKm2 = requiredGPUs * solarAreaM2 / 1e6;
    const totalHeatRadiationW = requiredGPUs * radiatorAreaM2 * radiatorOutputWPerM2;
    const totalRadiatorAreaKm2 = requiredGPUs * radiatorAreaM2 / 1e6;
    const dryMassKg = x.payload_mass_kg_per_gpu + x.bus_structure_mass_kg_per_gpu + x.shielding_mass_kg_per_gpu +
      x.propulsion_mass_kg_per_gpu + solarMassKg + batteryMassKg + radiatorMassKg;
    const gpuPrice = x.vendor_gpu_price * (1 + x.vendor_gpu_price_growth) ** t;
    const hardwareCost = newUnits * gpuPrice;
    const platformCost = newUnits * x.space_platform_cost_per_gpu;

    space.computeHardware += hardwareCost;
    space.spacePlatform += platformCost;
    space.launch += newUnits * dryMassKg * x.launch_cost_per_kg;
    space.solarArrays += newUnits * solarAreaM2 * x.solar_power_density_kw_per_m2 * 1000 * x.solar_array_cost_per_w;
    space.batteries += newUnits * batteryEnergyWh / 1000 * x.battery_cost_per_kwh;
    space.thermal += newUnits * radiatorAreaM2 * x.radiator_cost_per_m2;
    space.communications += newUnits * x.inter_node_link_cost_per_gpu + x.spectrum_licensing_per_year + x.ground_network_ops_per_year;
    space.missionOperations += x.mission_control_per_year + x.cybersecurity_per_year + x.telemetry_software_per_year + requiredGPUs * x.operations_per_spacecraft_year;
    space.sparesServicing += (hardwareCost + platformCost) * x.spares_servicing_percent / 100;
    space.endOfLife += newUnits * dryMassKg * x.end_of_life_cost_per_kg;
    yearly.push({
      year: t + 1, workloadGPUs, requiredGPUs, newUnits, replacementUnits, itPowerW, averagePowerW,
      solarAreaM2, solarMassKg, batteryMassKg, radiatorAreaM2, radiatorMassKg, dryMassKg,
      totalITPowerW, totalSolarPowerW, totalSolarAreaKm2, totalHeatRadiationW, totalRadiatorAreaKm2
    });
    priorRequired = requiredGPUs;
  }

  const spaceTCO = Object.values(space).reduce((sum, value) => sum + value, 0);
  const spaceCostTypes = {
    capex: space.computeHardware + space.spacePlatform + space.qualification + space.launch + space.solarArrays + space.batteries + space.thermal + x.ground_station_capex,
    opex: space.communications - x.ground_station_capex + space.missionOperations + space.sparesServicing + space.endOfLife
  };
  return {
    inputs: x, yearly, space, terrestrial, spaceTCO, terrestrialTCO, spaceCostTypes,
    terrestrialCostTypes: terrestrialResult.buyCostTypes,
    spaceAdvantage: terrestrialTCO - spaceTCO,
    decision: spaceTCO <= terrestrialTCO ? "SPACE-BASED" : "TERRESTRIAL"
  };
}

export function spaceSensitivity(raw, fraction = 0.20) {
  const base = computeSpaceTCO(raw).spaceAdvantage;
  return SPACE_SENSITIVITY_FIELDS.map(([key, label]) => {
    const upperBound = ["compute_duty_cycle", "weather_availability", "solar_annual_degradation"].includes(key) ? 1 : Infinity;
    const perturbed = { ...raw, [key]: Math.min(raw[key] * (1 + fraction), upperBound) };
    const advantage = computeSpaceTCO(perturbed).spaceAdvantage;
    return { key, label, advantage, delta: advantage - base };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
