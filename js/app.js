// Matrices de lubricación — aplicación principal
import { $, $$, esc, clave, vacio, esNA, clonar, sinAcentos, fechaCorta, fechaHora, ahoraISO, hoyISO, procesarImagen, descargarBlob, nombreArchivo, debounce } from './util.js';
import { qrSVG } from './qr.js';
import { etiquetaQR, imagenMatriz } from './exportar.js';
import { abrirSesion, cifrar, descifrar } from './cripto.js';
import { Repo, datosRepo } from './github.js';

const LOGO_BLANCO = 'img/logo-blanco.png';

/* ------------------------------------------------------------------ Íconos */
const P = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  izq: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  der: '<path d="m9 18 6-6-6-6"/>',
  descargar: '<path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14"/>',
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m14 6 4 4"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  imagen: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  fuego: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .5 2 1.5 3 2.5 3 0-3-1-5.5 0-8z"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  mano: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0"/>',
  vaso: '<path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 8z"/><path d="M9 4h6"/>',
  aire: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  arriba: '<path d="m18 15-6-6-6 6"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  basura: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  equipo: '<path d="M2 17h2.5l1.5-6h7l2.5 6H22"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/><path d="M13 11V5h3.5L20 11"/>',
  ampliar: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  verClave: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const I = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;

/* ------------------------------------------------------------------ Estado */
const estado = {
  config: null,
  datos: null,
  sesion: null,         // { claveHistorial, token } — solo en memoria
  imagenesLocales: {},  // ruta → URL temporal de imágenes recién guardadas (hasta que GitHub Pages publique)
  editor: null,
};
const app = $('#app');
const capa = $('#capa');

const urlBase = () => {
  const p = estado.config && estado.config.urlPublica;
  if (p) return p.replace(/\/?$/, '/');
  return location.origin + location.pathname.replace(/index\.html$/, '');
};
const urlEquipo = (id) => `${urlBase()}?eq=${encodeURIComponent(id)}`;
const urlUnidad = (codigo) => `${urlBase()}?u=${encodeURIComponent(codigo)}`;
const src = (ruta) => estado.imagenesLocales[ruta] || ruta;
const plantilla = () => (estado.datos && estado.datos.plantilla) || {};
const lugarGeneral = () => plantilla().lugar || 'Proyecto Buriticá';

function lubricantesDe(eq, catalogo = estado.datos.lubricantes || {}) {
  const m = new Map();
  const fichas = new Map((eq.fichas || []).filter((f) => f.url).map((f) => [clave(f.nombre), f.url]));
  (eq.puntos || []).forEach((p, i) => {
    const n = String(p.lubricante || '').trim();
    if (!n || esNA(n)) return;
    const k = clave(n);
    if (!m.has(k)) m.set(k, { clave: k, nombre: n, imagen: (catalogo[k] && catalogo[k].imagen) || '', ficha: fichas.get(k) || '', puntos: [] });
    m.get(k).puntos.push(i + 1);
  });
  return [...m.values()];
}
/** Fichas técnicas cuyo nombre no coincide con ningún lubricante de los puntos. */
function fichasSueltas(eq) {
  const usados = new Set(lubricantesDe(eq).filter((l) => l.ficha).map((l) => l.clave));
  return (eq.fichas || []).filter((f) => f.url && !usados.has(clave(f.nombre)));
}
const lisSrc = (code) => { const c = String(code || '').trim(); return (estado.datos.lis || {})[c] || ''; };
const lisImg = (code) => (lisSrc(code) ? `<img class="lis" src="${esc(src(lisSrc(code)))}" alt="Color LIS ${esc(code)}">` : '');
const urlSegura = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');

function dato(v, unidad = '') {
  if (vacio(v)) return '<span class="pendiente">Por definir</span>';
  if (esNA(v)) return 'N/A';
  const s = String(v).trim();
  return esc(unidad && /^\d+([.,]\d+)?$/.test(s) ? `${s} ${unidad}` : s);
}

/* ------------------------------------------------------------- Navegación */
function leerRuta() {
  const p = new URLSearchParams(location.search);
  if (p.get('u')) return { vista: 'unidad', codigo: p.get('u'), id: p.get('eq') || '' };
  if (p.get('eq')) return { vista: 'matriz', id: p.get('eq') };
  const panel = p.get('panel');
  if (panel === 'editar') return { vista: 'editar', id: p.get('id') || '' };
  if (panel === 'nueva' || panel === 'historial') return { vista: panel };
  return { vista: 'inicio' };
}
function rutaURL(r) {
  const base = location.pathname;
  if (r.vista === 'unidad') return `${base}?u=${encodeURIComponent(r.codigo)}${r.id ? `&eq=${encodeURIComponent(r.id)}` : ''}`;
  if (r.vista === 'matriz') return `${base}?eq=${encodeURIComponent(r.id)}`;
  if (r.vista === 'editar') return `${base}?panel=editar${r.id ? `&id=${encodeURIComponent(r.id)}` : ''}`;
  if (r.vista === 'nueva' || r.vista === 'historial') return `${base}?panel=${r.vista}`;
  return base;
}
let rutaActual = { vista: 'inicio' };
async function ir(r, { reemplazar = false } = {}) {
  if (!(await puedeSalirDelEditor(r))) return;
  history[reemplazar ? 'replaceState' : 'pushState'](r, '', rutaURL(r));
  render(r);
}
window.addEventListener('popstate', async () => {
  const r = leerRuta();
  if (!(await puedeSalirDelEditor(r))) { history.pushState(rutaActual, '', rutaURL(rutaActual)); return; }
  render(r);
});

async function puedeSalirDelEditor(destino) {
  const ed = estado.editor;
  if (!ed || rutaActual.vista === destino.vista && (destino.id || '__nueva') === ed.idRuta) return true;
  if (!['editar', 'nueva'].includes(rutaActual.vista) || !ed.borrador) return true;
  if (!calcularCambios(ed).length) { estado.editor = null; return true; }
  const ok = await confirmar({ titulo: '¿Descartar los cambios?', texto: 'Tiene cambios sin guardar en esta matriz. Si sale ahora se perderán.', si: 'Descartar cambios', no: 'Seguir editando' });
  if (ok) estado.editor = null;
  return ok;
}

async function render(r) {
  rutaActual = r;
  const acc = $('#acciones-admin');
  if (acc) acc.hidden = r.vista !== 'inicio';
  cerrarCapa(false);
  window.scrollTo(0, 0);
  if (['editar', 'nueva', 'historial'].includes(r.vista)) {
    if (!estado.sesion) {
      vistaInicio();
      const ok = await pedirClave();
      if (!ok) { history.replaceState({ vista: 'inicio' }, '', rutaURL({ vista: 'inicio' })); rutaActual = { vista: 'inicio' }; return; }
    }
    if (r.vista === 'historial') return vistaHistorial();
    if (r.vista === 'nueva') return vistaEditor(null);
    if (r.id) return vistaEditor(r.id);
    return vistaSelector();
  }
  if (r.vista === 'unidad') return vistaUnidad(r);
  if (r.vista === 'matriz') return vistaMatriz(r.id);
  return vistaInicio();
}

/* ---------------------------------------------------------------- Capas */
let alCerrarCapa = null;
function abrirCapa(html, { alCerrar = null, clase = '' } = {}) {
  capa.innerHTML = `<div class="fondo-capa ${clase}" data-fondo>${html}</div>`;
  capa.classList.add('abierta');
  document.body.classList.add('sin-scroll');
  alCerrarCapa = alCerrar;
  const foco = capa.querySelector('[autofocus], input, select, textarea, button');
  if (foco) setTimeout(() => foco.focus(), 30);
}
function cerrarCapa(ejecutar = true) {
  if (!capa.classList.contains('abierta')) return;
  capa.classList.remove('abierta');
  capa.innerHTML = '';
  document.body.classList.remove('sin-scroll');
  const cb = alCerrarCapa;
  alCerrarCapa = null;
  if (ejecutar && cb) cb();
}
capa.addEventListener('click', (e) => {
  if (e.target.matches('[data-fondo]') && !capa.querySelector('[data-ocupado]')) cerrarCapa();
  if (e.target.closest('[data-cerrar]')) cerrarCapa();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && capa.classList.contains('abierta') && !capa.querySelector('[data-ocupado]')) cerrarCapa();
});

let tToast;
function toast(msg, tipo = '') {
  const t = $('#toast');
  t.innerHTML = `<div class="${tipo}">${esc(msg)}</div>`;
  t.classList.add('ver');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('ver'), tipo === 'error' ? 5200 : 2800);
}

function confirmar({ titulo, texto, si = 'Aceptar', no = 'Cancelar' }) {
  return new Promise((resolve) => {
    abrirCapa(`<div class="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="c-t">
      <div class="d-icono">${I('alerta')}</div>
      <h2 id="c-t">${esc(titulo)}</h2><p>${esc(texto)}</p>
      <div class="d-acciones"><button type="button" class="btn btn-fantasma" id="c-no">${esc(no)}</button><button type="button" class="btn btn-primario" id="c-si">${esc(si)}</button></div>
    </div>`, { alCerrar: () => resolve(false) });
    $('#c-no').onclick = () => cerrarCapa();
    $('#c-si').onclick = () => { cerrarCapa(false); resolve(true); };
  });
}

function pie(texto) {
  return `<footer class="pie"><div class="contenedor"><span><b>${esc(texto || plantilla().departamento || 'Departamento de Tribología')}</b> · ${esc(lugarGeneral())}</span><span>Zijin · Continental Gold</span></div></footer>`;
}

/* ------------------------------------------------------------------ Inicio */
const FILTROS = [['flota', 'Flota'], ['modelo', 'Modelo'], ['equipo', 'Equipo']];
estado.filtros = { flota: new Set(), modelo: new Set(), equipo: new Set() };
estado.q = '';

function mapaIH08() {
  if (estado._ihDe !== estado.datos) {
    estado._ihDe = estado.datos;
    estado._ih = new Map((estado.datos.ih08 || []).map((u) => [u.equipo, u]));
  }
  return estado._ih;
}
function unidadesDe(eq) {
  const m = mapaIH08();
  return (eq.unidades || []).map((c) => m.get(c) || { equipo: c, modelo: '', flota: '', descripcion: '' });
}
const unicos = (xs) => [...new Set(xs.filter(Boolean))];
function textoBusqueda(eq) {
  return sinAcentos([eq.activo, eq.codigo, eq.lugar,
    ...(eq.puntos || []).flatMap((p) => [p.componente, p.lubricante, p.codigoLIS]),
    ...unidadesDe(eq).flatMap((u) => [u.equipo, u.modelo, u.flota, u.descripcion])].join(' ')).toLowerCase();
}
function resaltar(texto, terminos) {
  let h = esc(texto);
  if (!terminos.length) return h;
  const plano = sinAcentos(texto).toLowerCase();
  const marcas = [];
  terminos.forEach((t) => {
    let i = plano.indexOf(t);
    while (i >= 0) { marcas.push([i, i + t.length]); i = plano.indexOf(t, i + t.length); }
  });
  if (!marcas.length) return h;
  marcas.sort((a, b) => a[0] - b[0]);
  let out = '', pos = 0;
  for (const [a, b] of marcas) {
    if (a < pos) continue;
    out += esc(texto.slice(pos, a)) + `<mark class="marca">${esc(texto.slice(a, b))}</mark>`;
    pos = b;
  }
  return out + esc(texto.slice(pos));
}

