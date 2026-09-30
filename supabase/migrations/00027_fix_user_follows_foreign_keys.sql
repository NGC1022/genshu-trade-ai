ALTER TABLE public.user_follows 
ADD CONSTRAINT fk_follower FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_following FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 确保 RLS 策略存在，允许任何人查看关注关系（或者根据需求调整）
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_follows' AND policyname = 'Anyone can view follow relations'
    ) THEN
        CREATE POLICY "Anyone can view follow relations" ON public.user_follows
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_follows' AND policyname = 'Users can follow others'
    ) THEN
        CREATE POLICY "Users can follow others" ON public.user_follows
            FOR INSERT WITH CHECK (auth.uid() = follower_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_follows' AND policyname = 'Users can unfollow others'
    ) THEN
        CREATE POLICY "Users can unfollow others" ON public.user_follows
            FOR DELETE USING (auth.uid() = follower_id);
    END IF;
END $$;
