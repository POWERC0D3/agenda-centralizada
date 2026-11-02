-- ─────────────────────────────────────────────────────────────────────────────
-- Conexiones con Moodle (ver docs/INTEGRACIONES.md).
--
-- conexiones_moodle: un Moodle conectado por fila. El TOKEN va cifrado (AES-GCM) y solo lo descifran
--   las Edge Functions, que tienen la clave en sus secretos. El alumno ve el estado de su conexión
--   (nombre, usuario, última sincronización, último error), pero la columna del token NO: los permisos
--   se dan columna a columna.
-- cursos_moodle: los cursos del alumno en ese Moodle y a qué asignatura de la web corresponde cada uno
--   (para el color y el nombre). La sincronización lo adivina por el nombre del curso.
--
-- Solo las Edge Functions (rol service_role) crean conexiones y escriben entregas de Moodle. El navegador
-- lee, y puede desconectar (borrar su conexión: se van con ella sus cursos y sus entregas de Moodle).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.conexiones_moodle (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  sitio            text not null check (sitio in ('centro', 'misaulas')), -- identificador fijo, nunca una URL libre
  nombre           text not null,          -- nombre del sitio según Moodle (sitename)
  usuario          text not null,          -- usuario de Moodle, para mostrarlo
  moodle_user_id   integer,
  metodo           text not null default 'token' check (metodo in ('token', 'sesion')),
  token_cifrado    text,                   -- método A. Solo lo leen las Edge Functions
  password_cifrada text,                   -- método B (más adelante). Solo lo leen las Edge Functions
  ultimo_sync      timestamptz,
  ultimo_error     text,
  creado           timestamptz not null default now(),
  unique (user_id, sitio)                  -- un alumno, una conexión por sitio
);

create table public.cursos_moodle (
  conexion_id   uuid not null references public.conexiones_moodle (id) on delete cascade,
  curso_id      integer not null,          -- id del curso en Moodle
  nombre        text not null,
  asignatura_id text,                      -- id de src/data/asignaturas.json, o null si no se sabe
  primary key (conexion_id, curso_id)
);

-- La clave foránea que se dejó pendiente en entregas: al desconectar, se van sus entregas de Moodle
alter table public.entregas
  add constraint entregas_conexion_fk foreign key (conexion_id) references public.conexiones_moodle (id) on delete cascade;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.conexiones_moodle enable row level security;
alter table public.cursos_moodle enable row level security;

create policy "ver mis conexiones" on public.conexiones_moodle
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "desconectar mis conexiones" on public.conexiones_moodle
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Los cursos no tienen user_id: son "míos" si su conexión es mía
create policy "ver mis cursos" on public.cursos_moodle
  for select to authenticated
  using (exists (select 1 from public.conexiones_moodle c where c.id = conexion_id and c.user_id = (select auth.uid())));

create policy "corregir la asignatura de mis cursos" on public.cursos_moodle
  for update to authenticated
  using (exists (select 1 from public.conexiones_moodle c where c.id = conexion_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.conexiones_moodle c where c.id = conexion_id and c.user_id = (select auth.uid())));

-- ── Permisos ─────────────────────────────────────────────────────────────────
-- El navegador: columna a columna. token_cifrado y password_cifrada NO están: ni siquiera con RLS se podrían leer
grant select (id, sitio, nombre, usuario, metodo, ultimo_sync, ultimo_error, creado) on public.conexiones_moodle to authenticated;
grant delete on public.conexiones_moodle to authenticated;
grant select on public.cursos_moodle to authenticated;
grant update (asignatura_id) on public.cursos_moodle to authenticated;
revoke all on public.conexiones_moodle, public.cursos_moodle from anon;

-- Las Edge Functions usan el rol service_role (se salta el RLS). Como el proyecto no da permisos
-- automáticos a las tablas nuevas, se los damos explícitamente, también sobre entregas
grant select, insert, update, delete on public.conexiones_moodle, public.cursos_moodle, public.entregas to service_role;
