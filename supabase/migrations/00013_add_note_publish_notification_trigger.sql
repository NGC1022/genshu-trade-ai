-- 创建函数：发布笔记时通知追踪者
CREATE OR REPLACE FUNCTION notify_followers_on_new_note()
RETURNS TRIGGER AS $$
DECLARE
  follower_record RECORD;
  author_name text;
BEGIN
  -- 获取作者用户名
  SELECT username INTO author_name FROM profiles WHERE id = NEW.user_id;
  
  -- 为每个追踪者创建消息通知
  FOR follower_record IN 
    SELECT follower_id FROM user_follows WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO messages (user_id, type, title, content, related_note_id, is_read)
    VALUES (
      follower_record.follower_id,
      'new_note_from_following',
      '追踪动态',
      '您追踪的用户 ' || COALESCE(author_name, '匿名用户') || ' 发布了新笔记',
      NEW.id,
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_notify_followers ON public.notes;
CREATE TRIGGER trigger_notify_followers
  AFTER INSERT ON public.notes
  FOR EACH ROW
  WHEN (NEW.is_deleted IS NULL OR NEW.is_deleted = false)
  EXECUTE FUNCTION notify_followers_on_new_note();
