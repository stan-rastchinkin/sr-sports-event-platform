export function omitNulls(value: unknown): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date
  ) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== null),
  );
}
