-- ─────────────────────────────────────────────────────────────────────────────
-- Sincronización automática de Moodle cada 30 minutos.
--
-- pg_cron (tareas programadas, como @Scheduled en Java) llama cada 30 min a la Edge Function
-- `sincronizar-todo` con pg_net (peticiones HTTP desde la base de datos).
--
-- Para que nadie más pueda dispararla, la llamada lleva un SECRETO que se genera aquí mismo, dentro
-- de la base de datos, y se guarda cifrado en Vault: no aparece en este archivo ni sale de Supabase.
-- La función lo comprueba pidiéndoselo a la base de datos (secreto_cron, solo para service_role).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 32 bytes aleatorios generados por Postgres (pgcrypto), guardados cifrados en Vault
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'cron_sincronizar',
  'Secreto con el que pg_cron llama a la Edge Function sincronizar-todo'
);

-- La Edge Function lee el secreto con esta función. SECURITY DEFINER: se ejecuta con los permisos de su dueño
-- (que sí puede leer Vault); por eso solo service_role puede llamarla, nunca el navegador
create function public.secreto_cron() returns text
language sql stable security definer set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_sincronizar' limit 1
$$;
revoke all on function public.secreto_cron() from public, anon, authenticated;
grant execute on function public.secreto_cron() to service_role;

-- Cada 30 minutos (en punto y y media)
select cron.schedule(
  'sincronizar-moodle',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://zmjhnkqsulyyalvxoubn.supabase.co/functions/v1/sincronizar-todo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secreto', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_sincronizar' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
