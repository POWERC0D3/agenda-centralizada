-- ─────────────────────────────────────────────────────────────────────────────
-- Tareas de la Agenda marcadas como hechas, por día: lo que marcas en el móvil aparece en el ordenador.
-- Las tareas de la Agenda se generan en la web (src/lib/tareas.ts) con un id estable ("entrega-…",
-- "dudas-PROG"…), así que basta con guardar ese id y el día: una fila = "esta tarea, este día, hecha".
-- Desmarcar = borrar la fila.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.tareas_hechas (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dia       date not null,
  tarea_id  text not null check (char_length(tarea_id) between 1 and 120),
  creado    timestamptz not null default now(),
  -- La clave primaria impide marcar dos veces la misma tarea el mismo día (y es el índice de la consulta típica)
  primary key (user_id, dia, tarea_id)
);

alter table public.tareas_hechas enable row level security;

create policy "ver mis tareas hechas" on public.tareas_hechas
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "marcar mis tareas" on public.tareas_hechas
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "desmarcar mis tareas" on public.tareas_hechas
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Sin UPDATE: una marca no se edita, se pone o se quita
grant select, insert, delete on public.tareas_hechas to authenticated;
revoke all on public.tareas_hechas from anon;
