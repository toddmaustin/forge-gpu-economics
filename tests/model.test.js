import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { computeTCO, grossDiesPerWafer, breakEvenFleet, normalizeInputs, sensitivity } from "../model.js";
import { FORGE_MODELS, SPACE_MODEL_CONSIDERATIONS, getForgeModel } from "../forge-models.js";
import { computeSpaceTCO, normalizeSpaceInputs, spaceSensitivity } from "../space-model.js";
import { inputPresentation, usesMillions, valueFromInput } from "../input-units.js";

const defaults = JSON.parse(fs.readFileSync(new URL("../defaults.json", import.meta.url), "utf8"));
const spaceDefaults = JSON.parse(fs.readFileSync(new URL("../space-defaults.json", import.meta.url), "utf8"));

test("gross dies per wafer matches FORGE baseline", () => {
  const n = grossDiesPerWafer(300, 775);
  assert.ok(Math.abs(n - 67.278) < 0.02);
});

test("baseline TCO remains close to documented values", () => {
  const z = computeTCO(defaults);
  assert.ok(Math.abs(z.buyTCO - 4.8197e9) < 2e6);
  assert.ok(Math.abs(z.buildTCO - 2.4161e9) < 2e6);
  assert.equal(z.decision, "BUILD");
});

test("cost type totals split one-time CapEx from recurring OpEx", () => {
  const z = computeTCO(defaults);

  assert.equal(z.buyCostTypes.capex, z.buy.vendorGPUsInclHBM + z.buy.platformCapex + z.buy.facilityCost);
  assert.equal(z.buyCostTypes.opex, z.buy.electricity + z.buy.powerCoolingInfrastructure + z.buy.softwareSupport);
  assert.equal(z.buildCostTypes.capex, z.buildTCO - z.buildCostTypes.opex);
  assert.equal(z.buildCostTypes.opex, z.build.electricity + z.build.powerCoolingInfrastructure + z.build.ongoingSoftware);
  assert.ok(Math.abs(z.buyCostTypes.capex + z.buyCostTypes.opex - z.buyTCO) < 1e-6);
  assert.ok(Math.abs(z.buildCostTypes.capex + z.buildCostTypes.opex - z.buildTCO) < 1e-6);
});

test("custom fleet is normalized by performance ratio", () => {
  const z = computeTCO(defaults);
  assert.ok(Math.abs(z.yearly[0].customCount - defaults.fleet_year1 / defaults.custom_performance_ratio) < 1e-8);
});

test("facility cost is charged only on new deployments", () => {
  const z = computeTCO(defaults);
  const finalVendorFleet = z.yearly.at(-1).vendorCount;
  const finalCustomFleet = z.yearly.at(-1).customCount;
  assert.ok(Math.abs(z.buy.facilityCost - finalVendorFleet * defaults.facility_cost_per_deployed_device) < 1e-6);
  assert.ok(Math.abs(z.build.facilityCost - finalCustomFleet * defaults.facility_cost_per_deployed_device) < 1e-6);
});

test("break-even fleet returns a finite positive threshold", () => {
  const be = breakEvenFleet(defaults);
  assert.equal(be.type, "value");
  assert.ok(be.fleet > 0 && Number.isFinite(be.fleet));
});

test("sensitivity analysis renders valid finite perturbations", () => {
  const results = sensitivity(defaults);

  assert.equal(results.length, 28);
  assert.ok(results.every(({ delta, advantage }) => Number.isFinite(delta) && Number.isFinite(advantage)));
  assert.ok(results.some(({ key }) => key === "package_yield"));
});

test("yields are accepted as percentages from 0 to 100", () => {
  const normalized = normalizeInputs(defaults);
  assert.equal(normalized.logic_yield, 0.55);
  assert.equal(normalized.package_yield, 0.9);
  assert.throws(() => normalizeInputs({ ...defaults, package_yield: 101 }), /no more than 100/);
});

test("browser entry points cache-bust the current assets", () => {
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const ui = fs.readFileSync(new URL("../ui.js", import.meta.url), "utf8");

  assert.match(index, /styles\.css\?v=1\.5\.0/);
  assert.match(index, /ui\.js\?v=1\.5\.0/);
  assert.match(ui, /model\.js\?v=1\.5\.0/);
  assert.match(ui, /forge-models\.js\?v=1\.5\.0/);
  assert.match(ui, /input-units\.js\?v=1\.5\.0/);
  assert.match(ui, /space-model\.js\?v=1\.5\.0/);
  assert.match(ui, /\$\{file\}\?v=\$\{ASSET_VERSION\}/);
});

test("defaults ending in at least six zeros use editable millions", () => {
  assert.equal(usesMillions(6_000_000), true);
  assert.equal(usesMillions(6_825_000), false);
  assert.equal(usesMillions(0), false);
  assert.deepEqual(inputPresentation(6_000_000, 1_000_000), {
    value: 6,
    step: "any",
    scale: 1_000_000,
    suffix: " (millions)"
  });
  assert.equal(valueFromInput("6.825", 1_000_000), 6_825_000);
  assert.deepEqual(inputPresentation(35_000, 1_000), { value: 35_000, step: 1_000, scale: 1, suffix: "" });
});