const hayFiltros = () => FILTROS.some(([f]) => estado.filtros[f].size);
function unidadPasa(u, excepto = '') {
  return FILTROS.every(([f]) => f === excepto || !estado.filtros[f].size || estado.filtros[f].has(u[f]));
}

function tarjetaEquipo(eq, terminos, accion = 'ver') {
  const n = (eq.puntos || []).length;
  const us = unidadesDe(eq);
  const flotas = unicos(us.map((u) => u.flota)).join(' · ');
  const modelos = unicos(us.map((u) => u.modelo));
  const coincid = accion === 'ver' && hayFiltros() ? us.filter((u) => unidadPasa(u)).map((u) => u.equipo) : [];
  const foto = eq.foto || eq.imagen;
  const href = accion === 'ver' ? `?eq=${encodeURIComponent(eq.id)}` : `?panel=editar&id=${encodeURIComponent(eq.id)}`;
  return `<li><a class="tarjeta-equipo" href="${href}" data-${accion === 'ver' ? 'ir' : 'editar'}="${esc(eq.id)}">
    <span class="miniatura foto">${foto ? `<img src="${esc(src(foto))}" alt="" loading="lazy">` : I('equipo')}</span>
    <span class="te-cuerpo">
      <span class="te-nombre">${resaltar(eq.activo, terminos)}</span>
      <span class="te-meta">${flotas ? `${resaltar(flotas, terminos)} · ` : ''}${modelos.length ? `${resaltar(modelos.slice(0, 2).join(', '), terminos)}${modelos.length > 2 ? '…' : ''} · ` : ''}${n} punto${n === 1 ? '' : 's'}</span>
      <span class="te-comp">${coincid.length
        ? `Equipo${coincid.length === 1 ? '' : 's'}: ${resaltar(coincid.join(', '), terminos)}`
        : us.length ? `${us.length} equipo${us.length === 1 ? '' : 's'}: ${resaltar(us.map((u) => u.equipo).join(', '), terminos)}` : 'Sin equipos asociados'}</span>
    </span>${I('der')}</a></li>`;
}

function listaFiltrada(q, usarFiltros = true) {
  const terminos = sinAcentos(q).toLowerCase().split(/\s+/).filter(Boolean);
  const eqs = [...estado.datos.equipos].sort((a, b) => a.activo.localeCompare(b.activo, 'es'));
  return {
    terminos,
    lista: eqs.filter((e) => {
      const t = textoBusqueda(e);
      if (!terminos.every((x) => t.includes(x))) return false;
      return !usarFiltros || !hayFiltros() || unidadesDe(e).some((u) => unidadPasa(u));
    }),
  };
}

/** Opciones de un filtro según los demás filtros activos (filtros encadenados). */
function opcionesFiltro(f) {
  const cuenta = new Map(), vistos = new Set();
  estado.datos.equipos.forEach((eq) => unidadesDe(eq).forEach((u) => {
    if (vistos.has(u.equipo) || !unidadPasa(u, f)) return;
    vistos.add(u.equipo);
    const v = u[f];
    if (!v) return;
    cuenta.set(v, (cuenta.get(v) || 0) + 1);
  }));
  estado.filtros[f].forEach((v) => { if (!cuenta.has(v)) cuenta.set(v, 0); });
  const m = mapaIH08();
  return [...cuenta.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
    .map(([v, n]) => ({ v, n, extra: f === 'equipo' ? (m.get(v) || {}).modelo || '' : '' }));
}

function htmlFiltros() {
  return `<div class="filtros" id="filtros">
    ${FILTROS.map(([f, etq]) => `<div class="filtro" data-filtro="${f}">
      <button type="button" class="filtro-btn" aria-expanded="false" aria-controls="fp-${f}">
        <span>${etq}</span><span class="filtro-n" hidden></span>${I('abajo', 'i-peq')}</button>
      <div class="filtro-panel" id="fp-${f}" role="dialog" aria-label="Filtrar por ${etq.toLowerCase()}" hidden>
        <div class="filtro-cab"><b>${etq}</b><button type="button" class="btn btn-icono btn-fantasma btn-peq" data-cerrar-filtro aria-label="Cerrar">${I('x')}</button></div>
        <div class="filtro-buscar">${I('buscar', 'i-peq')}<input type="search" placeholder="Buscar ${etq.toLowerCase()}" aria-label="Buscar ${etq.toLowerCase()}" autocomplete="off"></div>
        <ul class="filtro-opciones" role="group" aria-label="Opciones de ${etq.toLowerCase()}"></ul>
        <div class="filtro-pie"><button type="button" class="btn btn-fantasma btn-peq" data-limpiar-filtro>${I('basura', 'i-peq')} Limpiar</button><button type="button" class="btn btn-primario btn-peq" data-cerrar-filtro>Listo</button></div>
      </div>
    </div>`).join('')}
    <button type="button" class="btn btn-fantasma btn-peq borrar-todo" id="borrar-filtros">${I('x', 'i-peq')} Borrar todos los filtros</button>
  </div>
  <div class="chips-filtros" id="chips-filtros"></div>`;
}

function montarBuscador(accion) {
  const input = $('#q'), limpiar = $('#q-limpiar'), caja = $('#filtros');
  if (caja) input.value = estado.q;
  const pintarOpciones = (fd) => {
    const f = fd.dataset.filtro, q = sinAcentos($('.filtro-buscar input', fd).value).toLowerCase();
    const ops = opcionesFiltro(f).filter((o) => !q || sinAcentos(`${o.v} ${o.extra}`).toLowerCase().includes(q));
    $('.filtro-opciones', fd).innerHTML = ops.length ? ops.map((o) => `<li><label class="opcion-f">
        <input type="checkbox" value="${esc(o.v)}" ${estado.filtros[f].has(o.v) ? 'checked' : ''}>
        <span>${esc(o.v)}${o.extra ? ` <small>${esc(o.extra)}</small>` : ''}</span><span class="cnt">${o.n}</span></label></li>`).join('')
      : '<li class="filtro-vacio">Sin coincidencias</li>';
  };
  const pintar = () => {
    if (caja) estado.q = input.value;
    const { terminos, lista } = listaFiltrada(input.value, !!caja);
    limpiar.hidden = !input.value;
    const total = estado.datos.equipos.length;
    const activo = terminos.length || (caja && hayFiltros());
    $('#conteo').textContent = activo
      ? `${lista.length} de ${total} matrices`
      : `${total} matrices · ${(estado.datos.ih08 || []).length ? `${new Set(estado.datos.equipos.flatMap((e) => e.unidades || [])).size} equipos` : ''}`;
    $('#lista').innerHTML = lista.length
      ? lista.map((e) => tarjetaEquipo(e, terminos, accion)).join('')
      : `<li class="sin-resultados">No hay matrices con esa búsqueda o filtros.<br>Pruebe con otro término o borre los filtros.</li>`;
    if (caja) {
      FILTROS.forEach(([f]) => {
        const n = estado.filtros[f].size, b = $(`[data-filtro="${f}"] .filtro-n`, caja);
        b.hidden = !n; b.textContent = n;
        $(`[data-filtro="${f}"] .filtro-btn`, caja).classList.toggle('activo', !!n);
      });
      $('#borrar-filtros').disabled = !activo;
      $('#chips-filtros').innerHTML = FILTROS.flatMap(([f, etq]) => [...estado.filtros[f]].map((v) =>
        `<button type="button" class="chip-f" data-quitar="${f}" data-v="${esc(v)}" aria-label="Quitar ${etq} ${esc(v)}"><small>${etq}</small> ${esc(v)} ${I('x', 'i-peq')}</button>`)).join('');
      $$('.filtro-panel:not([hidden])', caja).forEach((p) => pintarOpciones(p.closest('.filtro')));
    }
  };
  input.addEventListener('input', debounce(pintar, 80));
  limpiar.addEventListener('click', () => { input.value = ''; pintar(); input.focus(); });
  if (caja) {
    const cerrar = (fd) => { $('.filtro-panel', fd).hidden = true; $('.filtro-btn', fd).setAttribute('aria-expanded', 'false'); document.body.classList.remove('filtro-abierto'); };
    const cerrarTodos = () => $$('.filtro', caja).forEach(cerrar);
    caja.addEventListener('click', (e) => {
      const fd = e.target.closest('.filtro');
      if (e.target.closest('#borrar-filtros')) {
        FILTROS.forEach(([f]) => estado.filtros[f].clear()); input.value = ''; cerrarTodos(); pintar(); return;
      }
      if (!fd) return;
      if (e.target.closest('.filtro-btn')) {
        const abierto = !$('.filtro-panel', fd).hidden;
        cerrarTodos();
        if (!abierto) {
          $('.filtro-panel', fd).hidden = false; $('.filtro-btn', fd).setAttribute('aria-expanded', 'true');
          document.body.classList.add('filtro-abierto');
          $('.filtro-buscar input', fd).value = '';
          pintarOpciones(fd);
          if (window.matchMedia('(min-width: 720px)').matches) $('.filtro-buscar input', fd).focus();
        }
        return;
      }
      if (e.target.closest('[data-cerrar-filtro]')) { cerrar(fd); $('.filtro-btn', fd).focus(); return; }
      if (e.target.closest('[data-limpiar-filtro]')) { estado.filtros[fd.dataset.filtro].clear(); pintar(); }
    });
    caja.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      const f = e.target.closest('.filtro').dataset.filtro;
      if (e.target.checked) estado.filtros[f].add(e.target.value); else estado.filtros[f].delete(e.target.value);
      pintar();
    });
    caja.addEventListener('input', (e) => { if (e.target.closest('.filtro-buscar')) pintarOpciones(e.target.closest('.filtro')); });
    caja.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const fd = e.target.closest('.filtro'); if (fd) { cerrar(fd); $('.filtro-btn', fd).focus(); e.stopPropagation(); } } });
    $('#chips-filtros').addEventListener('click', (e) => {
      const c = e.target.closest('[data-quitar]');
      if (c) { estado.filtros[c.dataset.quitar].delete(c.dataset.v); pintar(); }
    });
  }
  pintar();
}

function htmlBuscador(placeholder) {
  return `<div class="buscador" role="search">
    ${I('buscar')}
    <input id="q" type="search" placeholder="${esc(placeholder)}" aria-label="Buscar" autocomplete="off" enterkeyhint="search">
    <button type="button" class="btn btn-icono btn-fantasma limpiar" id="q-limpiar" hidden aria-label="Limpiar búsqueda">${I('x')}</button>
  </div>`;
}

