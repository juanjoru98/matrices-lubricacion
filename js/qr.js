// Generador de códigos QR (modo byte, versiones 1–40, niveles L/M/Q/H).
// Basado en el algoritmo de referencia de Project Nayuki (licencia MIT).

const ECC_POR_BLOQUE = [
  // L
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // M
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // Q
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // H
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOQUES = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];
const NIVELES = { L: { ord: 0, bits: 1 }, M: { ord: 1, bits: 0 }, Q: { ord: 2, bits: 3 }, H: { ord: 3, bits: 2 } };

function bit(x, i) { return ((x >>> i) & 1) !== 0; }

function modulosCrudos(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
function palabrasDatos(ver, ecl) {
  return Math.floor(modulosCrudos(ver) / 8) - ECC_POR_BLOQUE[ecl.ord][ver] * NUM_BLOQUES[ecl.ord][ver];
}
function multGF(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function divisorRS(grado) {
  const r = new Array(grado).fill(0);
  r[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = multGF(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = multGF(raiz, 0x02);
  }
  return r;
}
function restoRS(datos, divisor) {
  const r = divisor.map(() => 0);
  for (const b of datos) {
    const f = b ^ r.shift();
    r.push(0);
    divisor.forEach((c, i) => { r[i] ^= multGF(c, f); });
  }
  return r;
}

class Matriz {
  constructor(ver, ecl, palabras) {
    this.ver = ver; this.ecl = ecl;
    this.n = ver * 4 + 17;
    this.m = Array.from({ length: this.n }, () => new Array(this.n).fill(false));
    this.f = Array.from({ length: this.n }, () => new Array(this.n).fill(false));
    this.patronesFuncion();
    this.dibujarPalabras(this.entrelazar(palabras));
    let mejor = 0, minPen = Infinity;
    for (let k = 0; k < 8; k++) {
      this.aplicarMascara(k);
      this.formato(k);
      const p = this.penalizacion();
      if (p < minPen) { mejor = k; minPen = p; }
      this.aplicarMascara(k);
    }
    this.aplicarMascara(mejor);
    this.formato(mejor);
    this.f = null;
  }
  set(x, y, v) { this.m[y][x] = v; this.f[y][x] = true; }
  patronesFuncion() {
    const n = this.n;
    for (let i = 0; i < n; i++) { this.set(6, i, i % 2 === 0); this.set(i, 6, i % 2 === 0); }
    this.buscador(3, 3); this.buscador(n - 4, 3); this.buscador(3, n - 4);
    const pos = this.posAlineacion(), c = pos.length;
    for (let i = 0; i < c; i++) for (let j = 0; j < c; j++) {
      if (!((i === 0 && j === 0) || (i === 0 && j === c - 1) || (i === c - 1 && j === 0))) this.alineacion(pos[i], pos[j]);
    }
    this.formato(0);
    this.version();
  }
  posAlineacion() {
    if (this.ver === 1) return [];
    const num = Math.floor(this.ver / 7) + 2;
    const paso = this.ver === 32 ? 26 : Math.ceil((this.ver * 4 + 4) / (num * 2 - 2)) * 2;
    const r = [6];
    for (let p = this.n - 7; r.length < num; p -= paso) r.splice(1, 0, p);
    return r;
  }
  buscador(x, y) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < this.n && yy >= 0 && yy < this.n) this.set(xx, yy, d !== 2 && d !== 4);
    }
  }
  alineacion(x, y) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  formato(mask) {
    const d = (this.ecl.bits << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, n = this.n;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(b, i));
    this.set(8, 7, bit(b, 6)); this.set(8, 8, bit(b, 7)); this.set(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) this.set(n - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) this.set(8, n - 15 + i, bit(b, i));
    this.set(8, n - 8, true);
  }
  version() {
    if (this.ver < 7) return;
    let r = this.ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (this.ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const v = bit(b, i), a = this.n - 11 + (i % 3), c = Math.floor(i / 3);
      this.set(a, c, v); this.set(c, a, v);
    }
  }
  entrelazar(datos) {
    const ver = this.ver, e = this.ecl.ord;
    const nb = NUM_BLOQUES[e][ver], eccLen = ECC_POR_BLOQUE[e][ver];
    const crudas = Math.floor(modulosCrudos(ver) / 8);
    const cortos = nb - (crudas % nb), largoCorto = Math.floor(crudas / nb);
    const div = divisorRS(eccLen), bloques = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = datos.slice(k, k + largoCorto - eccLen + (i < cortos ? 0 : 1));
      k += d.length;
      const ecc = restoRS(d, div);
      if (i < cortos) d.push(0);
      bloques.push(d.concat(ecc));
    }
    const r = [];
    for (let i = 0; i < bloques[0].length; i++) bloques.forEach((b, j) => {
      if (i !== largoCorto - eccLen || j >= cortos) r.push(b[i]);
    });
    return r;
  }
  dibujarPalabras(d) {
    let i = 0;
    const n = this.n;
    for (let der = n - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
        const x = der - j, arriba = ((der + 1) & 2) === 0, y = arriba ? n - 1 - v : v;
        if (!this.f[y][x] && i < d.length * 8) { this.m[y][x] = bit(d[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
  }
  aplicarMascara(k) {
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) {
      let inv;
      switch (k) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = (x * y) % 2 + (x * y) % 3 === 0; break;
        case 6: inv = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
        default: inv = ((x + y) % 2 + (x * y) % 3) % 2 === 0;
      }
      if (!this.f[y][x] && inv) this.m[y][x] = !this.m[y][x];
    }
  }
  penalizacion() {
    const n = this.n, m = this.m;
    let r = 0;
    const agregar = (len, h) => { if (h[0] === 0) len += n; h.pop(); h.unshift(len); };
    const contar = (h) => {
      const c = h[1], nucleo = c > 0 && h[2] === c && h[3] === c * 3 && h[4] === c && h[5] === c;
      return (nucleo && h[0] >= c * 4 && h[6] >= c ? 1 : 0) + (nucleo && h[6] >= c * 4 && h[0] >= c ? 1 : 0);
    };
    const terminar = (color, len, h) => { if (color) { agregar(len, h); len = 0; } len += n; agregar(len, h); return contar(h); };
    for (let eje = 0; eje < 2; eje++) {
      for (let a = 0; a < n; a++) {
        let color = false, run = 0;
        const h = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < n; b++) {
          const v = eje === 0 ? m[a][b] : m[b][a];
          if (v === color) { run++; if (run === 5) r += 3; else if (run > 5) r++; }
          else { agregar(run, h); if (!color) r += contar(h) * 40; color = v; run = 1; }
        }
        r += terminar(color, run, h) * 40;
      }
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) r += 3;
    }
    let osc = 0;
    m.forEach((f) => f.forEach((v) => { if (v) osc++; }));
    const tot = n * n;
    r += (Math.ceil(Math.abs(osc * 20 - tot * 10) / tot) - 1) * 10;
    return r;
  }
}

