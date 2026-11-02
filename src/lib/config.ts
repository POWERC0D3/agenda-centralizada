// Valores de configuración en un solo sitio (como un application.properties).

/** Web del centro: destino por defecto de los enlaces externos */
export const URL_CENTRO = 'https://alojaweb.educastur.es/web/iesmontenaranco'

/** La web madre (alvaro.cloud): el tejado del logo lleva a ella */
export const URL_ORIGEN = 'https://alvaro.cloud'

// Supabase (backend: cuentas y entregas). Las dos son PÚBLICAS por diseño: van en el JavaScript de la web.
// Quién puede leer o escribir cada fila lo decide la base de datos (RLS), no esconder la clave.
// La clave secreta (service_role) no aparece nunca en el frontend ni en este repo
export const SUPABASE_URL = 'https://zmjhnkqsulyyalvxoubn.supabase.co'
export const SUPABASE_CLAVE_PUBLICA = 'sb_publishable_RGmgTK7xr4WLQVkYvPTGSg_W-P6HzwG'