function vistaInicio() {
  document.title = 'Matrices de lubricación · Zijin-Continental Gold';
  app.innerHTML = `
  <section class="portada contenedor">
    <p class="eyebrow">${esc(plantilla().departamento || 'Departamento de Tribología')}</p>
    <h1>Matrices de lubricación</h1>
    <p class="lead">Cambio de aceite por equipo · ${esc(lugarGeneral())}</p>
    ${htmlBuscador('Buscar equipo, código, modelo, componente o lubricante')}
    ${htmlFiltros()}
  </section>
  <section class="contenedor" aria-label="Matrices">
    <p class="conteo" id="conteo" aria-live="polite"></p>
    <ul class="tarjetas" id="lista"></ul>
    <div class="qr-inicio">
      <div class="qr">${qrSVG(urlBase(), { titulo: 'Código QR de la página de inicio' })}</div>
      <div>
        <h2>QR de la página de inicio</h2>
        <p>Escanéelo para abrir el buscador de matrices desde cualquier celular.</p>
        <button type="button" class="btn btn-sec btn-peq" data-accion="qr-inicio">${I('descargar')} Descargar QR</button>
      </div>
    </div>
  </section>
  ${pie()}`;
  montarBuscador('ver');
}

/* ------------------------------------------------------------------ Matriz */
/** QR de un equipo (?u=DL001): abre la matriz que le corresponde. */
function vistaUnidad(r) {
  const cod = String(r.codigo || '').trim();
  const u = mapaIH08().get(cod) || { equipo: cod };
  const ms = estado.datos.equipos.filter((e) => (e.unidades || []).includes(cod));
  const elegida = ms.find((e) => e.id === r.id);
  if (elegida || ms.length === 1) { rutaActual.id = (elegida || ms[0]).id; return vistaMatriz(rutaActual.id, cod); }
  if (!ms.length) {
    document.title = `Equipo ${cod}`;
    app.innerHTML = `<div class="estado-vacio contenedor"><div class="d-icono">${I('qr')}</div>
      <h1>${esc(cod)} no tiene matriz asignada</h1>
      <p>${u.descripcion ? `${esc(u.descripcion)}. ` : ''}Este equipo aún no está asociado a ninguna matriz de cambio de aceite. Búsquelo desde el inicio o pida a un editor que lo asigne.</p>
      <a class="btn btn-primario" href="./" data-nav="inicio">${I('buscar')} Ir al buscador</a></div>`;
    return;
  }
  document.title = `Equipo ${cod} · Matrices`;
  app.innerHTML = `<div class="barra"><div class="contenedor barra-in"><a class="btn btn-fantasma" href="./" data-nav="inicio">${I('izq')} Inicio</a></div></div>
    <section class="contenedor vista-admin">
      <p class="eyebrow">Equipo ${esc(cod)}${u.modelo ? ` · ${esc(u.modelo)}` : ''}${u.flota ? ` · ${esc(u.flota)}` : ''}</p>
      <h1>Seleccione la matriz</h1>
      <p class="lead">Este equipo tiene ${ms.length} matrices de cambio de aceite registradas.</p>
      <ul class="tarjetas" style="margin-top:18px">${ms.map((e) => `<li><a class="tarjeta-equipo" href="?u=${encodeURIComponent(cod)}&eq=${encodeURIComponent(e.id)}" data-unidad-ir="${esc(cod)}" data-eq="${esc(e.id)}">
        <span class="miniatura foto">${(e.foto || e.imagen) ? `<img src="${esc(src(e.foto || e.imagen))}" alt="">` : I('equipo')}</span>
        <span class="te-cuerpo"><span class="te-nombre">${esc(e.activo)}</span><span class="te-meta">${e.puntos.length} puntos · elaborada ${esc(fechaCorta(e.fechaElaboracion))}</span></span>${I('der')}</a></li>`).join('')}</ul>
    </section>${pie()}`;
}

function vistaMatriz(id, unidad = '') {
  const eq = estado.datos.equipos.find((e) => e.id === id);
  if (!eq) {
    document.title = 'Matriz no encontrada';
    app.innerHTML = `<div class="estado-vacio contenedor">
      <div class="d-icono">${I('qr')}</div>
      <h1>No encontramos esta matriz</h1>
      <p>El código QR o el enlace no corresponde a ninguna matriz registrada («${esc(id)}»). Busque el equipo desde el inicio.</p>
      <a class="btn btn-primario" href="./" data-nav="inicio">${I('buscar')} Ir al buscador</a>
    </div>`;
    return;
  }
  document.title = `${unidad ? `${unidad} · ` : ''}${eq.activo} · Matriz de cambio de aceite`;
  const uSel = unidad ? (mapaIH08().get(unidad) || { equipo: unidad }) : null;
  const lubs = lubricantesDe(eq);
  const pa = eq.primerosAuxilios || {};
  const filas = eq.puntos.map((p, i) => `
    <li class="punto">
      <div class="p-cab"><span class="num" aria-label="Punto ${i + 1}">${i + 1}</span>
        <div><h3>${esc(p.componente || '—')}</h3><p class="p-lub">${vacio(p.lubricante) ? '<span class="pendiente">Lubricante por definir</span>' : esc(p.lubricante)}</p></div></div>
      <dl class="p-datos">
        <div class="destacado"><dt>Cantidad total</dt><dd>${dato(p.cantidad, 'gal')}</dd></div>
        <div class="destacado"><dt>Cambio de aceite</dt><dd>${dato(p.intervaloCambio)}</dd></div>
        <div><dt>Código LIS</dt><dd>${lisImg(p.codigoLIS)}${dato(p.codigoLIS)}</dd></div>
        <div><dt>Muestreo</dt><dd>${dato(p.intervaloMuestreo, 'h')}</dd></div>
        <div><dt>Método</dt><dd>${dato(p.metodo)}</dd></div>
        <div><dt>Tarea</dt><dd>${dato(p.tarea)}</dd></div>
        ${vacio(p.revisionNivel) ? '' : `<div class="completa"><dt>Revisión de nivel</dt><dd>${dato(p.revisionNivel)}</dd></div>`}
      </dl>
    </li>`).join('');
  const conNivel = eq.puntos.some((p) => !vacio(p.revisionNivel));
  const tabla = eq.puntos.map((p, i) => `<tr>
      <td><span class="num">${i + 1}</span></td><td class="comp">${esc(p.componente || '—')}</td><td>${lisImg(p.codigoLIS)}${dato(p.codigoLIS)}</td>
      <td>${dato(p.lubricante)}</td><td>${dato(p.cantidad, 'gal')}</td><td>${dato(p.tarea)}</td>
      <td>${dato(p.intervaloCambio)}</td><td>${dato(p.metodo)}</td><td>${dato(p.intervaloMuestreo, 'h')}</td>${conNivel ? `<td>${vacio(p.revisionNivel) ? '—' : dato(p.revisionNivel)}</td>` : ''}</tr>`).join('');
  const sueltas = fichasSueltas(eq);
  const aux = [['ojo', 'Ojos', pa.ojos], ['mano', 'Piel', pa.piel], ['vaso', 'Ingestión', pa.ingestion], ['aire', 'Inhalación', pa.inhalacion]]
    .filter(([, , t]) => !vacio(t))
    .map(([ic, k, t]) => `<div><dt>${I(ic)}<span class="visual-oculto">${k}</span></dt><dd><b>${k}</b>${esc(t)}</dd></div>`).join('');

  app.innerHTML = `
  <div class="barra"><div class="contenedor barra-in">
    <a class="btn btn-fantasma" href="./" data-nav="inicio">${I('izq')} Inicio</a>
    <span class="esp"></span>
    <button type="button" class="btn btn-primario" data-accion="descargar">${I('descargar')} Descargar</button>
  </div></div>
  <article class="contenedor matriz">
    <header class="m-cabecera">
      <div>
        <p class="eyebrow">Matriz de cambio de aceite</p>
        ${uSel ? `<p class="unidad-actual">${I('qr', 'i-peq')} Equipo <b>${esc(uSel.equipo)}</b>${uSel.descripcion ? ` <span>${esc(uSel.descripcion)}</span>` : ''}</p>` : ''}
        <h1>${esc(eq.activo)}</h1>
        <div class="chips">
          <span class="chip chip-marca">${eq.codigo ? `Código <b>${esc(eq.codigo)}</b>` : 'Sin código'}</span>
          <span class="chip">${esc(eq.lugar || lugarGeneral())}</span>
          <span class="chip">${eq.puntos.length} punto${eq.puntos.length === 1 ? '' : 's'}</span>
          ${unicos(unidadesDe(eq).map((u) => u.flota)).map((f) => `<span class="chip">Flota <b>${esc(f)}</b></span>`).join('')}
          ${unicos(unidadesDe(eq).map((u) => u.modelo)).map((m) => `<span class="chip">Modelo <b>${esc(m)}</b></span>`).join('')}
        </div>
        ${unidadesDe(eq).length ? `<details class="unidades"><summary>Aplica a ${unidadesDe(eq).length} equipo${unidadesDe(eq).length === 1 ? '' : 's'}</summary>
          <ul>${unidadesDe(eq).map((u) => `<li><a href="?u=${encodeURIComponent(u.equipo)}&eq=${encodeURIComponent(eq.id)}" data-unidad-ir="${esc(u.equipo)}" data-eq="${esc(eq.id)}" ${u.equipo === unidad ? 'aria-current="true"' : ''}><b>${esc(u.equipo)}</b><small>${esc([u.modelo, u.flota].filter(Boolean).join(' · '))}</small></a></li>`).join('')}</ul></details>` : ''}
        <dl class="m-fechas">
          <div><dt>Elaboración</dt><dd>${esc(fechaCorta(eq.fechaElaboracion) || '—')}</dd></div>
          <div><dt>Última actualización</dt><dd>${esc(eq.actualizado ? fechaCorta(eq.actualizado) : '—')}</dd></div>
        </dl>
      </div>
      <figure class="m-imagen">${eq.imagen
        ? `<button type="button" data-accion="ampliar" data-src="${esc(src(eq.imagen))}" aria-label="Ampliar imagen de puntos de lubricación"><img src="${esc(src(eq.imagen))}" alt="Puntos de lubricación de ${esc(eq.activo)}"><span class="ampliar">${I('ampliar', 'i-peq')} Ampliar</span></button>`
        : `<div class="m-sin-imagen">${I('imagen')}<span>Imagen de puntos de lubricación pendiente</span></div>`}</figure>
    </header>

    <section class="bloque" aria-labelledby="t-puntos">
      <h2 id="t-puntos">Puntos de cambio de aceite <span class="cuenta">${eq.puntos.length}</span></h2>
      <ol class="puntos">${filas}</ol>
      <div class="tabla-envoltura"><table class="tabla-puntos">
        <thead><tr><th>Punto</th><th>Componente</th><th>Código lubricante (LIS)</th><th>Lubricante</th><th>Cantidad total (gal)</th><th>Tarea</th><th>Intervalo de cambio de aceite</th><th>Método</th><th>Intervalo de muestreo (h)</th>${conNivel ? '<th>Revisión de nivel</th>' : ''}</tr></thead>
        <tbody>${tabla}</tbody></table></div>
    </section>

    ${lubs.length || sueltas.length ? `<section class="bloque" aria-labelledby="t-lubs">
      <h2 id="t-lubs">Información de lubricantes</h2>
      <ul class="lubs">${lubs.map((l) => `<li class="lub">
        ${l.imagen ? `<button type="button" class="miniatura" data-accion="ampliar" data-src="${esc(src(l.imagen))}" aria-label="Ampliar imagen de ${esc(l.nombre)}"><img src="${esc(src(l.imagen))}" alt=""></button>` : `<span class="miniatura vacia">${I('gota')}</span>`}
        <div><b>${esc(l.nombre)}</b><small>Punto${l.puntos.length > 1 ? 's' : ''} ${l.puntos.join(', ')}</small>
        ${urlSegura(l.ficha) ? `<a class="ficha" href="${esc(urlSegura(l.ficha))}" target="_blank" rel="noopener">${I('doc', 'i-peq')} Ficha técnica</a>` : ''}</div></li>`).join('')}
        ${sueltas.map((f) => `<li class="lub"><span class="miniatura vacia">${I('doc')}</span><div><b>${esc(f.nombre)}</b><small>Ficha técnica</small>
          ${urlSegura(f.url) ? `<a class="ficha" href="${esc(urlSegura(f.url))}" target="_blank" rel="noopener">${I('doc', 'i-peq')} Abrir ficha</a>` : ''}</div></li>`).join('')}</ul>
    </section>` : ''}

    <section class="bloque" aria-labelledby="t-seg">
      <h2 id="t-seg">Seguridad</h2>
      <div class="seguridad">
        ${eq.advertencia ? `<div class="aviso"><p class="seg-titulo">${I('alerta')} Advertencia</p><p>${esc(eq.advertencia)}</p></div>` : ''}
        ${aux || pa.nota ? `<div class="auxilios"><p class="seg-titulo">Primeros auxilios para lubricadores</p><dl class="aux-lista">${aux}</dl>${pa.nota ? `<p class="aux-nota">${esc(pa.nota)}</p>` : ''}</div>` : ''}
        ${eq.incendios ? `<div class="incendio"><p class="seg-titulo">${I('fuego')} Medida contra incendios</p><p>${esc(eq.incendios)}</p></div>` : ''}
      </div>
    </section>
  </article>
  ${pie(eq.departamento)}`;
  const foto = $('.m-imagen img');
  const ajustar = () => { if (foto.naturalWidth / foto.naturalHeight > 2) $('.m-cabecera').classList.add('ancha'); };
  if (foto) { if (foto.complete && foto.naturalWidth) ajustar(); else foto.addEventListener('load', ajustar); }
}

