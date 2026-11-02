-- ─────────────────────────────────────────────────────────────────────────────
-- Perfil de cada alumno: lo que configura en Ajustes, para tenerlo igual en todos sus dispositivos.
-- Una fila por usuario (la clave primaria ES el usuario). Se crea la primera vez que inicia sesión
-- y se actualiza cada vez que cambia algo en Ajustes.
--
-- Los valores permitidos son los mismos que valida la web (src/lib/grupos.ts): si alguien escribiese
-- a mano en la API un ciclo inventado, la base de datos lo rechaza.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.perfiles (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,

  -- Tu grupo
  ciclo             text not null default 'DAW' check (ciclo in ('DAW', 'DAM')),
  curso             text not null default '1º'  check (curso in ('1º', '2º')),
  letra             text not null default 'A'   check (letra in ('A', 'B')),

  -- Módulos que no cursas (ids de src/data/asignaturas.json). Un array de Postgres: no hace falta
  -- otra tabla para una lista corta que siempre se lee y se escribe entera
  modulos_excluidos text[] not null default '{}' check (cardinality(modulos_excluidos) <= 50),

  -- Sonido. El volumen va en tanto por cien (entero): sin decimales que redondear entre JavaScript y Postgres
  sonido_activo     boolean not null default true,
  volumen           smallint not null default 40 check (volumen between 0 and 100),

  actualizado       timestamptz not null default now()
);

-- `actualizado` se pone solo en cada UPDATE (reutiliza la función de la migración de entregas)
create trigger perfiles_actualizado
  before update on public.perfiles
  for each row execute function public.tocar_actualizado();

-- ── RLS: cada uno, solo su perfil ─────────────────────────────────────────────
alter table public.perfiles enable row level security;

create policy "ver mi perfil" on public.perfiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "crear mi perfil" on public.perfiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "editar mi perfil" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin política de DELETE: el perfil desaparece solo al borrar el usuario (on delete cascade)

grant select, insert, update on public.perfiles to authenticated;
revoke all on public.perfiles from anon;
