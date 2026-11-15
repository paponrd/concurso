import { textos as t } from '../config/textos.js'
import { evento as cfg } from '../config/evento.js'
import { datos } from './datos.js'
import { $, crea, foto, pinta, cabecera, aviso } from './comun.js'

const s = t.subir
let archivos = []

function error(campo, mensaje) {
  $(`#error-${campo}`).textContent = mensaje || ''
  $(`#${campo}`).setAttribute('aria-invalid', String(Boolean(mensaje)))
  return !mensaje
}

function pintaPrevias() {
  $('#previas').replaceChildren(...archivos.map((archivo, i) => crea('div', { clase: 'previa' },
    crea('img', { src: URL.createObjectURL(archivo), alt: archivo.name }),
    crea('button', {
      type: 'button', 'aria-label': `${s.quitar}: ${archivo.name}`,
      alClick: () => {
        archivos.splice(i, 1)
        pintaPrevias()
      },
    }))))
}

function revisa() {
  const titulo = $('#titulo').value.trim()
  const descripcion = $('#descripcion').value.trim()
  const enlace = $('#enlace').value.trim()
  const bien = [
    error('titulo', titulo.length < 3 ? s.faltaTitulo : ''),
    error('descripcion', descripcion.length < 10 ? s.faltaDescripcion : ''),
    error('imagenes', archivos.length === 0 ? s.faltaImagen : ''),
    error('enlace', enlace && !enlace.startsWith('https://') ? s.malEnlace : ''),
  ]
  if (bien.includes(false)) {
    $('[aria-invalid="true"]').focus()
    return null
  }
  return { titulo, descripcion, enlace, archivos, categoria: $('#categoria').value || null }
}

async function pintaMias() {
  const lista = await datos.mias()
  $('#mias').hidden = false
  if (!lista.length) {
    $('#lista-mias').replaceChildren(crea('li', { texto: s.sinMias }))
    return
  }
  $('#lista-mias').replaceChildren(...lista.map(p => crea('li', { clase: 'fila' },
    foto(p.imagenes[0], ''),
    crea('div', { clase: 'fila-texto' },
      crea('h3', { texto: p.titulo }),
      crea('p', { clase: 'marca-estado', 'data-estado': p.estado, texto: s.estados[p.estado] }),
      p.motivo ? crea('p', { clase: 'descripcion', texto: p.motivo }) : null))))
}

$('#imagenes').addEventListener('change', ev => {
  archivos = [...archivos, ...ev.target.files]
  ev.target.value = ''
  if (archivos.length > cfg.imagenesMax) {
    archivos = archivos.slice(0, cfg.imagenesMax)
    error('imagenes', s.muchasImagenes(cfg.imagenesMax))
  } else {
    error('imagenes', '')
  }
  pintaPrevias()
})

$('#formulario').addEventListener('submit', async ev => {
  ev.preventDefault()
  const propuesta = revisa()
  if (!propuesta) return
  const boton = $('#enviar')
  boton.disabled = true
  boton.textContent = s.enviando
  try {
    await datos.enviar(propuesta)
    ev.target.reset()
    archivos = []
    pintaPrevias()
    aviso(s.enviada)
    await pintaMias()
  } catch (err) {
    aviso(err.message)
  }
  boton.disabled = false
  boton.textContent = s.enviar
})

pinta()
$('#ayuda-imagenes').textContent = s.ayudaImagenes(cfg.imagenesMax)

try {
  const yo = await cabecera()
  const [estado, premios] = await Promise.all([datos.estado(), datos.premios()])
  if (!yo) {
    $('#entrada').textContent = s.sinSesion
    $('#entrada').after(crea('p', { style: 'margin-top:1.5rem' },
      crea('button', { clase: 'boton', type: 'button', texto: t.entrar, alClick: () => datos.entrar() })))
  } else {
    if (estado.fase === 'subida') {
      $('#formulario').hidden = false
      if (estado.eligenCategoria) {
        $('#campo-categoria').hidden = false
        $('#categoria').replaceChildren(...premios.map(pm => crea('option', { value: pm.id, texto: pm.nombre })))
      }
    } else {
      $('#entrada').textContent = s.cerrado
    }
    await pintaMias()
  }
} catch (err) {
  aviso(err.message)
}
