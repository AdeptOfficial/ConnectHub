// Snowflake ID generator
// Format: timestamp (42 bits) | worker (5 bits) | sequence (17 bits)
// Epoch: 2024-01-01T00:00:00.000Z

const EPOCH = 1704067200000n; // 2024-01-01
const WORKER_BITS = 5n;
const SEQUENCE_BITS = 17n;
const WORKER_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS;
const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n;

let lastTimestamp = 0n;
let sequence = 0n;
const workerId = 0n; // single-node for MVP

export function generateId(): string {
  let now = BigInt(Date.now()) - EPOCH;

  if (now === lastTimestamp) {
    sequence = (sequence + 1n) & SEQUENCE_MASK;
    if (sequence === 0n) {
      // Sequence exhausted, wait for next millisecond
      while (now <= lastTimestamp) {
        now = BigInt(Date.now()) - EPOCH;
      }
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = now;

  const id = (now << TIMESTAMP_SHIFT) | (workerId << WORKER_SHIFT) | sequence;
  return id.toString();
}

export function extractTimestamp(id: string): number {
  const snowflake = BigInt(id);
  const timestamp = (snowflake >> TIMESTAMP_SHIFT) + EPOCH;
  return Number(timestamp);
}
