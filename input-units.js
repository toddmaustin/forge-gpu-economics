export const MILLION = 1_000_000;

export function usesMillions(value) {
  return Number.isInteger(value) && value !== 0 && value % MILLION === 0;
}

export function inputPresentation(defaultValue, step) {
  if (!usesMillions(defaultValue)) return { value: defaultValue, step, scale: 1, suffix: "" };
  return {
    value: defaultValue / MILLION,
    step: "any",
    scale: MILLION,
    suffix: " (millions)"
  };
}

export function valueFromInput(value, scale = 1) {
  return Number(value) * Number(scale);
}
