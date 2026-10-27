// Cifrado en el navegador (Web Crypto): PBKDF2-SHA256 → HKDF → AES-GCM-256.
// La contraseña nunca se guarda: solo un "verificador" derivado de ella.
const enc = new TextEncoder();
const dec = new TextDecoder();

export function aB64(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
export function deB64(b64) {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function nuevaSalt() {
  return aB64(crypto.getRandomValues(new Uint8Array(16)));
}

/** Clave maestra (material HKDF) a partir de la contraseña. */
export async function derivarMaestra(password, saltB64, iteraciones) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: deB64(saltB64), iterations: iteraciones, hash: 'SHA-256' }, base, 256);
  return crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

const hkdf = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) });

export async function verificador(maestra) {
  return aB64(await crypto.subtle.deriveBits(hkdf('verificador'), maestra, 256));
}

export function claveAES(maestra, info) {
  return crypto.subtle.deriveKey(hkdf(info), maestra, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(clave, texto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, enc.encode(texto));
  return { iv: aB64(iv), data: aB64(data) };
}

export async function descifrar(clave, sobre) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, clave, deB64(sobre.data));
  return dec.decode(pt);
}

/**
 * Valida la contraseña contra la configuración. Si es correcta devuelve
 * las claves de sesión y el token de GitHub descifrado (si está configurado).
 */
export async function abrirSesion(password, config) {
  const seg = config.seguridad;
  const maestra = await derivarMaestra(password, seg.salt, seg.iteraciones);
  if ((await verificador(maestra)) !== seg.verificador) return null;
  const claveHistorial = await claveAES(maestra, 'historial');
  let token = null;
  if (config.tokenCifrado) {
    try { token = await descifrar(await claveAES(maestra, 'token'), config.tokenCifrado); } catch { token = null; }
  }
  return { maestra, claveHistorial, token };
}
