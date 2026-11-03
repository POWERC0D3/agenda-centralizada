-- Tareas añadidas a mano (origen = 'manual'): de qué plataforma son ("Teams"…), para su etiqueta en la Agenda.
-- `authenticated` ya tiene permisos de tabla sobre entregas (select, insert, update, delete): la columna nueva entra en ellos.
alter table public.entregas
  add column plataforma text check (plataforma is null or char_length(plataforma) between 1 and 40);
