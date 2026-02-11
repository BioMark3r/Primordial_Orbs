const PIN_PATTERN = /^\d{4,8}$/;
const DEFAULT_ITERATIONS = 100_000;

function ensureValidPin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("PIN must be 4-8 digits.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveHash(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPin(pin: string): Promise<string> {
  ensureValidPin(pin);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(pin, salt, DEFAULT_ITERATIONS);
  return `v1:${String(DEFAULT_ITERATIONS)}:${bytesToBase64(salt)}:${bytesToBase64(hash)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  ensureValidPin(pin);
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    return false;
  }
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  const salt = base64ToBytes(parts[2]);
  const expected = base64ToBytes(parts[3]);
  const actual = await deriveHash(pin, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

export function isPinFormatValid(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}
