import { createClient } from 'npm:@supabase/supabase-js@2'

// El navegador llama a las funciones desde otro dominio (agenda.alvaro.cloud o localhost): CORS.
// Solo se aceptan esos orígenes; las cabeceras son las que añade supabase-js
const PERMITIDOS = ['https://agenda.alvaro.cloud', 'http://localhost:5173', 'http://localhost:4173']

export function cabeceras(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': PERMITIDOS.includes(origen) ? origen : PERMITIDOS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export const responder = (req: Request, cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cabeceras(req), 'Content-Type': 'application/json' } })

/** Cliente con el rol service_role: se salta el RLS. Solo existe aquí, en el servidor; nunca en el navegador. */
export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

/** El usuario que llama, sacado de su token (Authorization: Bearer …). null si no hay sesión válida. */
export async function quienLlama(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await admin().auth.getUser(token)
  return data.user?.id ?? null
}
