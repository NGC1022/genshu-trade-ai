-- Grant admins full access to notes
CREATE POLICY "Admins have full access to notes" ON notes
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Grant admins full access to note_comments
CREATE POLICY "Admins have full access to note_comments" ON note_comments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Check if note_reports and comment_reports need admin access policies
-- Assuming admins should be able to manage reports.
CREATE POLICY "Admins have full access to note_reports" ON note_reports
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins have full access to comment_reports" ON comment_reports
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Profiles policies might also need admin access for Super Admin
CREATE POLICY "Admins have full access to profiles_v2" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
