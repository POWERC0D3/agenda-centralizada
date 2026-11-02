// Cifrado simétrico AES-256-GCM con la Web Crypto API (la misma del navegador, también en Deno).
// La clave vive en los secretos de las Edge Functions (CLAVE_CIFRADO, 32 bytes en base64):
// una copia de la base de datos sin esa clave no sirve para leer los tokens.
// Formato guardado: "v1:<iv en base64>:<texto cifrado en base64>". El "v1" permite cambiar de método en el futuro.

const aBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const deBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

let clave: Promise<CryptoKey> | null = null
function laClave(): Promise<CryptoKey> {
  const b64 = Deno.env.get('CLAVE_CIFRADO')
  if (!b64) throw new Error('Falta el secreto CLAVE_CIFRADO')
  clave ??= crypto.subtle.importKey('raw', deBase64(b64), 'AES-GCM', false, ['encrypt', 'decrypt'])
  return clave
}

export async function cifrar(texto: string): Promise<string> {
  // GCM exige un IV (vector de inicialización) distinto en cada cifrado: 12 bytes aleatorios
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await laClave(), new TextEncoder().encode(texto)))
  return `v1:${aBase64(iv)}:${aBase64(cifrado)}`
}

export async function descifrar(guardado: string): Promise<string> {
  const [version, iv, datos] = guardado.split(':')
  if (version !== 'v1' || !iv || !datos) throw new Error('Formato de cifrado desconocido')
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, await laClave(), deBase64(datos))
  return new TextDecoder().decode(claro)
}
