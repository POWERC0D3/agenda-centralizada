-- Cuenta de prueba del README (test@admin.is). Su contraseña es pública, así que NO puede añadir entregas:
-- así nadie deja textos o enlaces a quien entre después.
-- (Que no se pueda borrar ni conectar plataformas lo comprueban las Edge Functions: _shared/demo.ts)
--
-- Se rehace la política de inserción con una condición más: el correo del token de la sesión
-- (auth.jwt() ->> 'email') no es el de la cuenta de prueba. Las Edge Functions usan service_role,
-- que se salta el RLS, así que la sincronización de Moodle no se ve afectada.
drop policy "añadir mis entregas" on public.entregas;

create policy "añadir mis entregas" on public.entregas
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'email') is distinct from 'test@admin.is'
  );
