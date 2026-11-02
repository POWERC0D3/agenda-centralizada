-- ─────────────────────────────────────────────────────────────────────────────
-- Entregas (y exámenes) de cada alumno, vengan de donde vengan:
--   · 'manual': añadidas a mano desde la web (Teams, o cualquier plataforma sin integración)
--   · 'moodle': las traerá la sincronización automática (más adelante)
--
-- Seguridad: RLS (Row Level Security). La clave pública de Supabase va en el frontend y el repo es
-- público, así que cualquiera puede hablar con la API. Lo que impide ver datos ajenos son estas
-- políticas: la base de datos añade a CADA consulta un "WHERE user_id = <quien pregunta>" obligatorio.
-- (En Java sería como si el repositorio filtrase siempre por el usuario de la sesión, sin poder saltárselo.)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.entregas (
  id            uuid primary key default gen_random_uuid(),
  -- Dueño de la fila. Por defecto, el usuario que la inserta: el frontend no tiene que enviarlo
  -- (ni podría mentir: la política de insert lo comprueba)
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,

  origen        text not null default 'manual' check (origen in ('manual', 'moodle')),
  tipo          text not null default 'entrega' check (tipo in ('entrega', 'examen')),

  -- Solo para las que vienen de una integración: de qué conexión y con qué id en el sitio de origen
  -- (la clave foránea a conexiones_moodle se añadirá cuando exista esa tabla)
  conexion_id   uuid,
  id_externo    text,

  titulo        text not null check (char_length(titulo) between 1 and 200),
  curso         text,                                   -- nombre del curso en la plataforma de origen
  asignatura_id text,                                   -- id de src/data/asignaturas.json (color y nombre en la web)
  fecha         timestamptz not null,                   -- fecha y hora límite
  url           text check (url is null or url ~* '^https?://'),

  hecha         boolean not null default false,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now(),

  -- Una misma tarea de Moodle no se duplica al sincronizar. En las manuales id_externo es null,
  -- y en Postgres dos null no chocan en un unique: se pueden añadir todas las que se quiera
  unique (user_id, origen, id_externo)
);

-- La consulta típica: "mis entregas, por fecha"
create index entregas_usuario_fecha on public.entregas (user_id, fecha);

-- `actualizado` se pone solo en cada UPDATE (un trigger: código que la base de datos ejecuta ante un evento,
-- parecido a un @PreUpdate de JPA)
create function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

create trigger entregas_actualizado
  before update on public.entregas
  for each row execute function public.tocar_actualizado();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.entregas enable row level security;

-- Solo usuarios con sesión iniciada; cada uno, únicamente sus filas.
-- `(select auth.uid())` entre paréntesis: Postgres lo calcula una vez por consulta y no una vez por fila
create policy "ver mis entregas" on public.entregas
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "añadir mis entregas" on public.entregas
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "editar mis entregas" on public.entregas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "borrar mis entregas" on public.entregas
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Permisos de la API: solo los usuarios con sesión (rol `authenticated`). Los anónimos, nada
grant select, insert, update, delete on public.entregas to authenticated;
revoke all on public.entregas from anon;
