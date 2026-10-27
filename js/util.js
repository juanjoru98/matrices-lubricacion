// Utilidades generales
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function sinAcentos(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clave normalizada: minúsculas, sin acentos, guiones. */
export function clave(s) {
  return sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function vacio(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

export function esNA(v) {
  return /^n\/?a$/i.test(String(v ?? '').trim());
}

export function clonar(o) {
  return JSON.parse(JSON.stringify(o));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2024-01-08" → "08 ene 2024" (sin desfase de zona horaria). */
export function fechaCorta(v) {
  if (vacio(v)) return '';
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let d;
  if (m && s.length === 10) d = new Date(+m[1], +m[2] - 1, +m[3]);
  else d = new Date(s);
  if (isNaN(d)) return s;
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function fechaHora(v) {
  if (vacio(v)) return '';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const h = d.getHours(), mi = String(d.getMinutes()).padStart(2, '0');
  const h12 = ((h + 11) % 12) + 1;
  return `${fechaCorta(v)}, ${h12}:${mi} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Fecha y hora local con desfase, p. ej. 2026-10-26T16:47:00-05:00 */
export function ahoraISO() {
  const d = new Date();
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

export function hoyISO() {
  return ahoraISO().slice(0, 10);
}

export function blobABase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

function cargarImagen(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('No se pudo leer la imagen'));
    im.src = src;
  });
}

/** Reduce y comprime una foto para guardarla en el repositorio (JPEG, fondo blanco). */
export async function procesarImagen(file, { maxLado = 1800, calidad = 0.86 } = {}) {
  if (!file || !/^image\//.test(file.type)) throw new Error('El archivo seleccionado no es una imagen');
  const url = URL.createObjectURL(file);
  try {
    const im = await cargarImagen(url);
    const k = Math.min(1, maxLado / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, 0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', calidad));
    return { blob, base64: await blobABase64(blob), url: URL.createObjectURL(blob), ancho: w, alto: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function nombreArchivo(s) {
  return sinAcentos(s).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'archivo';
}

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