function etiquetaUnidad(eq, u) {
  return etiquetaQR({
    titulo: u.equipo, eyebrow: 'Matriz de cambio de aceite',
    detalle: [eq.activo, u.flota].filter(Boolean).join(' · '),
    url: urlUnidad(u.equipo), pie: `${eq.departamento || 'Departamento de Tribología'} · ${eq.lugar || lugarGeneral()}`, logoBlanco: LOGO_BLANCO,
  });
}
function cargarJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'js/vendor/jszip.min.js';
    sc.onload = () => res(window.JSZip);
    sc.onerror = () => rej(new Error('No se pudo cargar el compresor ZIP'));
    document.head.appendChild(sc);
  });
}

function hojaDescarga(eq, unidad = '') {
  const us = unidadesDe(eq);
  const pre = us.find((u) => u.equipo === unidad) ? unidad : (us[0] || {}).equipo || '';
  abrirCapa(`<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="t-desc">
    <h2 id="t-desc">Descargar</h2>
    <p>${esc(eq.activo)} · seleccione qué desea descargar.</p>
    ${us.length ? `<div class="opcion opcion-sel">
        <span class="op-icono">${I('qr')}</span>
        <span style="flex:1;min-width:0"><b>QR de un equipo</b><small>Etiqueta PNG para pegar en el equipo seleccionado</small>
          <span class="fila-sel"><select id="d-unidad" aria-label="Equipo">${us.map((u) => `<option value="${esc(u.equipo)}" ${u.equipo === pre ? 'selected' : ''}>${esc(u.equipo)}${u.modelo ? ` · ${esc(u.modelo)}` : ''}</option>`).join('')}</select>
          <button type="button" class="btn btn-primario btn-peq" data-desc="qr-unidad">${I('descargar', 'i-peq')} Descargar</button></span></span>
      </div>
      ${us.length > 1 ? `<button type="button" class="opcion" data-desc="qr-todos"><span class="op-icono">${I('qr')}</span><span><b>QR de todos los equipos (${us.length})</b><small>Archivo ZIP con una etiqueta PNG por equipo</small></span></button>` : ''}` : ''}
    <button type="button" class="opcion" data-desc="qr"><span class="op-icono">${I('qr')}</span><span><b>QR general de la matriz</b><small>Etiqueta PNG de la matriz, sin equipo específico</small></span></button>
    <button type="button" class="opcion" data-desc="matriz"><span class="op-icono">${I('doc')}</span><span><b>Matriz de lubricación</b><small>Imagen PNG en alta resolución</small></span></button>
    <button type="button" class="btn btn-fantasma ancho" data-cerrar>Cancelar</button>
  </div>`);
  capa.querySelectorAll('[data-desc]').forEach((b) => b.addEventListener('click', async () => {
    if (capa.querySelector('[data-ocupado]')) return;
    const caja = b.closest('.opcion') || b;
    caja.setAttribute('aria-busy', 'true');
    caja.setAttribute('data-ocupado', '');
    const small = caja.querySelector('small'), antes = small.textContent;
    small.textContent = 'Generando…';
    try {
      const nombre = nombreArchivo(eq.codigo ? `${eq.activo}_${eq.codigo}` : eq.activo);
      const tipo = b.dataset.desc;
      if (tipo === 'qr-unidad') {
        const u = us.find((x) => x.equipo === $('#d-unidad').value);
        descargarBlob(await etiquetaUnidad(eq, u), `QR_${nombreArchivo(u.equipo)}.png`);
      } else if (tipo === 'qr-todos') {
        const JSZip = await cargarJSZip();
        const zip = new JSZip();
        for (let i = 0; i < us.length; i++) {
          small.textContent = `Generando ${i + 1} de ${us.length}…`;
          zip.file(`QR_${nombreArchivo(us[i].equipo)}.png`, await etiquetaUnidad(eq, us[i]));
        }
        descargarBlob(await zip.generateAsync({ type: 'blob' }), `QR_equipos_${nombre}.zip`);
      } else if (tipo === 'qr') {
        const blob = await etiquetaQR({
          titulo: eq.activo, eyebrow: 'Matriz de cambio de aceite',
          detalle: eq.codigo ? `Código ${eq.codigo}` : (eq.lugar || lugarGeneral()),
          url: urlEquipo(eq.id), pie: `${eq.departamento || 'Departamento de Tribología'} · ${eq.lugar || lugarGeneral()}`, logoBlanco: LOGO_BLANCO,
        });
        descargarBlob(blob, `QR_${nombre}.png`);
      } else {
        const blob = await imagenMatriz({ equipo: eq, lubricantes: lubricantesDe(eq), url: unidad ? urlUnidad(unidad) : urlEquipo(eq.id), logoBlanco: LOGO_BLANCO, src, lis: lisSrc, unidades: us });
        descargarBlob(blob, `Matriz_${nombre}.png`);
      }
      cerrarCapa(false);
      toast(tipo === 'qr-todos' ? 'ZIP descargado' : 'Imagen descargada');
    } catch (e) {
      console.error(e);
      small.textContent = antes;
      caja.removeAttribute('aria-busy'); caja.removeAttribute('data-ocupado');
      toast('No se pudo generar la descarga. Intente de nuevo.', 'error');
    }
  }));
}

function visor(url) {
  abrirCapa(`<div class="visor" data-fondo><button type="button" class="btn btn-icono cerrar" data-cerrar aria-label="Cerrar imagen">${I('x')}</button><img src="${esc(url)}" alt=""></div>`, { clase: 'oscuro' });
}

/* --------------------------------------------------------- Contraseña */
function pedirClave() {
  return new Promise((resolve) => {
    abrirCapa(`<form class="dialogo" id="f-clave" role="dialog" aria-modal="true" aria-labelledby="t-clave" novalidate>
      <div class="d-icono">${I('candado')}</div>
      <h2 id="t-clave">Acceso de edición</h2>
      <p>Para editar, crear matrices o ver el historial ingrese la contraseña.</p>
      <label class="campo"><span>Contraseña</span>
        <div class="clave-envoltura"><input type="password" id="clave" autocomplete="current-password" autocapitalize="none" spellcheck="false" required>
        <button type="button" class="btn btn-icono btn-fantasma btn-peq" id="ver-clave" aria-label="Mostrar contraseña" aria-pressed="false">${I('verClave')}</button></div>
      </label>
      <p class="error" id="err-clave" hidden></p>
      <div class="d-acciones"><button type="button" class="btn btn-fantasma" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primario" id="b-clave">Ingresar</button></div>
    </form>`, { alCerrar: () => resolve(false) });
    const f = $('#f-clave'), inp = $('#clave'), err = $('#err-clave'), btn = $('#b-clave');
    $('#ver-clave').onclick = (e) => {
      const ver = inp.type === 'password';
      inp.type = ver ? 'text' : 'password';
      e.currentTarget.setAttribute('aria-pressed', String(ver));
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!inp.value) { err.textContent = 'Escriba la contraseña.'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Verificando…'; f.setAttribute('data-ocupado', '');
      let s = null;
      try { s = await abrirSesion(inp.value.trim(), estado.config); } catch (x) { console.error(x); }
      f.removeAttribute('data-ocupado');
      btn.disabled = false; btn.textContent = 'Ingresar';
      if (!s) {
        err.textContent = 'Contraseña incorrecta.'; err.hidden = false;
        f.classList.remove('agitar'); void f.offsetWidth; f.classList.add('agitar');
        inp.select();
        return;
      }
      estado.sesion = s;
      cerrarCapa(false);
      resolve(true);
    });
  });
}

function cerrarSesion() {
  estado.sesion = null;
  estado.editor = null;
  ir({ vista: 'inicio' });
  toast('Sesión de edición cerrada');
}

function barraAdmin(titulo, volver = { vista: 'inicio' }, extra = '') {
  return `<div class="barra"><div class="contenedor barra-in">
    <a class="btn btn-fantasma btn-icono" href="${esc(rutaURL(volver))}" data-volver='${esc(JSON.stringify(volver))}' aria-label="Volver">${I('izq')}</a>
    <span class="barra-titulo">${esc(titulo)}</span>
    ${extra}
    <button type="button" class="btn btn-fantasma btn-icono" data-accion="salir" aria-label="Cerrar sesión de edición" title="Cerrar sesión de edición">${I('salir')}</button>
  </div></div>`;
}
const bannerSinToken = () => (estado.sesion && !estado.sesion.token
  ? `<p class="banner">${I('info')}<span><b>Guardado en línea sin activar.</b> Puede revisar el formulario, pero para guardar debe configurar el token de GitHub (paso 4 de la guía, página <code>configurar.html</code>).</span></p>` : '');

