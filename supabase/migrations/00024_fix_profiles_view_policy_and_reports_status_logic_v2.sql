-- Allow anyone to view any profile (at least username, avatar, bio)
DROP POLICY IF EXISTS "Anyone can view any profile" ON public.profiles;
CREATE POLICY "Anyone can view any profile" ON public.profiles
  FOR SELECT TO public USING (true);

-- Ensure note_reports and comment_reports have proper policies for admins
DROP POLICY IF EXISTS "Admins have full access to note_reports" ON public.note_reports;
CREATE POLICY "Admins have full access to note_reports" ON public.note_reports
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to comment_reports" ON public.comment_reports;
CREATE POLICY "Admins have full access to comment_reports" ON public.comment_reports
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
