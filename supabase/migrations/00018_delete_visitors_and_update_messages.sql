-- 删除访客表
DROP TABLE IF EXISTS profile_visitors CASCADE;

-- 删除profiles表中的访客相关字段
ALTER TABLE profiles DROP COLUMN IF EXISTS show_visitors;

-- 扩展messages表，添加更多类型和字段
ALTER TABLE messages ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS related_comment_id UUID REFERENCES note_comments(id) ON DELETE CASCADE;

-- 更新消息类型检查约束
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check 
  CHECK (type IN (
    'note_deleted', 
    'report_rejected', 
    'note_restored', 
    'system', 
    'new_note_from_following',
    'new_follower',
    'note_liked',
    'comment_liked',
    'note_commented',
    'comment_replied',
    'mentioned'
  ));