/* ------------------------------------------------- Selección para editar */
function vistaSelector() {
  document.title = 'Editar matriz';
  app.innerHTML = `${barraAdmin('Editar matriz')}
  <section class="contenedor vista-admin">
    ${bannerSinToken()}
    <h1>¿Qué matriz desea editar?</h1>
    <p class="lead">Busque y seleccione el equipo.</p>
    ${htmlBuscador('Buscar equipo o código')}
    <p class="conteo" id="conteo"></p>
    <ul class="tarjetas" id="lista"></ul>
  </section>`;
  montarBuscador('editar');
}

/* ------------------------------------------------------------- Editor */
const CAMPOS_PUNTO = [
  ['componente', 'Componente', true], ['codigoLIS', 'Código lubricante (LIS)'], ['lubricante', 'Lubricante', false, 'doble'],
  ['cantidad', 'Cantidad total (gal)'], ['intervaloCambio', 'Intervalo de cambio de aceite'], ['intervaloMuestreo', 'Intervalo de muestreo (h)'],
  ['metodo', 'Método'], ['tarea', 'Tarea'], ['revisionNivel', 'Revisión de nivel'],
];
const puntoVacio = () => ({ componente: '', codigoLIS: '', lubricante: '', cantidad: '', tarea: 'Lubricado', intervaloCambio: '', metodo: 'Manual', intervaloMuestreo: '', revisionNivel: '' });
function equipoNuevo() {
  const t = plantilla();
  return {
    id: '', activo: '', codigo: '', lugar: t.lugar || '', fechaElaboracion: hoyISO(), actualizado: null, imagen: '', foto: '', unidades: [],
    puntos: [puntoVacio()], fichas: [], advertencia: t.advertencia || '', primerosAuxilios: clonar(t.primerosAuxilios || {}),
    incendios: t.incendios || '', departamento: t.departamento || 'Departamento de Tribología',
  };
}

function vistaEditor(id) {
  const idRuta = id || '__nueva';
  let ed = estado.editor;
  if (!ed || ed.idRuta !== idRuta) {
    let original = null, borrador;
    if (id) {
      const eq = estado.datos.equipos.find((e) => e.id === id);
      if (!eq) { toast('No se encontró la matriz seleccionada', 'error'); ir({ vista: 'editar' }, { reemplazar: true }); return; }
      original = clonar(eq); borrador = clonar(eq);
      borrador.primerosAuxilios = borrador.primerosAuxilios || {};
    } else borrador = equipoNuevo();
    ed = estado.editor = {
      idRuta, modo: id ? 'editar' : 'nuevo', original, borrador,
      lubsOriginal: clonar(estado.datos.lubricantes || {}), lubs: clonar(estado.datos.lubricantes || {}), pendientes: {},
    };
  }
  const b = ed.borrador, pa = b.primerosAuxilios;
  const titulo = ed.modo === 'nuevo' ? 'Nueva matriz' : `Editar · ${ed.original.activo}`;
  document.title = titulo;
  const valores = (k) => [...new Set(estado.datos.equipos.flatMap((e) => e.puntos.map((p) => p[k])).filter((v) => !vacio(v)))];
  const area = (campo, etq, valor, filas = 4) => `<label class="campo"><span>${etq}</span><textarea data-campo="${campo}" rows="${filas}">${esc(valor || '')}</textarea></label>`;

  app.innerHTML = `${barraAdmin(titulo, ed.modo === 'nuevo' ? { vista: 'inicio' } : { vista: 'editar' })}
  <form class="contenedor vista-admin" id="f-editor" novalidate>
    ${bannerSinToken()}
    <h1>${ed.modo === 'nuevo' ? 'Nueva matriz de lubricación' : esc(ed.original.activo)}</h1>
    ${ed.modo === 'nuevo'
      ? `<p class="lead">Complete los datos del equipo. El código QR se genera automáticamente al guardar.</p>
         <label class="campo" style="margin-top:16px"><span>Partir de otra matriz (opcional)</span>
           <select id="copiar-de"><option value="">Matriz en blanco</option>${estado.datos.equipos.map((e) => `<option value="${esc(e.id)}">${esc(e.activo)}${e.codigo ? ` · ${esc(e.codigo)}` : ''}</option>`).join('')}</select>
           <small>Copia los puntos, lubricantes e imagen de un equipo similar para ahorrar tiempo.</small></label>`
      : `<p class="nota-qr">${I('qr')}<span>El código QR de esta matriz se conserva aunque cambie sus datos (<code>?eq=${esc(b.id)}</code>).</span></p>`}
    <div id="errores"></div>

    <fieldset class="ed-seccion"><legend>Datos del equipo</legend>
      <div class="rejilla rejilla-2">
        <label class="campo"><span>Activo (nombre del equipo) <span class="req">*</span></span><input data-campo="activo" value="${esc(b.activo)}" required autocomplete="off" placeholder="Ej.: CAT MONTACARGA"></label>
        <label class="campo"><span>Código</span><input data-campo="codigo" value="${esc(b.codigo)}" autocomplete="off" placeholder="Ej.: MC-01"></label>
        <label class="campo"><span>Lugar</span><input data-campo="lugar" value="${esc(b.lugar)}" autocomplete="off"></label>
        <label class="campo"><span>Fecha de elaboración</span><input type="date" data-campo="fechaElaboracion" value="${esc(b.fechaElaboracion || '')}"></label>
      </div>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Imagen de puntos de lubricación</legend>
      <div id="ed-img"></div>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Foto del equipo (pantalla de inicio)</legend>
      <div id="ed-foto"></div>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Equipos que usan esta matriz (IH08)</legend>
      <p class="ayuda">Marque los equipos de la lista IH08 que usan esta matriz. Cada equipo tiene su propio QR y pertenece a una sola matriz: si marca uno que está en otra matriz, al guardar se mueve a esta y su QR abrirá esta matriz.</p>
      <div id="ed-unidades"></div>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Puntos de cambio de aceite</legend>
      <div id="ed-puntos"></div>
      <button type="button" class="btn btn-sec ancho" data-accion="agregar-punto" style="margin-bottom:16px">${I('mas')} Agregar punto</button>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Imágenes de lubricantes</legend>
      <p class="ayuda">Se listan los lubricantes usados en los puntos. La imagen de cada lubricante se comparte con todas las matrices que lo usan.</p>
      <div id="ed-lubs"></div>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Fichas técnicas de lubricantes</legend>
      <p class="ayuda">Enlaces a la ficha técnica de cada lubricante. En la matriz aparecen como botón «Ficha técnica».</p>
      <div id="ed-fichas"></div>
      <button type="button" class="btn btn-sec ancho" data-accion="agregar-ficha" style="margin-bottom:16px">${I('mas')} Agregar ficha técnica</button>
    </fieldset>

    <fieldset class="ed-seccion"><legend>Seguridad</legend>
      ${area('advertencia', 'Advertencia', b.advertencia, 6)}
      <div class="rejilla rejilla-2">
        ${area('primerosAuxilios.ojos', 'Primeros auxilios · Ojos', pa.ojos)}
        ${area('primerosAuxilios.piel', 'Primeros auxilios · Piel', pa.piel)}
        ${area('primerosAuxilios.ingestion', 'Primeros auxilios · Ingestión', pa.ingestion)}
        ${area('primerosAuxilios.inhalacion', 'Primeros auxilios · Inhalación', pa.inhalacion)}
      </div>
      ${area('primerosAuxilios.nota', 'Nota de primeros auxilios', pa.nota, 3)}
      ${area('incendios', 'Medida contra incendios', b.incendios, 3)}
      <label class="campo"><span>Departamento responsable</span><input data-campo="departamento" value="${esc(b.departamento || '')}"></label>
    </fieldset>

    <datalist id="dl-lub">${Object.values(estado.datos.lubricantes || {}).map((l) => `<option value="${esc(l.nombre)}">`).join('')}</datalist>
    <datalist id="dl-metodo">${valores('metodo').map((v) => `<option value="${esc(v)}">`).join('')}</datalist>
    <datalist id="dl-tarea">${valores('tarea').map((v) => `<option value="${esc(v)}">`).join('')}</datalist>

    <div class="ed-acciones"><div class="contenedor">
      <button type="button" class="btn btn-fantasma" data-accion="cancelar-edicion">Cancelar</button>
      <button type="submit" class="btn btn-primario">${I('check')} Guardar cambios</button>
    </div></div>
  </form>`;
  b.fichas = b.fichas || [];
  b.unidades = b.unidades || [];
  pintarImagenEditor();
  pintarFotoEditor();
  pintarUnidadesEditor();
  pintarPuntosEditor();
  pintarLubsEditor();
  pintarFichasEditor();

  const f = $('#f-editor');
  f.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.campo) {
      const [a, k] = t.dataset.campo.split('.');
      if (k) b[a][k] = t.value; else b[a] = t.value;
      t.closest('.campo')?.classList.remove('invalido');
    } else if (t.dataset.k) {
      const i = +t.closest('[data-i]').dataset.i;
      b.puntos[i][t.dataset.k] = t.value;
      t.closest('.campo')?.classList.remove('invalido');
      if (t.dataset.k === 'componente') t.closest('.ed-punto').querySelector('.ed-punto-cab b').textContent = t.value || `Punto ${i + 1}`;
    } else if (t.id === 'u-buscar') {
      pintarUnidadesEditor();
    } else if (t.dataset.fk) {
      b.fichas[+t.closest('[data-f]').dataset.f][t.dataset.fk] = t.value;
      t.closest('.campo')?.classList.remove('invalido');
    }
  });
  f.addEventListener('change', (e) => {
    if (e.target.dataset.k === 'lubricante') pintarLubsEditor();
    if (e.target.matches('input[type=file]')) cargarImagenEditor(e.target);
    if (e.target.dataset.unidad) {
      const c = e.target.dataset.unidad, set = new Set(b.unidades);
      if (e.target.checked) set.add(c); else set.delete(c);
      b.unidades = [...set].sort((x, y) => x.localeCompare(y, 'es', { numeric: true }));
      pintarUnidadesEditor();
    }
  });
  const copiar = $('#copiar-de');
  if (copiar) copiar.addEventListener('change', () => {
    const o = estado.datos.equipos.find((e) => e.id === copiar.value);
    if (!o) return;
    b.puntos = clonar(o.puntos);
    b.imagen = o.imagen || '';
    b.fichas = clonar(o.fichas || []);
    pintarImagenEditor(); pintarPuntosEditor(); pintarLubsEditor(); pintarFichasEditor();
    toast(`Se copiaron ${o.puntos.length} puntos de ${o.activo}`);
  });
  f.addEventListener('submit', (e) => { e.preventDefault(); validarYRegistrar(); });
}

