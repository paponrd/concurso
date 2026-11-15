import { textos as t } from '../config/textos.js'
import { datos } from './datos.js'
import { $, FASES, crea, foto, pinta, cabecera, aviso } from './comun.js'

const a = t.panel
let estado, premios, lista, conteos

const votosDe = (id, premio, ronda) => conteos.find(c => c.propuestaId === id && c.premio === premio && c.ronda === ronda)?.votos || 0

function pintaFases() {
  $('#fases').replaceChildren(...FASES.map(f => crea('button', {
    clase: 'boton chico' + (f === estado.fase ? '' : ' suave'), type: 'button',
    'aria-pressed': String(f === estado.fase),
    texto: f === estado.fase ? t.etapas[f].corto : `${a.pasarA} ${t.etapas[f].corto}`,
    alClick: async () => {
      if (f === estado.fase || !confirm(a.confirmar(t.etapas[f].corto))) return
      try {
        await datos.cambiarFase(f)
        await carga()
      } catch (err) {
        aviso(err.message)
      }
    },
  })))
}

async function modera(p, nuevo, motivo) {
  try {
    await datos.moderar(p.id, nuevo, motivo)
    await carga()
  } catch (err) {
    aviso(err.message)
  }
}

function fila(p, conAcciones) {
  const motivo = crea('input', { type: 'text', 'aria-label': a.motivo, placeholder: a.motivo, value: p.motivo || '' })
  const resumen = premios
    .map(pm => [pm.nombre, votosDe(p.id, pm.id, 1), votosDe(p.id, pm.id, 2)])
    .filter(([, r1, r2]) => r1 || r2)
    .map(([nombre, r1, r2]) => `${nombre}: ${r1}${r2 ? ` + ${r2} en la final` : ''}`)
    .join(' · ')
  return crea('li', { clase: 'fila' },
    crea('a', { href: p.imagenes[0], target: '_blank', rel: 'noopener' }, foto(p.imagenes[0], a.abrirImagen)),
    crea('div', { clase: 'fila-texto' },
      crea('h3', { texto: p.titulo }),
      crea('p', {}, crea('span', { clase: 'marca-estado', 'data-estado': p.estado, texto: t.subir.estados[p.estado] }), ` · ${p.autorNombre} (${p.autorId})`),
      crea('p', { clase: 'descripcion', texto: p.descripcion }),
      crea('p', { clase: 'fotos-fila' },
        p.imagenes.map((src, i) => crea('a', { href: src, target: '_blank', rel: 'noopener', texto: `Imagen ${i + 1}` })),
        p.enlace ? crea('a', { href: p.enlace, target: '_blank', rel: 'noopener noreferrer', texto: t.verEnlace }) : null),
      resumen ? crea('p', { clase: 'descripcion', texto: resumen }) : null,
      conAcciones || p.estado !== 'pendiente' ? crea('div', { clase: 'fila-acciones' },
        p.estado === 'aprobada' ? null : crea('button', { clase: 'boton chico', type: 'button', texto: a.aprobar, alClick: () => modera(p, 'aprobada', '') }),
        p.estado === 'rechazada' ? null : motivo,
        p.estado === 'rechazada' ? null : crea('button', { clase: 'boton chico linea', type: 'button', texto: a.rechazar, alClick: () => modera(p, 'rechazada', motivo.value) })) : null))
}

function descarga() {
  const filas = lista.map(p => ({
    titulo: p.titulo,
    autor: p.autorNombre,
    discord_id: p.autorId,
    estado: p.estado,
    descripcion: p.descripcion,
    imagenes: p.imagenes,
    enlace: p.enlace,
    votos: Object.fromEntries(premios.map(pm => [pm.nombre, { ronda1: votosDe(p.id, pm.id, 1), final: votosDe(p.id, pm.id, 2) }])),
  }))
  const enlace = crea('a', {
    href: URL.createObjectURL(new Blob([JSON.stringify(filas, null, 2)], { type: 'application/json' })),
    download: 'resultados-concurso.json',
  })
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

async function carga() {
  [estado, premios, lista, conteos] = await Promise.all([datos.estado(), datos.premios(), datos.todas(), datos.conteos()])
  pintaFases()
  const pendientes = lista.filter(p => p.estado === 'pendiente')
  $('#titulo-pendientes').textContent = `${a.pendientes} (${pendientes.length})`
  $('#pendientes').replaceChildren(...(pendientes.length ? pendientes.map(p => fila(p, true)) : [crea('li', { texto: a.sinPendientes })]))
  const resto = lista.filter(p => p.estado !== 'pendiente')
  $('#titulo-todas').textContent = `${a.todas} (${resto.length})`
  $('#todas').replaceChildren(...resto.map(p => fila(p, false)))
}

$('#descargar').addEventListener('click', descarga)

pinta()
try {
  const yo = await cabecera()
  if (!yo?.admin) {
    $('#sin-permiso').hidden = false
  } else {
    $('#panel').hidden = false
    await carga()
  }
} catch (err) {
  aviso(err.message)
}
