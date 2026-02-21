const EPOCH = 1704067200000n;
const TIMESTAMP_SHIFT = 22n;

export function extractTimestamp(id: string): number {
  const snowflake = BigInt(id);
  return Number((snowflake >> TIMESTAMP_SHIFT) + EPOCH);
}