function pintarImagenEditor() {
  const b = estado.editor.borrador;
  $('#ed-img').innerHTML = `
    ${b.imagen ? `<div class="ed-imagen"><img src="${esc(src(b.imagen))}" alt="Imagen actual de puntos de lubricación"></div>`
      : '<div class="m-sin-imagen" style="margin-bottom:12px">' + I('imagen') + '<span>Sin imagen. Suba una foto o diagrama con los puntos numerados.</span></div>'}
    <div class="fila-botones">
      <label class="btn btn-sec">${I('imagen')} ${b.imagen ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" accept="image/*" data-img="equipo" class="visual-oculto"></label>
      ${b.imagen ? `<button type="button" class="btn btn-peligro" data-accion="quitar-img">${I('basura')} Quitar</button>` : ''}
    </div>`;
}

function pintarPuntosEditor() {
  const b = estado.editor.borrador, n = b.puntos.length;
  $('#ed-puntos').innerHTML = b.puntos.map((p, i) => `
    <div class="ed-punto" data-i="${i}">
      <div class="ed-punto-cab"><span class="num">${i + 1}</span><b>${esc(p.componente || `Punto ${i + 1}`)}</b>
        <div class="ed-punto-ctrl">
          <button type="button" class="btn btn-icono btn-fantasma btn-peq" data-accion="subir-punto" ${i === 0 ? 'disabled' : ''} aria-label="Subir punto ${i + 1}">${I('arriba')}</button>
          <button type="button" class="btn btn-icono btn-fantasma btn-peq" data-accion="bajar-punto" ${i === n - 1 ? 'disabled' : ''} aria-label="Bajar punto ${i + 1}">${I('abajo')}</button>
          <button type="button" class="btn btn-icono btn-peligro btn-peq" data-accion="borrar-punto" aria-label="Eliminar punto ${i + 1}">${I('basura')}</button>
        </div></div>
      <div class="rejilla rejilla-pts">
        ${CAMPOS_PUNTO.map(([k, etq, req, cls]) => `<label class="campo ${cls || ''}"><span>${etq}${req ? ' <span class="req">*</span>' : ''}</span>
          <input data-k="${k}" value="${esc(p[k] || '')}" autocomplete="off" ${k === 'lubricante' ? 'list="dl-lub"' : k === 'metodo' ? 'list="dl-metodo"' : k === 'tarea' ? 'list="dl-tarea"' : ''}
          ${k === 'cantidad' ? 'inputmode="decimal" placeholder="Ej.: 4,5"' : k === 'intervaloCambio' ? 'placeholder="Ej.: 500 h"' : k === 'intervaloMuestreo' ? 'placeholder="Ej.: 250"' : ''}></label>`).join('')}
      </div>
    </div>`).join('');
}

function pintarFotoEditor() {
  const b = estado.editor.borrador;
  $('#ed-foto').innerHTML = `
    <div class="ed-lub" style="border:0">
      <span class="miniatura foto" style="width:96px;height:96px">${b.foto ? `<img src="${esc(src(b.foto))}" alt="Foto actual">` : I('equipo')}</span>
      <div><b>${b.foto ? 'Foto actual' : 'Sin foto'}</b><small>Se muestra en la tarjeta del equipo en el inicio. Si no hay foto se usa la imagen de puntos.</small></div>
    </div>
    <div class="fila-botones">
      <label class="btn btn-sec">${I('imagen')} ${b.foto ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" data-img="foto" class="visual-oculto"></label>
      ${b.foto ? `<button type="button" class="btn btn-peligro" data-accion="quitar-foto">${I('basura')} Quitar</button>` : ''}
    </div>`;
}

function pintarUnidadesEditor() {
  const b = estado.editor.borrador, caja = $('#ed-unidades');
  if (!$('#u-buscar', caja)) {
    caja.innerHTML = `<p class="ayuda" id="u-cuenta"></p>
      <div class="filtro-buscar" style="padding:0 0 8px">${I('buscar', 'i-peq')}<input id="u-buscar" type="search" placeholder="Buscar por código, modelo, flota o descripción" autocomplete="off"></div>
      <ul class="filtro-opciones u-lista" id="u-lista"></ul>`;
  }
  const sel = new Set(b.unidades);
  const qn = sinAcentos($('#u-buscar').value).toLowerCase();
  const otras = new Map();
  estado.datos.equipos.forEach((e) => { if (e.id !== b.id) (e.unidades || []).forEach((c) => { if (!otras.has(c)) otras.set(c, e.activo); }); });
  const lista = (estado.datos.ih08 || []).filter((u) => !qn || sinAcentos(`${u.equipo} ${u.modelo} ${u.flota} ${u.descripcion}`).toLowerCase().includes(qn))
    .sort((x, y) => (sel.has(y.equipo) - sel.has(x.equipo)) || x.equipo.localeCompare(y.equipo, 'es', { numeric: true }));
  $('#u-cuenta').innerHTML = `<b>${sel.size}</b> equipo${sel.size === 1 ? '' : 's'} seleccionado${sel.size === 1 ? '' : 's'}${sel.size ? `: ${esc([...sel].join(', '))}` : ''}`;
  $('#u-lista').innerHTML = lista.slice(0, 250).map((u) => `<li><label class="opcion-f">
      <input type="checkbox" data-unidad="${esc(u.equipo)}" ${sel.has(u.equipo) ? 'checked' : ''}>
      <span>${esc(u.equipo)} <small>${esc([u.modelo, u.flota].filter(Boolean).join(' · '))}</small></span>
      <span class="cnt">${otras.has(u.equipo) ? `en ${esc(otras.get(u.equipo))}` : ''}</span></label></li>`).join('') || '<li class="filtro-vacio">Sin coincidencias</li>';
}

function pintarFichasEditor() {
  const f = estado.editor.borrador.fichas;
  $('#ed-fichas').innerHTML = f.length ? f.map((x, i) => `
    <div class="ed-punto" data-f="${i}">
      <div class="ed-punto-cab"><span class="num">${i + 1}</span><b>${esc(x.nombre || 'Ficha técnica')}</b>
        <div class="ed-punto-ctrl"><button type="button" class="btn btn-icono btn-peligro btn-peq" data-accion="borrar-ficha" aria-label="Eliminar ficha ${i + 1}">${I('basura')}</button></div></div>
      <div class="rejilla rejilla-2">
        <label class="campo"><span>Lubricante</span><input data-fk="nombre" value="${esc(x.nombre || '')}" list="dl-lub" autocomplete="off"></label>
        <label class="campo"><span>Enlace (https://…)</span><input data-fk="url" value="${esc(x.url || '')}" type="url" inputmode="url" autocomplete="off" spellcheck="false"></label>
      </div>
    </div>`).join('') : '<p class="ayuda">Sin fichas técnicas.</p>';
}

function pintarLubsEditor() {
  const ed = estado.editor;
  const lubs = lubricantesDe(ed.borrador, ed.lubs);
  $('#ed-lubs').innerHTML = lubs.length ? lubs.map((l) => `
    <div class="ed-lub">
      <span class="miniatura">${l.imagen ? `<img src="${esc(src(l.imagen))}" alt="">` : I('gota')}</span>
      <div><b>${esc(l.nombre)}</b><small>Punto${l.puntos.length > 1 ? 's' : ''} ${l.puntos.join(', ')}</small></div>
      <div class="fila-botones">
        <label class="btn btn-sec btn-peq">${I('imagen')} ${l.imagen ? 'Cambiar' : 'Subir'}<input type="file" accept="image/*" data-img="lub" data-clave="${esc(l.clave)}" data-nombre="${esc(l.nombre)}" class="visual-oculto"></label>
        ${l.imagen ? `<button type="button" class="btn btn-icono btn-peligro btn-peq" data-accion="quitar-img-lub" data-clave="${esc(l.clave)}" aria-label="Quitar imagen de ${esc(l.nombre)}">${I('basura')}</button>` : ''}
      </div>
    </div>`).join('') : '<p class="ayuda">Aún no hay lubricantes en los puntos.</p>';
}

async function cargarImagenEditor(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const ed = estado.editor;
  try {
    toast('Procesando imagen…');
    const r = await procesarImagen(file, input.dataset.img === 'lub' || input.dataset.img === 'foto' ? { maxLado: 900 } : {});
    const marca = Date.now().toString(36);
    if (input.dataset.img === 'foto') {
      const ruta = `img/fotos/${clave(ed.borrador.activo) || 'equipo'}-${marca}.jpg`;
      ed.pendientes[ruta] = r;
      estado.imagenesLocales[ruta] = r.url;
      ed.borrador.foto = ruta;
      pintarFotoEditor();
    } else if (input.dataset.img === 'equipo') {
      const ruta = `img/equipos/${clave(ed.borrador.activo) || 'equipo'}-${marca}.jpg`;
      ed.pendientes[ruta] = r;
      estado.imagenesLocales[ruta] = r.url;
      ed.borrador.imagen = ruta;
      pintarImagenEditor();
    } else {
      const k = input.dataset.clave;
      const ruta = `img/lubricantes/${k}-${marca}.jpg`;
      ed.pendientes[ruta] = r;
      estado.imagenesLocales[ruta] = r.url;
      ed.lubs[k] = { nombre: input.dataset.nombre, ...(ed.lubs[k] || {}), imagen: ruta };
      pintarLubsEditor();
    }
    toast('Imagen lista. Se subirá al guardar.');
  } catch (e) {
    toast(e.message || 'No se pudo cargar la imagen', 'error');
  }
}

/* --------------------------------------------------- Cambios realizados */
const ETQ = { activo: 'Activo', codigo: 'Código', lugar: 'Lugar', fechaElaboracion: 'Fecha de elaboración', departamento: 'Departamento' };
const ETQ_TXT = { advertencia: 'Advertencia', incendios: 'Medida contra incendios' };
const ETQ_PA = { ojos: 'Ojos', piel: 'Piel', ingestion: 'Ingestión', inhalacion: 'Inhalación', nota: 'Nota' };
const ETQ_P = Object.fromEntries(CAMPOS_PUNTO.map(([k, e]) => [k, e]));
const norm = (v) => String(v ?? '').trim();
const fmt = (v) => (norm(v) ? `"${norm(v)}"` : '(vacío)');

