import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { evento as cfg } from '../config/evento.js'
import { encoge } from './imagen.js'

const sb = createClient(cfg.supabaseUrl, cfg.supabaseClave)
const cubo = sb.storage.from('propuestas')
const urlDe = ruta => cubo.getPublicUrl(ruta).data.publicUrl

export const demo = false

async function pide(consulta) {
  const { data, error } = await consulta
  if (error) throw new Error(error.message)
  return data
}

function limpia(f) {
  return {
    id: f.id,
    autorId: f.autor_id,
    autorNombre: f.autor_nombre,
    autorAvatar: f.autor_avatar,
    titulo: f.titulo,
    descripcion: f.descripcion,
    imagenes: f.imagenes.map(urlDe),
    enlace: f.enlace,
    categoria: f.categoria,
    estado: f.estado,
    motivo: f.motivo,
    creada: f.creada,
  }
}

export async function yo() {
  const { data } = await sb.auth.getSession()
  const u = data.session?.user
  if (!u) return null
  const d = u.identities?.find(i => i.provider === 'discord')?.identity_data || u.user_metadata || {}
  return {
    id: d.sub || d.provider_id,
    nombre: d.custom_claims?.global_name || d.full_name || d.name || 'Tu cuenta',
    avatar: d.avatar_url || null,
    admin: await pide(sb.rpc('soy_admin')),
  }
}

export function entrar() {
  return sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: location.href.split('#')[0] } })
}

export async function salir() {
  await sb.auth.signOut()
}

export async function estado() {
  const f = await pide(sb.from('evento').select('*').single())
  return { fase: f.fase, eligenCategoria: f.eligen_categoria, maxPorPersona: f.max_por_persona, votoPropio: f.voto_propio }
}

export const premios = () => pide(sb.from('premios').select('id, nombre').order('orden'))

export async function propuestas() {
  return (await pide(sb.from('propuestas').select('*').eq('estado', 'aprobada').order('creada'))).map(limpia)
}

export async function mias() {
  const u = await yo()
  if (!u) return []
  return (await pide(sb.from('propuestas').select('*').eq('autor_id', u.id).order('creada', { ascending: false }))).map(limpia)
}

export async function todas() {
  return (await pide(sb.from('propuestas').select('*').order('creada', { ascending: false }))).map(limpia)
}

export async function conteos() {
  return (await pide(sb.from('conteo').select('*'))).map(c => ({ propuestaId: c.propuesta_id, premio: c.premio, ronda: c.ronda, votos: c.votos }))
}

export async function finalistas() {
  return (await pide(sb.from('finalistas').select('*'))).map(f => ({ premio: f.premio, propuestaId: f.propuesta_id }))
}

export async function misVotos() {
  return (await pide(sb.from('votos').select('premio, ronda, propuesta_id'))).map(v => ({ premio: v.premio, ronda: v.ronda, propuestaId: v.propuesta_id }))
}

export const votar = (propuestaId, premio) => pide(sb.rpc('votar', { p_propuesta: propuestaId, p_premio: premio }))
export const quitarVoto = premio => pide(sb.rpc('quitar_voto', { p_premio: premio }))
export const moderar = (id, nuevo, motivo) => pide(sb.rpc('moderar', { p_propuesta: id, p_estado: nuevo, p_motivo: motivo || null }))
export const cambiarFase = fase => pide(sb.rpc('cambiar_fase', { p_fase: fase }))

export async function enviar({ titulo, descripcion, archivos, enlace, categoria }) {
  const { data } = await sb.auth.getUser()
  const uid = data.user?.id
  if (!uid) throw new Error('Entra con Discord para subir una propuesta')
  const rutas = []
  try {
    for (const archivo of archivos) {
      const imagen = await encoge(archivo, cfg.ladoImagen)
      const ruta = `${uid}/${crypto.randomUUID()}.${imagen.type === 'image/webp' ? 'webp' : 'jpg'}`
      const { error } = await cubo.upload(ruta, imagen, { contentType: imagen.type, cacheControl: '31536000' })
      if (error) throw new Error(error.message)
      rutas.push(ruta)
    }
    return await pide(sb.rpc('enviar_propuesta', {
      p_titulo: titulo,
      p_descripcion: descripcion,
      p_imagenes: rutas,
      p_enlace: enlace || null,
      p_categoria: categoria || null,
    }))
  } catch (err) {
    if (rutas.length) await cubo.remove(rutas)
    throw err
  }
}

export function escucha(cb) {
  sb.channel('concurso').on('postgres_changes', { event: '*', schema: 'public' }, c => cb(c.table)).subscribe()
}