/** Codifica texto como QR. Devuelve { n, m } donde m[y][x] === true es un módulo oscuro. */
export function crearQR(texto, nivel = 'Q') {
  const bytes = Array.from(new TextEncoder().encode(texto));
  let ecl = NIVELES[nivel] || NIVELES.Q;
  let ver, usados;
  for (ver = 1; ; ver++) {
    const cc = ver < 10 ? 8 : 16;
    usados = 4 + cc + bytes.length * 8;
    if (usados <= palabrasDatos(ver, ecl) * 8) break;
    if (ver >= 40) throw new Error('Texto demasiado largo para un QR');
  }
  for (const k of ['M', 'Q', 'H']) {
    if (NIVELES[k].ord > ecl.ord && usados <= palabrasDatos(ver, NIVELES[k]) * 8) ecl = NIVELES[k];
  }
  const bits = [];
  const poner = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  poner(4, 4);
  poner(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => poner(b, 8));
  const cap = palabrasDatos(ver, ecl) * 8;
  poner(0, Math.min(4, cap - bits.length));
  poner(0, (8 - (bits.length % 8)) % 8);
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) poner(p, 8);
  const palabras = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    palabras.push(v);
  }
  const q = new Matriz(ver, ecl, palabras);
  return { n: q.n, m: q.m, version: ver };
}

/** SVG nítido (escalable) del QR, con zona de silencio. */
export function qrSVG(texto, { margen = 4, oscuro = '#1F232B', claro = '#FFFFFF', titulo = 'Código QR' } = {}) {
  const { n, m } = crearQR(texto);
  const t = n + margen * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (m[y][x]) {
        let w = 1;
        while (x + w < n && m[y][x + w]) w++;
        d += `M${x + margen} ${y + margen}h${w}v1h-${w}z`;
        x += w;
      } else x++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="${titulo}"><rect width="${t}" height="${t}" fill="${claro}"/><path d="${d}" fill="${oscuro}"/></svg>`;
}

/** Dibuja el QR en un canvas, ocupando un cuadrado de `lado` px (incluye zona de silencio). */
export function dibujarQR(ctx, texto, x, y, lado, { margen = 4, oscuro = '#1F232B', claro = '#FFFFFF' } = {}) {
  const { n, m } = crearQR(texto);
  const t = n + margen * 2;
  const mod = Math.floor(lado / t);
  const real = mod * t;
  const ox = Math.round(x + (lado - real) / 2), oy = Math.round(y + (lado - real) / 2);
  ctx.fillStyle = claro;
  ctx.fillRect(x, y, lado, lado);
  ctx.fillStyle = oscuro;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (m[r][c]) ctx.fillRect(ox + (c + margen) * mod, oy + (r + margen) * mod, mod, mod);
  }
}