function calcularCambios(ed) {
  const a = ed.original, b = ed.borrador, out = [];
  if (!a) {
    out.push(`Creación de la matriz con ${b.puntos.length} punto${b.puntos.length === 1 ? '' : 's'}: ${b.puntos.map((p) => norm(p.componente) || '—').join(', ')}`);
    if (b.imagen) out.push('Imagen de puntos de lubricación agregada');
    if ((b.unidades || []).length) out.push(`Equipos asociados: ${b.unidades.map((c) => { const o = estado.datos.equipos.find((e) => (e.unidades || []).includes(c)); return o ? `${c} (sale de ${o.activo})` : c; }).join(', ')}`);
  } else {
    Object.keys(ETQ).forEach((k) => { if (norm(a[k]) !== norm(b[k])) out.push(`${ETQ[k]}: ${fmt(a[k])} → ${fmt(b[k])}`); });
    if (norm(a.imagen) !== norm(b.imagen)) out.push(!b.imagen ? 'Imagen de puntos de lubricación eliminada' : a.imagen ? 'Imagen de puntos de lubricación reemplazada' : 'Imagen de puntos de lubricación agregada');
    const n = Math.max(a.puntos.length, b.puntos.length);
    for (let i = 0; i < n; i++) {
      const pa = a.puntos[i], pb = b.puntos[i];
      if (!pa) out.push(`Punto ${i + 1} agregado: ${norm(pb.componente) || '—'}${norm(pb.lubricante) ? ` (${norm(pb.lubricante)})` : ''}`);
      else if (!pb) out.push(`Punto ${i + 1} eliminado: ${norm(pa.componente) || '—'}`);
      else Object.keys(ETQ_P).forEach((k) => {
        if (norm(pa[k]) !== norm(pb[k])) out.push(`Punto ${i + 1} (${norm(pb.componente) || norm(pa.componente)}) · ${ETQ_P[k]}: ${fmt(pa[k])} → ${fmt(pb[k])}`);
      });
    }
    Object.keys(ETQ_TXT).forEach((k) => { if (norm(a[k]) !== norm(b[k])) out.push(`${ETQ_TXT[k]}: texto modificado`); });
    if (norm(a.foto) !== norm(b.foto)) out.push(!b.foto ? 'Foto del equipo eliminada' : a.foto ? 'Foto del equipo reemplazada' : 'Foto del equipo agregada');
    const uA = new Set(a.unidades || []), uB = new Set(b.unidades || []);
    const mas = [...uB].filter((x) => !uA.has(x)), menos = [...uA].filter((x) => !uB.has(x));
    if (mas.length) out.push(`Equipos agregados: ${mas.map((c) => { const o = estado.datos.equipos.find((e) => e.id !== b.id && (e.unidades || []).includes(c)); return o ? `${c} (sale de ${o.activo})` : c; }).join(', ')}`);
    if (menos.length) out.push(`Equipos retirados: ${menos.join(', ')}`);
    const fA = JSON.stringify((a.fichas || []).map((f) => [norm(f.nombre), norm(f.url)]));
    const fB = JSON.stringify((b.fichas || []).map((f) => [norm(f.nombre), norm(f.url)]));
    if (fA !== fB) out.push(`Fichas técnicas modificadas (${(a.fichas || []).length} → ${(b.fichas || []).length})`);
    const paA = a.primerosAuxilios || {}, paB = b.primerosAuxilios || {};
    Object.keys(ETQ_PA).forEach((k) => { if (norm(paA[k]) !== norm(paB[k])) out.push(`Primeros auxilios · ${ETQ_PA[k]}: texto modificado`); });
  }
  lubsCambiados(ed).forEach((k) => {
    const antes = (ed.lubsOriginal[k] || {}).imagen, ahora = (ed.lubs[k] || {}).imagen;
    out.push(`Imagen del lubricante ${(ed.lubs[k] || ed.lubsOriginal[k]).nombre}: ${!ahora ? 'eliminada' : antes ? 'reemplazada' : 'agregada'}`);
  });
  return out;
}
function lubsCambiados(ed) {
  const ks = new Set([...Object.keys(ed.lubs), ...Object.keys(ed.lubsOriginal)]);
  return [...ks].filter((k) => norm((ed.lubs[k] || {}).imagen) !== norm((ed.lubsOriginal[k] || {}).imagen));
}

