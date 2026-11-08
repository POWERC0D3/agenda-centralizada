// Valores de configuración en un solo sitio (como un application.properties).

/** Web del centro: destino por defecto de los enlaces externos */
export const URL_CENTRO = 'https://alojaweb.educastur.es/web/iesmontenaranco'

/**
 * Calendario compartido con el profesorado. Vive FUERA de esta web (Microsoft 365): los permisos se gestionan allí.
 * Por ahora lleva al calendario de Outlook; para un Excel o un calendario concreto, pega aquí su enlace de "Compartir"
 */
export const URL_CALENDARIO_COMPARTIDO = 'https://outlook.office.com/calendar/'

/** El código de esta web en GitHub: la puerta izquierda del logo lleva a él */
export const URL_REPO = 'https://github.com/POWERC0D3/agenda-centralizada'

/** La web madre (alvaro.cloud): el tejado del logo lleva a ella */
export const URL_ORIGEN = 'https://alvaro.cloud'

// Supabase (backend: cuentas y entregas). Las dos son PÚBLICAS por diseño: van en el JavaScript de la web.
// Quién puede leer o escribir cada fila lo decide la base de datos (RLS), no esconder la clave.
// La clave secreta (service_role) no aparece nunca en el frontend ni en este repo
export const SUPABASE_URL = 'https://zmjhnkqsulyyalvxoubn.supabase.co'
export const SUPABASE_CLAVE_PUBLICA = 'sb_publishable_RGmgTK7xr4WLQVkYvPTGSg_W-P6HzwG'
