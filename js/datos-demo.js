const LLAVE = 'concurso-demo'
const FASES = ['subida', 'votacion', 'final', 'cerrado']
const PREMIOS = [
  { id: 'concepto', nombre: 'Mejor concepto' },
  { id: 'diseno', nombre: 'Mejor diseño' },
  { id: 'elaborado', nombre: 'Mejor trabajo elaborado' },
  { id: 'completo', nombre: 'Más completo' },
  { id: 'creatividad', nombre: 'Mejor creatividad' },
  { id: 'original', nombre: 'Más original' },
]
const USUARIOS = {
  1: { id: 'demo-1', nombre: 'Visitante demo', avatar: null, admin: false },
  admin: { id: 'demo-admin', nombre: 'Organizador demo', avatar: null, admin: true },
}
const TITULOS = [
  'Entidad de raíces', 'Linterna que se agota', 'Mapa del pantano', 'Trampa de cuerdas',
  'Guardián de piedra', 'Refugio en el árbol', 'Niebla que persigue',
]

export const demo = true

function nuevo() {
  const propuestas = TITULOS.map((titulo, i) => ({
    id: `d${i + 1}`,
    autorId: `autor-${i + 1}`,
    autorNombre: `Jugador demo ${i + 1}`,
    autorAvatar: null,
    titulo,
    descripcion: 'Propuesta de ejemplo para probar la web. Aquí va la explicación que escribe el autor: qué es, cómo funcionaría en el juego y por qué lo mejora.',
    imagenes: i % 3 === 0 ? [`demo/d${i + 1}.png`, `demo/d${(i + 1) % 7 + 1}.png`] : [`demo/d${i + 1}.png`],
    enlace: i === 1 ? 'https://www.roblox.com/' : null,
    categoria: null,
    estado: i === 6 ? 'pendiente' : 'aprobada',
    motivo: null,
    creada: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
  }))
  const votos = []
  PREMIOS.forEach((pm, a) => {
    propuestas.slice(0, 6).forEach((p, b) => {
      const n = (a * 7 + b * 5) % 9
      for (let k = 0; k < n; k++) votos.push({ quien: `bot-${a}-${b}-${k}`, premio: pm.id, ronda: 1, propuestaId: p.id })
    })
  })
  return { fase: 'votacion', propuestas, votos, finalistas: [], quien: null }
}

function lee() {
  try {
    return JSON.parse(localStorage.getItem(LLAVE)) || nuevo()
  } catch {
    return nuevo()
  }
}

let m = lee()
const guarda = () => localStorage.setItem(LLAVE, JSON.stringify(m))

function cuenta(id, premio, ronda) {
  return m.votos.filter(v => v.propuestaId === id && v.premio === premio && v.ronda === ronda).length
}

function eligeFinalistas() {
  m.finalistas = PREMIOS.flatMap(pm =>
    m.propuestas
      .filter(p => p.estado === 'aprobada')
      .sort((a, b) => cuenta(b.id, pm.id, 1) - cuenta(a.id, pm.id, 1) || a.creada.localeCompare(b.creada))
      .slice(0, 4)
      .map(p => ({ premio: pm.id, propuestaId: p.id })))
}

const q = new URLSearchParams(location.search)
if (q.has('limpio')) m = nuevo()
if (q.has('yo')) m.quien = q.get('yo') === '0' ? null : q.get('yo')
if (FASES.includes(q.get('fase'))) {
  m.fase = q.get('fase')
  if (m.fase === 'final' || m.fase === 'cerrado') {
    eligeFinalistas()
    if (!m.votos.some(v => v.ronda === 2)) {
      m.finalistas.forEach((f, i) => {
        for (let k = 0; k < (i * 3) % 7 + 1; k++) m.votos.push({ quien: `final-${i}-${k}`, premio: f.premio, ronda: 2, propuestaId: f.propuestaId })
      })
    }
  }
}
guarda()

const ronda = () => m.fase === 'final' || m.fase === 'cerrado' ? 2 : 1
const copia = x => JSON.parse(JSON.stringify(x))

export const yo = async () => USUARIOS[m.quien] || null
export async function entrar() {
  m.quien = '1'
  guarda()
  location.reload()
}
export async function salir() {
  m.quien = null
  guarda()
}
export const estado = async () => ({ fase: m.fase, eligenCategoria: false, maxPorPersona: 3, votoPropio: false })
export const premios = async () => copia(PREMIOS)
export const propuestas = async () => copia(m.propuestas.filter(p => p.estado === 'aprobada'))
export const todas = async () => copia(m.propuestas).reverse()
export async function mias() {
  const u = await yo()
  return u ? copia(m.propuestas.filter(p => p.autorId === u.id)).reverse() : []
}
export async function conteos() {
  const mapa = new Map()
  for (const v of m.votos) {
    const k = `${v.propuestaId}|${v.premio}|${v.ronda}`
    mapa.set(k, (mapa.get(k) || 0) + 1)
  }
  return [...mapa].map(([k, votos]) => {
    const [propuestaId, premio, r] = k.split('|')
    return { propuestaId, premio, ronda: Number(r), votos }
  })
}
export const finalistas = async () => copia(m.finalistas)
export async function misVotos() {
  const u = await yo()
  return u ? copia(m.votos.filter(v => v.quien === u.id)) : []
}

export async function votar(propuestaId, premio) {
  const u = await yo()
  if (!u) throw new Error('Entra con Discord para votar')
  if (m.fase !== 'votacion' && m.fase !== 'final') throw new Error('La votación no está abierta')
  const p = m.propuestas.find(x => x.id === propuestaId)
  if (p.autorId === u.id) throw new Error('No puedes votar tu propia propuesta')
  m.votos = m.votos.filter(v => !(v.quien === u.id && v.premio === premio && v.ronda === ronda()))
  m.votos.push({ quien: u.id, premio, ronda: ronda(), propuestaId })
  guarda()
}

export async function quitarVoto(premio) {
  const u = await yo()
  m.votos = m.votos.filter(v => !(v.quien === u.id && v.premio === premio && v.ronda === ronda()))
  guarda()
}

export async function enviar({ titulo, descripcion, archivos, enlace }) {
  const u = await yo()
  if (!u) throw new Error('Entra con Discord para subir una propuesta')
  if (m.fase !== 'subida') throw new Error('Ya no se aceptan propuestas')
  if (m.propuestas.filter(p => p.autorId === u.id && p.estado !== 'rechazada').length >= 3) throw new Error('Ya enviaste el máximo de 3 propuestas')
  m.propuestas.push({
    id: `d${Date.now()}`,
    autorId: u.id,
    autorNombre: u.nombre,
    autorAvatar: null,
    titulo,
    descripcion,
    imagenes: archivos.map((_, i) => `demo/d${i % 7 + 1}.png`),
    enlace: enlace || null,
    categoria: null,
    estado: 'pendiente',
    motivo: null,
    creada: new Date().toISOString(),
  })
  guarda()
}

export async function moderar(id, nuevoEstado, motivo) {
  const p = m.propuestas.find(x => x.id === id)
  p.estado = nuevoEstado
  p.motivo = motivo || null
  if (nuevoEstado !== 'aprobada') m.votos = m.votos.filter(v => v.propuestaId !== id)
  guarda()
}

export async function cambiarFase(fase) {
  m.fase = fase
  if (fase === 'final') eligeFinalistas()
  guarda()
}

export function escucha() {}
