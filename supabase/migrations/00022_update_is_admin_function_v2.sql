CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND (p.role = 'admin'::public.user_role OR p.role = 'super_admin'::public.user_role)
  );
$function$;
