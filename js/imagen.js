const exporta = (lienzo, tipo) => new Promise(ok => lienzo.toBlob(ok, tipo, 0.84))

function sobreBlanco(lienzo) {
  const plano = document.createElement('canvas')
  plano.width = lienzo.width
  plano.height = lienzo.height
  const c = plano.getContext('2d')
  c.fillStyle = '#fff'
  c.fillRect(0, 0, plano.width, plano.height)
  c.drawImage(lienzo, 0, 0)
  return plano
}

export async function encoge(archivo, lado) {
  let mapa
  try {
    mapa = await createImageBitmap(archivo)
  } catch {
    throw new Error('No se pudo leer esa imagen. Prueba con una captura o un JPG.')
  }
  const escala = Math.min(1, lado / Math.max(mapa.width, mapa.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  lienzo.getContext('2d').drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()

  let salida = await exporta(lienzo, 'image/webp')
  if (salida?.type !== 'image/webp') salida = await exporta(sobreBlanco(lienzo), 'image/jpeg')
  if (!salida) throw new Error('No se pudo leer esa imagen')
  return salida
}
