-- ─────────────────────────────────────────────────────────────────────────────
-- Abrir una tarea del Moodle del centro ya con la sesión iniciada (inicio de sesión automático).
--
-- Moodle tiene un mecanismo oficial para eso, el que usa su app móvil en "Abrir en el navegador":
-- con el token y una segunda clave, la `privatetoken` (la da token.php al conectar), se pide una
-- clave de un solo uso (tool_mobile_get_autologin_key) que deja al navegador dentro y en la tarea.
-- La privatetoken se guarda CIFRADA, igual que el token. El navegador no la puede pedir: la columna
-- no está en los permisos de columna de `authenticated` (service_role tiene la tabla entera).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conexiones_moodle add column privatetoken_cifrado text;
