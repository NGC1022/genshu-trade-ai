-- 创建RPC函数：增加笔记观看量
CREATE OR REPLACE FUNCTION increment_note_view_count(note_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notes 
  SET view_count = view_count + 1 
  WHERE id = note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