test("model catalog exposes both comparisons and a useful space checklist", () => {
  assert.deepEqual(Object.keys(FORGE_MODELS), ["buy-build", "terrestrial-space"]);
  assert.equal(getForgeModel("unknown"), FORGE_MODELS["buy-build"]);
  assert.ok(SPACE_MODEL_CONSIDERATIONS.length >= 8);
  assert.ok(SPACE_MODEL_CONSIDERATIONS.some(item => /launch/i.test(item)));
  assert.ok(SPACE_MODEL_CONSIDERATIONS.some(item => /thermal/i.test(item)));
});


test("space model produces balanced, finite ledgers against Vendor IT", () => {
  const z = computeSpaceTCO(spaceDefaults);
  assert.ok(Number.isFinite(z.spaceTCO) && z.spaceTCO > 0);
  assert.ok(Number.isFinite(z.terrestrialTCO) && z.terrestrialTCO > 0);
  assert.ok(Math.abs(Object.values(z.space).reduce((a, b) => a + b, 0) - z.spaceTCO) < 1e-6);
  assert.ok(Math.abs(z.spaceCostTypes.capex + z.spaceCostTypes.opex - z.spaceTCO) < 1e-3);
  assert.equal(z.terrestrialTCO, computeTCO(spaceDefaults).buyTCO);
});

test("space defaults remain compatible with cached pre-1.4 solar models", () => {
  assert.ok(spaceDefaults.solar_specific_power_w_per_kg > 0);
  assert.equal(
    spaceDefaults.solar_specific_power_w_per_kg,
    spaceDefaults.solar_power_density_kw_per_m2 * 1000 / spaceDefaults.solar_mass_kg_per_m2
  );
});

test("space defaults remain compatible with cached pre-1.5 radiator models", () => {
  assert.equal(
    spaceDefaults.thermal_rejection_w_per_m2,
    spaceDefaults.radiator_thermal_radiation_kw_per_m2 * 1000
  );
});

test("space mass, availability, batteries, and launch costs respond to parameters", () => {
  const base = computeSpaceTCO(spaceDefaults);
  const eclipse = computeSpaceTCO({ ...spaceDefaults, eclipse_hours_per_day: 1 });
  assert.equal(base.yearly[0].batteryMassKg, 0);
  assert.ok(eclipse.yearly[0].batteryMassKg > 0);
  assert.ok(eclipse.space.batteries > 0);
  assert.ok(eclipse.space.launch > base.space.launch);
  assert.ok(base.yearly[0].requiredGPUs > base.yearly[0].workloadGPUs);
  const year = base.yearly[0];
  assert.equal(year.totalITPowerW, year.requiredGPUs * year.itPowerW * spaceDefaults.compute_duty_cycle);
  assert.ok(Math.abs(year.totalSolarPowerW - year.requiredGPUs * year.averagePowerW) < 1e-6);
  assert.equal(year.totalSolarAreaKm2, year.requiredGPUs * year.solarAreaM2 / 1e6);
  assert.ok(Math.abs(year.totalHeatRadiationW - year.requiredGPUs * year.itPowerW * spaceDefaults.compute_duty_cycle) < 1e-6);
  assert.equal(year.totalRadiatorAreaKm2, year.requiredGPUs * year.radiatorAreaM2 / 1e6);
  assert.equal(base.yearly[0].solarMassKg, base.yearly[0].solarAreaM2 * spaceDefaults.solar_mass_kg_per_m2);
  const heavierSolar = computeSpaceTCO({ ...spaceDefaults, solar_mass_kg_per_m2: 4 });
  assert.equal(heavierSolar.yearly[0].solarAreaM2, base.yearly[0].solarAreaM2);
  assert.ok(heavierSolar.yearly[0].solarMassKg > base.yearly[0].solarMassKg);
  assert.ok(heavierSolar.space.launch > base.space.launch);
  const heavierRadiator = computeSpaceTCO({ ...spaceDefaults, radiator_mass_kg_per_m2: 14 });
  assert.equal(heavierRadiator.yearly[0].radiatorAreaM2, base.yearly[0].radiatorAreaM2);
  assert.ok(heavierRadiator.yearly[0].radiatorMassKg > base.yearly[0].radiatorMassKg);
  assert.ok(heavierRadiator.space.launch > base.space.launch);
});

test("space input validation and sensitivity are usable", () => {
  assert.throws(() => normalizeSpaceInputs({ ...spaceDefaults, weather_availability: 1.1 }), /no more than 100%/);
  const results = spaceSensitivity(spaceDefaults);
  assert.equal(results.length, 15);
  assert.ok(results.every(result => Number.isFinite(result.delta)));
});
