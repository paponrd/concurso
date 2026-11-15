import { textos as t } from '../config/textos.js'
import { evento as cfg } from '../config/evento.js'
import { datos } from './datos.js'

export const FASES = ['subida', 'votacion', 'final', 'cerrado']
export const $ = (sel, raiz = document) => raiz.querySelector(sel)

export function crea(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta)
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'clase') nodo.className = v
    else if (k === 'texto') nodo.textContent = v
    else if (/^al[A-Z]/.test(k)) nodo.addEventListener(k.slice(2).toLowerCase(), v)
    else nodo.setAttribute(k, v === true ? '' : v)
  }
  nodo.append(...hijos.flat().filter(h => h !== null && h !== undefined && h !== false))
  return nodo
}

export function foto(src, alt, extra = {}) {
  return crea('img', { src, alt, loading: 'lazy', decoding: 'async', ...extra })
}

export function inicial(nombre) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#888"/><text x="16" y="21" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">${(nombre || '?').trim().charAt(0).toUpperCase().replace(/[<&]/g, '?')}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function pinta() {
  for (const nodo of document.querySelectorAll('[data-t]')) {
    const valor = nodo.dataset.t.split('.').reduce((o, k) => o?.[k], t)
    if (typeof valor === 'string') nodo.textContent = valor
  }
  if (datos.demo) {
    const cinta = $('#demo')
    cinta.textContent = t.demo
    cinta.hidden = false
  }
  const enlace = $('#discord')
  if (enlace && cfg.discord) {
    enlace.href = cfg.discord
    enlace.hidden = false
  }
}

export async function cabecera() {
  const yo = await datos.yo()
  const caja = $('#sesion')
  caja.replaceChildren()
  if (!yo) {
    caja.append(crea('button', { clase: 'boton chico', type: 'button', texto: t.entrar, alClick: () => datos.entrar() }))
    return null
  }
  if (yo.admin) caja.append(crea('a', { clase: 'boton chico linea', href: 'admin.html', texto: t.admin }))
  caja.append(
    crea('a', { clase: 'yo', href: 'subir.html', title: t.miPanel },
      crea('img', { src: yo.avatar || inicial(yo.nombre), alt: '', width: 32, height: 32 }),
      crea('span', { texto: yo.nombre })),
    crea('button', {
      clase: 'boton chico linea', type: 'button', texto: t.salir,
      alClick: async () => {
        await datos.salir()
        location.reload()
      },
    }))
  return yo
}

let reloj
export function aviso(mensaje) {
  let caja = $('.aviso')
  if (!caja) {
    caja = crea('div', { clase: 'aviso', role: 'status', 'data-fuera': true })
    document.body.append(caja)
  }
  caja.textContent = mensaje
  requestAnimationFrame(() => caja.removeAttribute('data-fuera'))
  clearTimeout(reloj)
  reloj = setTimeout(() => caja.setAttribute('data-fuera', ''), 4200)
}
