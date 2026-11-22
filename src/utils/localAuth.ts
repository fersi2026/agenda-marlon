const LOCAL_AUTH_STORAGE_KEY = 'agenda_psicologia_local_auth_v1';
const PBKDF2_ITERATIONS = 100000;

export interface LocalAuthRecord {
  loginNormalized: string;
  loginDisplay: string;
  saltHex: string;
  hashHex: string;
  iterations: number;
  createdAt: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBuffer = new Uint8Array(salt).buffer;
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export function getLocalAuthRecord(): LocalAuthRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.loginNormalized === 'string' &&
      typeof parsed.saltHex === 'string' &&
      typeof parsed.hashHex === 'string'
    ) {
      return parsed as LocalAuthRecord;
    }
  } catch {
    // Ignora registro corrompido
  }
  return null;
}

export function hasLocalAuthConfigured(): boolean {
  return getLocalAuthRecord() !== null;
}

export async function setupLocalAuthCredentials(
  login: string,
  password: string
): Promise<LocalAuthRecord> {
  const loginDisplay = login.trim();
  const loginNormalized = loginDisplay.toLowerCase();

  if (loginNormalized.length < 3) {
    throw new Error('O login deve ter pelo menos 3 caracteres.');
  }
  if (password.length < 6) {
    throw new Error('A senha deve ter no mínimo 6 caracteres.');
  }

  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  const hashHex = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);

  const record: LocalAuthRecord = {
    loginNormalized,
    loginDisplay,
    saltHex: bytesToHex(salt),
    hashHex,
    iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function verifyLocalAuthCredentials(
  login: string,
  password: string
): Promise<LocalAuthRecord | null> {
  const record = getLocalAuthRecord();
  if (!record) return null;

  const loginNormalized = login.trim().toLowerCase();
  if (!constantTimeEqual(loginNormalized, record.loginNormalized)) {
    return null;
  }

  const salt = hexToBytes(record.saltHex);
  const candidateHash = await derivePasswordHash(
    password,
    salt,
    record.iterations || PBKDF2_ITERATIONS
  );

  if (!constantTimeEqual(candidateHash, record.hashHex)) {
    return null;
  }

  return record;
}

export async function updateLocalPassword(
  currentPassword: string,
  newPassword: string
): Promise<LocalAuthRecord> {
  const record = getLocalAuthRecord();
  if (!record) {
    throw new Error('Nenhuma credencial local configurada.');
  }
  const verified = await verifyLocalAuthCredentials(record.loginDisplay, currentPassword);
  if (!verified) {
    throw new Error('A senha atual está incorreta.');
  }
  return setupLocalAuthCredentials(record.loginDisplay, newPassword);
}

export function clearLocalAuthCredentials(): void {
  localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
}
