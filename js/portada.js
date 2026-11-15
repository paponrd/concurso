import { textos as t } from '../config/textos.js'
import { datos } from './datos.js'
import { $, FASES, crea, foto, inicial, pinta, cabecera, aviso } from './comun.js'

const e = {
  yo: null,
  estado: null,
  premios: [],
  propuestas: [],
  conteos: new Map(),
  finalistas: new Map(),
  votos: new Map(),
  premio: null,
}

const ronda = () => e.estado.fase === 'final' || e.estado.fase === 'cerrado' ? 2 : 1
const votando = () => e.estado.fase === 'votacion' || e.estado.fase === 'final'
const cuenta = (id, premio = e.premio, r = ronda()) => e.conteos.get(`${id}|${premio}|${r}`) || 0

async function carga() {
  const [estado, premios, propuestas, finalistas] = await Promise.all([
    datos.estado(), datos.premios(), datos.propuestas(), datos.finalistas(),
  ])
  e.estado = estado
  e.premios = premios
  e.propuestas = propuestas
  e.finalistas = new Map()
  for (const f of finalistas) {
    if (!e.finalistas.has(f.premio)) e.finalistas.set(f.premio, new Set())
    e.finalistas.get(f.premio).add(f.propuestaId)
  }
  if (!premios.some(p => p.id === e.premio)) e.premio = premios[0]?.id || null
  await cargaVotos()
}

async function cargaVotos() {
  const [conteos, mios] = await Promise.all([datos.conteos(), e.yo ? datos.misVotos() : []])
  e.conteos = new Map(conteos.map(c => [`${c.propuestaId}|${c.premio}|${c.ronda}`, c.votos]))
  e.votos = new Map(mios.filter(v => v.ronda === ronda()).map(v => [v.premio, v.propuestaId]))
}

function visibles() {
  const fase = e.estado.fase
  let lista = e.propuestas
  if (fase === 'subida' && !e.estado.eligenCategoria) return lista
  if (e.estado.eligenCategoria) lista = lista.filter(p => p.categoria === e.premio)
  if (fase === 'final' || fase === 'cerrado') {
    const ids = e.finalistas.get(e.premio) || new Set()
    lista = lista.filter(p => ids.has(p.id))
  }
  if (fase === 'cerrado') {
    lista = [...lista].sort((a, b) =>
      cuenta(b.id) - cuenta(a.id) || cuenta(b.id, e.premio, 1) - cuenta(a.id, e.premio, 1) || a.creada.localeCompare(b.creada))
  }
  return lista
}

function pintaPortada() {
  const fase = e.estado.fase
  document.body.dataset.fase = fase
  $('#estado').textContent = t.etapas[fase].estado
  $('#cuenta').textContent = t.cuentaPropuestas(e.propuestas.length)

  const destino = fase === 'subida' ? 'subir.html' : '#propuestas'
  const botones = [crea('a', { clase: 'boton', href: destino, texto: t.accion[fase] })]
  if (fase === 'subida' && e.propuestas.length) botones.push(crea('a', { clase: 'boton linea', href: '#propuestas', texto: t.accionSecundaria }))
  $('#acciones').replaceChildren(...botones)

  const ultimas = e.propuestas.slice(-4).reverse()
  $('#ultimas').hidden = ultimas.length === 0
  $('#ultimas').replaceChildren(...ultimas.map(p => crea('img', { src: p.imagenes[0], alt: p.titulo, width: 72, height: 72 })))

  const actual = FASES.indexOf(fase)
  $('#etapas').replaceChildren(...FASES.map((f, i) => crea('li', {
    clase: i < actual ? 'hecha' : i === actual ? 'actual' : null,
    style: `--i:${i}`,
    'aria-current': i === actual ? 'step' : null,
    texto: t.etapas[f].corto,
  })))
}

function pintaFijos() {
  $('#premios-titulo').textContent = t.premiosTitulo(e.premios.length)
  $('#premios-texto').textContent = e.estado.eligenCategoria ? t.premiosTextoCategoria : t.premiosTexto
  $('#lista-premios').replaceChildren(...e.premios.map(pm => crea('li', {},
    crea('button', {
      type: 'button',
      alClick: () => {
        elige(pm.id)
        $('#propuestas').scrollIntoView()
      },
      texto: pm.nombre,
    }))))
  $('#pasos').replaceChildren(...t.pasos.map((p, i) => crea('li', {},
    crea('h3', { texto: p.titulo }),
    crea('p', { texto: p.texto }, i === 0 ? [' ', crea('a', { href: '#acceso', texto: t.pasoEnlace })] : null))))
  $('#acceso-listas').replaceChildren(...t.acceso.grupos.map(g => crea('div', {},
    crea('h3', { texto: g.titulo }),
    crea('ul', {}, g.puntos.map(p => crea('li', {}, crea('strong', { texto: p.titulo }), crea('span', { texto: p.texto })))))))
}

function pintaPestanas() {
  const caja = $('#pestanas')
  caja.hidden = e.estado.fase === 'subida' && !e.estado.eligenCategoria
  caja.replaceChildren(...e.premios.map(pm => crea('button', {
    type: 'button', role: 'tab', 'aria-selected': String(pm.id === e.premio), texto: pm.nombre,
    alClick: () => elige(pm.id),
  })))
}

