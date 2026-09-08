/* FORGE model catalog.
 *
 * Each comparison configures labels and guidance around the same calculator.
 * Shared IT, accelerator, and data-center inputs deliberately remain in ui.js
 * and model.js so adding a comparison cannot fork common economics.
 */

export const SPACE_MODEL_CONSIDERATIONS = Object.freeze([
  "Launch: provider, vehicle class, rideshare versus dedicated launch, insurance, schedule risk, and replenishment cadence.",
  "Orbital architecture: altitude and inclination, constellation size, station keeping, collision avoidance, radiation exposure, and end-of-life disposal.",
  "Power: solar-array and battery sizing at continuous peak compute, eclipse duty cycle, degradation, and pointing constraints.",
  "Thermal: radiator area and mass, view factors, operating temperature, deployable structures, and the absence of convective cooling.",
  "Compute hardware: radiation tolerance, shielding, fault recovery, useful performance, mass, volume, qualification, and replacement lifetime.",
  "Communications: ground-station and optical-link CapEx, spectrum and licensing, bandwidth, latency, weather availability, and data-transfer energy.",
  "Operations: mission control, cybersecurity, autonomous maintenance, spares, on-orbit servicing, telemetry, and staffing.",
  "Terrestrial baseline: land, grid interconnect, electricity, water, cooling plant, network backhaul, construction, taxes, and local incentives.",
  "Financial and policy assumptions: development NRE, financing, launch and hardware learning curves, utilization, revenue downtime, regulation, liability, and decommissioning."
]);

export const FORGE_MODELS = Object.freeze({
  "buy-build": Object.freeze({
    id: "buy-build",
    shortName: "Buy vs. build",
    title: "Buy vendor GPUs vs. build custom accelerators",
    description: "Compare vendor GPU acquisition with a custom accelerator program.",
    left: "BUILD",
    right: "BUY"
  }),
  "terrestrial-space": Object.freeze({
    id: "terrestrial-space",
    shortName: "Terrestrial vs. space-based",
    title: "Terrestrial vs. space-based data centers",
    description: "Compare Vendor IT with a first-order orbital TCO architecture sized for continuous peak compute.",
    left: "SPACE-BASED",
    right: "TERRESTRIAL",
    considerations: SPACE_MODEL_CONSIDERATIONS,
    defaultsFile: "space-defaults.json"
  })
});

export const DEFAULT_MODEL_ID = "buy-build";

export function getForgeModel(id) {
  return FORGE_MODELS[id] || FORGE_MODELS[DEFAULT_MODEL_ID];
}
