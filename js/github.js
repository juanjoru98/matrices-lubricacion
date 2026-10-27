// Guardado en el repositorio de GitHub mediante la API (un solo commit por cambio).
const API = 'https://api.github.com';

export class ErrorGitHub extends Error {
  constructor(msg, estado) { super(msg); this.estado = estado; }
}

/** Dueño / repositorio / rama: de la configuración o deducidos de la URL de GitHub Pages. */
export function datosRepo(config) {
  const c = (config && config.repo) || {};
  let owner = c.owner, name = c.name;
  if (!owner || !name) {
    const h = location.hostname;
    if (h.endsWith('.github.io')) {
      owner = owner || h.replace(/\.github\.io$/, '');
      const seg = location.pathname.split('/').filter(Boolean)[0];
      name = name || (seg && !seg.includes('.') ? seg : `${owner}.github.io`);
    }
  }
  return { owner, name, branch: c.branch || 'main' };
}

function mensajeError(estado, cuerpo) {
  if (estado === 401) return 'El token de GitHub no es válido o venció. Genere uno nuevo y vuelva a configurar (configurar.html).';
  if (estado === 403) return 'El token no tiene permiso de escritura sobre el repositorio, o GitHub limitó las solicitudes. Intente de nuevo en unos minutos.';
  if (estado === 404) return 'No se encontró el repositorio o el archivo. Revise el dueño, el nombre y la rama en config.json.';
  if (estado === 409 || estado === 422) return 'Otra persona guardó cambios al mismo tiempo. Intente guardar de nuevo.';
  return `GitHub respondió con error ${estado}. ${cuerpo || ''}`.trim();
}

export class Repo {
  constructor({ owner, name, branch, token }) {
    if (!owner || !name) throw new ErrorGitHub('No se pudo identificar el repositorio de GitHub. Configure "repo" en config.json.', 0);
    this.owner = owner; this.name = name; this.branch = branch || 'main'; this.token = token;
  }

  async req(metodo, ruta, cuerpo, accept = 'application/vnd.github+json') {
    let r;
    try {
      r = await fetch(`${API}/repos/${this.owner}/${this.name}${ruta}`, {
        method: metodo,
        cache: 'no-store',
        headers: {
          Accept: accept,
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ErrorGitHub('Sin conexión con GitHub. Verifique la señal de internet e intente de nuevo.', 0);
    }
    if (!r.ok) {
      let txt = '';
      try { txt = (await r.json()).message || ''; } catch { /* sin cuerpo */ }
      throw new ErrorGitHub(mensajeError(r.status, txt), r.status);
    }
    if (accept.includes('raw')) return r.text();
    return r.status === 204 ? null : r.json();
  }

  info() { return this.req('GET', ''); }

  /** Lee un archivo de texto de la rama actual. Devuelve null si no existe. */
  async leerTexto(ruta) {
    const p = ruta.split('/').map(encodeURIComponent).join('/');
    try {
      return await this.req('GET', `/contents/${p}?ref=${encodeURIComponent(this.branch)}`, null, 'application/vnd.github.raw+json');
    } catch (e) {
      if (e.estado === 404) return null;
      throw e;
    }
  }

  /** archivos: [{ ruta, texto }] o [{ ruta, base64 }] */
  async commit(archivos, mensaje) {
    const ref = await this.req('GET', `/git/ref/heads/${encodeURIComponent(this.branch)}`);
    const padre = ref.object.sha;
    const cm = await this.req('GET', `/git/commits/${padre}`);
    const arbol = [];
    for (const a of archivos) {
      const blob = await this.req('POST', '/git/blobs', a.base64 !== undefined
        ? { content: a.base64, encoding: 'base64' }
        : { content: a.texto, encoding: 'utf-8' });
      arbol.push({ path: a.ruta, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await this.req('POST', '/git/trees', { base_tree: cm.tree.sha, tree: arbol });
    const nuevo = await this.req('POST', '/git/commits', { message: mensaje, tree: tree.sha, parents: [padre] });
    await this.req('PATCH', `/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha: nuevo.sha, force: false });
    return nuevo.sha;
  }
}
