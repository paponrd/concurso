export async function encoge(archivo, lado) {
  const mapa = await createImageBitmap(archivo)
  const escala = Math.min(1, lado / Math.max(mapa.width, mapa.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  lienzo.getContext('2d').drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()
  return new Promise((ok, mal) => {
    lienzo.toBlob(b => b ? ok(b) : mal(new Error('No se pudo leer esa imagen')), 'image/webp', 0.84)
  })
}
