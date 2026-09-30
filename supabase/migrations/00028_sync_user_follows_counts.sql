-- 创建或替换更新计数的函数
CREATE OR REPLACE FUNCTION public.handle_user_follow_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- 增加关注者的 following_count
        UPDATE public.profiles 
        SET following_count = following_count + 1 
        WHERE id = NEW.follower_id;
        
        -- 增加被关注者的 followers_count
        UPDATE public.profiles 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.following_id;
    ELSIF (TG_OP = 'DELETE') THEN
        -- 减少关注者的 following_count
        UPDATE public.profiles 
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = OLD.follower_id;
        
        -- 减少被关注者的 followers_count
        UPDATE public.profiles 
        SET followers_count = GREATEST(0, followers_count - 1)
        WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_user_follow_change ON public.user_follows;

-- 创建新触发器
CREATE TRIGGER on_user_follow_change
AFTER INSERT OR DELETE ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.handle_user_follow_change();

-- 初始化现有计数
UPDATE public.profiles p
SET 
    following_count = (SELECT count(*) FROM public.user_follows WHERE follower_id = p.id),
    followers_count = (SELECT count(*) FROM public.user_follows WHERE following_id = p.id);