function botonVoto(p) {
  const mio = e.votos.get(e.premio) === p.id
  return crea('button', {
    clase: 'boton chico', type: 'button', 'aria-pressed': String(mio), 'data-voto': p.id,
    texto: mio ? t.tuVoto : t.votar,
    alClick: () => vota(p),
  })
}

function filaVoto(p) {
  if (e.estado.fase === 'subida') return null
  return crea('div', { clase: 'ficha-voto' },
    votando() ? botonVoto(p) : crea('span'),
    crea('span', { clase: 'total', 'data-total': p.id, texto: t.votos(cuenta(p.id)) }))
}

function autor(p) {
  return crea('p', { clase: 'autor' },
    crea('img', { src: p.autorAvatar || inicial(p.autorNombre), alt: '', width: 22, height: 22, loading: 'lazy' }),
    crea('span', { texto: `${t.por} ${p.autorNombre}` }))
}

function ficha(p, i) {
  const cerrado = e.estado.fase === 'cerrado'
  return crea('article', { clase: 'ficha', 'data-id': p.id },
    crea('button', { clase: 'ficha-foto', type: 'button', 'aria-label': p.titulo, alClick: () => abre(p) },
      foto(p.imagenes[0], '', { width: 640, height: 480 })),
    crea('div', { clase: 'ficha-texto' },
      cerrado ? crea('p', { clase: 'puesto', texto: t.puesto[Math.min(i, 3)] }) : null,
      crea('h3', { texto: p.titulo }),
      autor(p)),
    filaVoto(p))
}

function pintaRejilla() {
  const fase = e.estado.fase
  const lista = visibles()
  $('#galeria-titulo').textContent = t.galeria[fase]
  const rejilla = $('#rejilla')
  rejilla.classList.toggle('podio', fase === 'cerrado')
  rejilla.replaceChildren(...lista.map(ficha))
  $('#vacio').hidden = lista.length > 0
  $('#vacio').textContent = t.vacio[fase]
}

function refrescaTotales() {
  for (const nodo of document.querySelectorAll('[data-total]')) {
    const nuevo = t.votos(cuenta(nodo.dataset.total))
    if (nodo.textContent === nuevo) continue
    nodo.textContent = nuevo
    nodo.classList.remove('sube')
    void nodo.offsetWidth
    nodo.classList.add('sube')
  }
  for (const boton of document.querySelectorAll('[data-voto]')) {
    const mio = e.votos.get(e.premio) === boton.dataset.voto
    boton.setAttribute('aria-pressed', String(mio))
    boton.textContent = mio ? t.tuVoto : t.votar
  }
}

function elige(premio) {
  e.premio = premio
  pintaPestanas()
  pintaRejilla()
}

async function vota(p) {
  if (!e.yo) return datos.entrar()
  const mio = e.votos.get(e.premio) === p.id
  try {
    if (mio) await datos.quitarVoto(e.premio)
    else await datos.votar(p.id, e.premio)
    await cargaVotos()
    refrescaTotales()
  } catch (err) {
    aviso(err.message)
  }
}

function abre(p) {
  const caja = $('#detalle')
  const grande = crea('img', { src: p.imagenes[0], alt: p.titulo })
  const minis = p.imagenes.length < 2 ? null : crea('div', { clase: 'minis' }, p.imagenes.map((src, i) => crea('button', {
    type: 'button', 'aria-current': String(i === 0), 'aria-label': `${p.titulo}, imagen ${i + 1}`,
    alClick: ev => {
      grande.src = src
      for (const b of ev.currentTarget.parentElement.children) b.setAttribute('aria-current', String(b === ev.currentTarget))
    },
  }, crea('img', { src, alt: '' }))))

  caja.replaceChildren(
    crea('button', { clase: 'boton chico suave cierra', type: 'button', texto: t.cerrar, alClick: () => caja.close() }),
    crea('div', { clase: 'detalle-caja' },
      crea('div', { clase: 'detalle-fotos' }, grande, minis),
      crea('div', { clase: 'detalle-texto' },
        crea('h2', { texto: p.titulo }),
        autor(p),
        crea('p', { clase: 'descripcion', texto: p.descripcion }),
        p.enlace ? crea('p', {}, crea('a', { href: p.enlace, target: '_blank', rel: 'noopener noreferrer', texto: t.verEnlace })) : null,
        e.estado.fase === 'subida' ? null : crea('div', { clase: 'detalle-pie' },
          votando() ? botonVoto(p) : null,
          crea('span', { clase: 'total', 'data-total': p.id, texto: t.votos(cuenta(p.id)) })))))
  caja.showModal()
}

$('#detalle').addEventListener('click', ev => {
  if (ev.target === ev.currentTarget) ev.currentTarget.close()
})

function pintaTodo() {
  pintaPortada()
  pintaFijos()
  pintaPestanas()
  pintaRejilla()
}

pinta()
try {
  e.yo = await cabecera()
  await carga()
  pintaTodo()
} catch (err) {
  aviso(err.message)
}

let pendiente
datos.escucha(tabla => {
  clearTimeout(pendiente)
  pendiente = setTimeout(async () => {
    try {
      if (tabla === 'conteo') {
        await cargaVotos()
        refrescaTotales()
      } else {
        await carga()
        pintaTodo()
      }
    } catch {}
  }, tabla === 'conteo' ? 250 : 600)
})
