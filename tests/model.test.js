import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { computeTCO, grossDiesPerWafer, breakEvenFleet, normalizeInputs, sensitivity } from "../model.js";

const defaults = JSON.parse(fs.readFileSync(new URL("../defaults.json", import.meta.url), "utf8"));

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