function validarYRegistrar() {
  const ed = estado.editor, b = ed.borrador, errores = [];
  $$('.campo.invalido').forEach((c) => c.classList.remove('invalido'));
  if (!norm(b.activo)) { errores.push('Escriba el nombre del activo.'); $('[data-campo="activo"]').closest('.campo').classList.add('invalido'); }
  if (!b.puntos.length) errores.push('Agregue al menos un punto de cambio de aceite.');
  b.puntos.forEach((p, i) => {
    if (!norm(p.componente)) { errores.push(`Punto ${i + 1}: escriba el componente.`); $(`[data-i="${i}"] [data-k="componente"]`).closest('.campo').classList.add('invalido'); }
  });
  (b.fichas || []).forEach((f, i) => {
    if (norm(f.url) && !/^https?:\/\//i.test(norm(f.url))) { errores.push(`Ficha técnica ${i + 1}: el enlace debe empezar por https://`); $(`[data-f="${i}"] [data-fk="url"]`).closest('.campo').classList.add('invalido'); }
  });
  if (ed.modo === 'nuevo') {
    const id = clave(`${b.activo} ${b.codigo}`);
    if (norm(b.activo) && estado.datos.equipos.some((e) => clave(`${e.activo} ${e.codigo}`) === id)) errores.push('Ya existe una matriz con ese activo y código. Use otro código o edite la existente.');
  }
  const caja = $('#errores');
  if (errores.length) {
    caja.innerHTML = `<div class="errores" role="alert"><b>Revise antes de guardar:</b><ul>${errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  caja.innerHTML = '';
  const cambios = calcularCambios(ed);
  if (!cambios.length) { toast('No hay cambios para guardar'); return; }
  dialogoRegistro(cambios);
}

function dialogoRegistro(cambios) {
  const ed = estado.editor;
  const fecha = ahoraISO();
  abrirCapa(`<form class="dialogo dialogo-ancho" id="f-registro" role="dialog" aria-modal="true" aria-labelledby="t-reg" novalidate>
    <div class="d-icono">${I('doc')}</div>
    <h2 id="t-reg">Registro del cambio</h2>
    <p>Antes de guardar, identifíquese. Estos datos quedan en el historial de cambios.</p>
    <label class="campo"><span>Nombre de la persona que actualiza <span class="req">*</span></span><input id="r-nombre" autocomplete="name" required></label>
    <label class="campo"><span>Documento de identificación <span class="req">*</span></span><input id="r-doc" autocomplete="off" required></label>
    <div class="resumen">
      <h3>Se registra automáticamente</h3>
      <dl>
        <dt>Fecha</dt><dd>${esc(fechaHora(fecha))}</dd>
        <dt>Matriz</dt><dd>${esc(ed.borrador.activo)} · ${ed.modo === 'nuevo' ? 'creación' : 'actualización'}</dd>
      </dl>
      <h3>Cambios realizados (${cambios.length})</h3>
      <ul class="cambios">${cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>
    <p class="error" id="r-error" hidden></p>
    <div id="r-progreso"></div>
    <div class="d-acciones"><button type="button" class="btn btn-fantasma" data-cerrar>Volver a editar</button><button type="submit" class="btn btn-primario" id="r-ok">${I('check')} Confirmar y guardar</button></div>
  </form>`);
  const f = $('#f-registro');
  f.addEventListener('input', (e) => { e.target.closest('.campo')?.classList.remove('invalido'); $('#r-error').hidden = true; });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = norm($('#r-nombre').value), doc = norm($('#r-doc').value), err = $('#r-error');
    $$('.campo', f).forEach((c) => c.classList.remove('invalido'));
    const faltan = [];
    if (nombre.length < 3) { faltan.push('el nombre completo'); $('#r-nombre').closest('.campo').classList.add('invalido'); }
    if (doc.length < 4) { faltan.push('el documento de identificación'); $('#r-doc').closest('.campo').classList.add('invalido'); }
    if (faltan.length) { err.textContent = `Falta ${faltan.join(' y ')}.`; err.hidden = false; return; }
    err.hidden = true;
    const btn = $('#r-ok');
    btn.disabled = true; f.setAttribute('data-ocupado', '');
    $$('[data-cerrar]', f).forEach((x) => { x.disabled = true; });
    const prog = (t) => { $('#r-progreso').innerHTML = `<p class="progreso"><span class="giro" aria-hidden="true"></span>${esc(t)}</p>`; };
    try {
      const eq = await guardarEnGitHub(ed, { nombre, documento: doc, accion: ed.modo === 'nuevo' ? 'Creación' : 'Actualización', matriz: norm(ed.borrador.activo), cambios }, prog);
      estado.editor = null;
      dialogoExito(eq, ed.modo);
    } catch (x) {
      console.error(x);
      $('#r-progreso').innerHTML = '';
      err.textContent = x.message || 'No se pudo guardar. Intente de nuevo.';
      err.hidden = false;
      btn.disabled = false; f.removeAttribute('data-ocupado');
      $$('[data-cerrar]', f).forEach((y) => { y.disabled = false; });
    }
  });
}

function dialogoExito(eq, modo) {
  abrirCapa(`<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="t-ok">
    <div class="d-icono ok">${I('check')}</div>
    <h2 id="t-ok">${modo === 'nuevo' ? 'Matriz creada' : 'Cambios guardados'}</h2>
    <p>${esc(eq.activo)} quedó guardada y registrada en el historial. Los técnicos verán la actualización en 1 a 2 minutos, el tiempo que tarda GitHub en publicarla.</p>
    ${modo === 'nuevo' ? '<p>Descargue el código QR desde la matriz para imprimirlo y pegarlo en el equipo.</p>' : ''}
    <div class="d-acciones"><button type="button" class="btn btn-fantasma" id="ok-inicio">Ir al inicio</button><button type="button" class="btn btn-primario" id="ok-ver">Ver matriz</button></div>
  </div>`, { alCerrar: () => ir({ vista: 'matriz', id: eq.id }) });
  $('#ok-ver').onclick = () => { cerrarCapa(false); ir({ vista: 'matriz', id: eq.id }); };
  $('#ok-inicio').onclick = () => { cerrarCapa(false); ir({ vista: 'inicio' }); };
}

/* ---------------------------------------------------- Guardar en GitHub */
async function guardarEnGitHub(ed, registro, progreso) {
  const s = estado.sesion;
  if (!s || !s.token) throw new Error('El guardado en línea no está activado. Configure el token de GitHub en configurar.html (paso 4 de la guía).');
  const repo = new Repo({ ...datosRepo(estado.config), token: s.token });
  for (let intento = 0; ; intento++) {
    try {
      progreso('Leyendo la versión más reciente…');
      const txt = await repo.leerTexto('data/matrices.json');
      const remoto = txt ? JSON.parse(txt) : clonar(estado.datos);
      remoto.equipos = remoto.equipos || [];
      remoto.lubricantes = remoto.lubricantes || {};
      const ahora = ahoraISO();
      const eq = clonar(ed.borrador);
      ['activo', 'codigo', 'lugar', 'departamento'].forEach((k) => { eq[k] = norm(eq[k]); });
      eq.puntos = eq.puntos.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, norm(v)])));
      eq.fichas = (eq.fichas || []).map((f) => ({ nombre: norm(f.nombre), url: norm(f.url) })).filter((f) => f.nombre || f.url);
      eq.actualizado = ahora;
      if (ed.modo === 'nuevo') {
        const base = clave(`${eq.activo} ${eq.codigo}`) || 'equipo';
        let id = base, k = 2;
        while (remoto.equipos.some((e) => e.id === id)) id = `${base}-${k++}`;
        eq.id = id;
        remoto.equipos.push(eq);
      } else {
        const i = remoto.equipos.findIndex((e) => e.id === eq.id);
        if (i >= 0) remoto.equipos[i] = eq; else remoto.equipos.push(eq);
      }
      lubsCambiados(ed).forEach((k) => { remoto.lubricantes[k] = { ...(remoto.lubricantes[k] || {}), ...ed.lubs[k] }; });
      lubricantesDe(eq, remoto.lubricantes).forEach((l) => {
        if (!remoto.lubricantes[l.clave]) remoto.lubricantes[l.clave] = { nombre: l.nombre, imagen: (ed.lubs[l.clave] || {}).imagen || '' };
      });
      // Cada equipo (IH08) queda en una sola matriz: se retira de las demás
      const mias = new Set(eq.unidades || []);
      remoto.equipos.forEach((o) => { if (o.id !== eq.id && o.unidades) o.unidades = o.unidades.filter((c) => !mias.has(c)); });
      remoto.equipos.sort((a, b) => a.activo.localeCompare(b.activo, 'es'));
      remoto.actualizado = ahora;

      progreso('Actualizando el historial de cambios…');
      const htxt = await repo.leerTexto('data/historial.json');
      let hist = { esquema: 1, cifrado: null };
      try { if (htxt) hist = JSON.parse(htxt); } catch { /* archivo vacío o dañado */ }
      let registros = [];
      if (hist.cifrado) {
        try { registros = JSON.parse(await descifrar(s.claveHistorial, hist.cifrado)); } catch {
          throw new Error('No se pudo abrir el historial con esta contraseña. Si la contraseña cambió, vuelva a configurar en configurar.html.');
        }
      }
      registros.push({ fecha: ahora, ...registro, matriz: eq.activo, matrizId: eq.id });
      const histNuevo = { esquema: 1, registros: registros.length, cifrado: await cifrar(s.claveHistorial, JSON.stringify(registros)) };

      progreso('Guardando en GitHub…');
      const usadas = new Set([eq.imagen, eq.foto, ...Object.values(remoto.lubricantes).map((l) => l.imagen)]);
      const archivos = [
        { ruta: 'data/matrices.json', texto: `${JSON.stringify(remoto, null, 2)}\n` },
        { ruta: 'data/historial.json', texto: `${JSON.stringify(histNuevo, null, 2)}\n` },
        ...Object.entries(ed.pendientes).filter(([r]) => usadas.has(r)).map(([ruta, p]) => ({ ruta, base64: p.base64 })),
      ];
      await repo.commit(archivos, `${ed.modo === 'nuevo' ? 'Crea' : 'Actualiza'} matriz: ${eq.activo}`);
      estado.datos = remoto;
      return eq;
    } catch (e) {
      if (intento === 0 && (e.estado === 409 || e.estado === 422)) continue;
      throw e;
    }
  }
}

/* ------------------------------------------------------------ Historial */
async function vistaHistorial() {
  document.title = 'Historial de cambios';
  app.innerHTML = `${barraAdmin('Historial de cambios', { vista: 'inicio' }, '<button type="button" class="btn btn-sec btn-peq" data-accion="csv" disabled>' + I('descargar') + ' CSV</button>')}
  <section class="contenedor vista-admin">
    <h1>Historial de cambios</h1>
    <p class="lead">Quién actualizó o creó cada matriz, cuándo y qué cambió. Este registro se guarda cifrado.</p>
    <div id="h-lista" style="margin-top:18px"><p class="progreso"><span class="giro" aria-hidden="true"></span>Cargando historial…</p></div>
  </section>`;
  let regs = [];
  try {
    let txt;
    if (estado.sesion.token) txt = await new Repo({ ...datosRepo(estado.config), token: estado.sesion.token }).leerTexto('data/historial.json');
    else txt = await (await fetch('data/historial.json', { cache: 'no-store' })).text();
    const h = txt ? JSON.parse(txt) : {};
    if (h.cifrado) regs = JSON.parse(await descifrar(estado.sesion.claveHistorial, h.cifrado));
  } catch (e) {
    console.error(e);
    $('#h-lista').innerHTML = `<div class="errores">No se pudo cargar el historial. ${esc(e.message || '')}</div>`;
    return;
  }
  estado.historial = regs;
  regs = [...regs].reverse();
  const csv = $('[data-accion="csv"]');
  if (csv) csv.disabled = !regs.length;
  $('#h-lista').innerHTML = regs.length ? `<ul class="historial">${regs.map((r) => `<li class="h-item">
      <div class="h-cab"><span class="etiqueta ${r.accion === 'Creación' ? 'nueva' : ''}">${esc(r.accion)}</span><b>${esc(r.matriz)}</b><span class="h-fecha">${esc(fechaHora(r.fecha))}</span></div>
      <p class="h-persona">${esc(r.nombre)} · Doc. ${esc(r.documento)}</p>
      <details><summary>${(r.cambios || []).length} cambio${(r.cambios || []).length === 1 ? '' : 's'} realizado${(r.cambios || []).length === 1 ? '' : 's'}</summary>
      <ul class="cambios">${(r.cambios || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>
    </li>`).join('')}</ul>`
    : '<div class="sin-resultados">Todavía no hay cambios registrados.</div>';
}

function descargarCSV() {
  const regs = estado.historial || [];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Fecha', 'Acción', 'Matriz', 'ID matriz', 'Nombre', 'Documento', 'Cambios realizados']]
    .concat(regs.map((r) => [fechaHora(r.fecha), r.accion, r.matriz, r.matrizId, r.nombre, r.documento, (r.cambios || []).join(' | ')]));
  const blob = new Blob(['﻿' + filas.map((f) => f.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  descargarBlob(blob, `Historial_matrices_${hoyISO()}.csv`);
}

/* ------------------------------------------------------- Eventos globales */
document.addEventListener('click', async (e) => {
  const a = e.target.closest('a[data-nav], a[data-ir], a[data-editar], a[data-volver], a[data-unidad-ir]');
  if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    if (a.dataset.nav === 'inicio') return ir({ vista: 'inicio' });
    if (a.dataset.ir) return ir({ vista: 'matriz', id: a.dataset.ir });
    if (a.dataset.unidadIr) return ir({ vista: 'unidad', codigo: a.dataset.unidadIr, id: a.dataset.eq || '' });
    if (a.dataset.editar) return ir({ vista: 'editar', id: a.dataset.editar });
    if (a.dataset.volver) return ir(JSON.parse(a.dataset.volver));
  }
  const b = e.target.closest('[data-accion]');
  if (!b || b.disabled) return;
  const acc = b.dataset.accion;
  const ed = estado.editor;
  switch (acc) {
    case 'editar': return ir({ vista: 'editar' });
    case 'nueva': return ir({ vista: 'nueva' });
    case 'historial': return ir({ vista: 'historial' });
    case 'salir': {
      if (ed && calcularCambios(ed).length && !(await confirmar({ titulo: '¿Cerrar la sesión?', texto: 'Hay cambios sin guardar que se perderán.', si: 'Cerrar sesión', no: 'Seguir editando' }))) return;
      return cerrarSesion();
    }
    case 'csv': return descargarCSV();
    case 'descargar': {
      const eq = estado.datos.equipos.find((x) => x.id === rutaActual.id);
      if (eq) hojaDescarga(eq, rutaActual.vista === 'unidad' ? rutaActual.codigo : '');
      return;
    }
    case 'qr-inicio': {
      b.disabled = true;
      try {
        const blob = await etiquetaQR({ titulo: 'Matrices de lubricación', eyebrow: 'Página de inicio', detalle: 'Buscador de equipos', url: urlBase(), pie: `${plantilla().departamento || 'Departamento de Tribología'} · ${lugarGeneral()}`, logoBlanco: LOGO_BLANCO });
        descargarBlob(blob, 'QR_Inicio_Matrices_de_lubricacion.png');
        toast('Imagen descargada');
      } catch (x) { console.error(x); toast('No se pudo generar el QR', 'error'); }
      b.disabled = false;
      return;
    }
    case 'ampliar': return visor(b.dataset.src);
    case 'cancelar-edicion': return ir(ed && ed.modo === 'editar' ? { vista: 'editar' } : { vista: 'inicio' });
    case 'agregar-punto': {
      ed.borrador.puntos.push(puntoVacio());
      pintarPuntosEditor();
      const ult = $(`[data-i="${ed.borrador.puntos.length - 1}"]`);
      ult.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => ult.querySelector('input').focus({ preventScroll: true }), 300);
      return;
    }
    case 'subir-punto': case 'bajar-punto': {
      const i = +b.closest('[data-i]').dataset.i, j = acc === 'subir-punto' ? i - 1 : i + 1;
      const pts = ed.borrador.puntos;
      [pts[i], pts[j]] = [pts[j], pts[i]];
      pintarPuntosEditor(); pintarLubsEditor();
      $(`[data-i="${j}"] [data-accion="${acc}"]`)?.focus();
      return;
    }
    case 'borrar-punto': {
      const i = +b.closest('[data-i]').dataset.i;
      const p = ed.borrador.puntos[i];
      if (!(await confirmar({ titulo: `¿Eliminar el punto ${i + 1}?`, texto: `${p.componente || 'Este punto'} se quitará de la matriz al guardar.`, si: 'Eliminar punto', no: 'Cancelar' }))) return;
      ed.borrador.puntos.splice(i, 1);
      pintarPuntosEditor(); pintarLubsEditor();
      return;
    }
    case 'agregar-ficha': ed.borrador.fichas.push({ nombre: '', url: '' }); pintarFichasEditor(); $(`[data-f="${ed.borrador.fichas.length - 1}"] input`).focus(); return;
    case 'borrar-ficha': ed.borrador.fichas.splice(+b.closest('[data-f]').dataset.f, 1); pintarFichasEditor(); return;
    case 'quitar-foto': ed.borrador.foto = ''; pintarFotoEditor(); return;
    case 'quitar-img': ed.borrador.imagen = ''; pintarImagenEditor(); return;
    case 'quitar-img-lub': {
      const k = b.dataset.clave;
      ed.lubs[k] = { ...(ed.lubs[k] || {}), imagen: '' };
      pintarLubsEditor();
      return;
    }
    default:
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('#filtros')) return;
  $$('#filtros .filtro-panel:not([hidden])').forEach((p) => { p.hidden = true; p.closest('.filtro').querySelector('.filtro-btn').setAttribute('aria-expanded', 'false'); });
  document.body.classList.remove('filtro-abierto');
});

window.addEventListener('beforeunload', (e) => {
  if (estado.editor && estado.editor.borrador && calcularCambios(estado.editor).length) { e.preventDefault(); e.returnValue = ''; }
});

/* ------------------------------------------------------------------ Inicio */
async function cargarJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function iniciar() {
  try {
    const [config, datos] = await Promise.all([cargarJSON('data/config.json'), cargarJSON('data/matrices.json')]);
    estado.config = config;
    estado.datos = datos;
    datos.equipos = datos.equipos || [];
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="estado-vacio contenedor"><div class="d-icono">${I('alerta')}</div><h1>No se pudieron cargar las matrices</h1>
      <p>Revise la conexión a internet e intente de nuevo.</p><button type="button" class="btn btn-primario" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  const r = leerRuta();
  history.replaceState(r, '', location.pathname + location.search);
  render(r);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
iniciar();
