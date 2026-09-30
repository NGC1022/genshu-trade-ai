-- 创建知识问答题库表
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{text: string, is_correct: boolean}]
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL, -- '根书历史', '艺术鉴赏', '文化知识'等
  points INTEGER NOT NULL DEFAULT 10, -- 答对获得的积分
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建用户答题记录表
CREATE TABLE IF NOT EXISTS user_quiz_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  points_earned INTEGER NOT NULL DEFAULT 0
);

-- 创建用户每日答题统计表
CREATE TABLE IF NOT EXISTS user_daily_quiz_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, quiz_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_user_quiz_records_user_id ON user_quiz_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_quiz_stats_user_date ON user_daily_quiz_stats(user_id, quiz_date);

-- 设置RLS策略
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_quiz_stats ENABLE ROW LEVEL SECURITY;

-- 题库：所有人可读
CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);

-- 答题记录：用户只能查看自己的记录
CREATE POLICY "Users can view own quiz records" ON user_quiz_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz records" ON user_quiz_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 每日统计：用户只能查看和更新自己的统计
CREATE POLICY "Users can view own daily stats" ON user_daily_quiz_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily stats" ON user_daily_quiz_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily stats" ON user_daily_quiz_stats FOR UPDATE USING (auth.uid() = user_id);

-- 插入初始题库数据
INSERT INTO quiz_questions (question, options, difficulty, category, points) VALUES
  ('根书艺术的主要载体是什么?', '[{"text":"树根","is_correct":true},{"text":"竹子","is_correct":false},{"text":"石头","is_correct":false},{"text":"木板","is_correct":false}]', 'easy', '根书历史', 10),
  ('根书艺术起源于哪个地区?', '[{"text":"四川乐山","is_correct":true},{"text":"北京","is_correct":false},{"text":"上海","is_correct":false},{"text":"广州","is_correct":false}]', 'easy', '根书历史', 10),
  ('根书艺术最大的特点是什么?', '[{"text":"因材施艺,天人合一","is_correct":true},{"text":"统一规格","is_correct":false},{"text":"机器制作","is_correct":false},{"text":"批量生产","is_correct":false}]', 'medium', '艺术鉴赏', 15),
  ('根书文创园的数字IP形象叫什么名字?', '[{"text":"根宝","is_correct":true},{"text":"根根","is_correct":false},{"text":"书宝","is_correct":false},{"text":"小根","is_correct":false}]', 'easy', '文化知识', 10),
  ('根宝手持的牌匾上写的是什么字?', '[{"text":"蜀","is_correct":true},{"text":"根","is_correct":false},{"text":"书","is_correct":false},{"text":"艺","is_correct":false}]', 'medium', '文化知识', 15),
  ('根书艺术作品为什么每一件都是独一无二的?', '[{"text":"每段树根的纹理形状都不同","is_correct":true},{"text":"艺术家故意做不同","is_correct":false},{"text":"使用不同颜料","is_correct":false},{"text":"尺寸不同","is_correct":false}]', 'medium', '艺术鉴赏', 15),
  ('根书艺术体现了中国传统美学的哪种思想?', '[{"text":"天人合一","is_correct":true},{"text":"以人为本","is_correct":false},{"text":"实用主义","is_correct":false},{"text":"现代主义","is_correct":false}]', 'hard', '艺术鉴赏', 20),
  ('根书文创3D打印定制服务的价格是多少?', '[{"text":"70元","is_correct":true},{"text":"50元","is_correct":false},{"text":"100元","is_correct":false},{"text":"150元","is_correct":false}]', 'easy', '文化知识', 10),
  ('3D打印底座定制文字最多支持几个字?', '[{"text":"5个字","is_correct":true},{"text":"3个字","is_correct":false},{"text":"10个字","is_correct":false},{"text":"15个字","is_correct":false}]', 'easy', '文化知识', 10),
  ('乐山大佛+根书艺术馆的成人联票价格是多少?', '[{"text":"88元","is_correct":true},{"text":"80元","is_correct":false},{"text":"100元","is_correct":false},{"text":"120元","is_correct":false}]', 'easy', '文化知识', 10),
  ('根书艺术馆单独购买讲解服务的价格是多少?', '[{"text":"20元","is_correct":true},{"text":"10元","is_correct":false},{"text":"30元","is_correct":false},{"text":"50元","is_correct":false}]', 'easy', '文化知识', 10),
  ('会员专享文创直减券的优惠金额是多少?', '[{"text":"满100减15","is_correct":true},{"text":"满100减20","is_correct":false},{"text":"满50减10","is_correct":false},{"text":"满200减30","is_correct":false}]', 'easy', '文化知识', 10),
  ('根书艺术家在创作时最重要的是什么?', '[{"text":"根据树根形态设计字体布局","is_correct":true},{"text":"使用最贵的工具","is_correct":false},{"text":"创作速度要快","is_correct":false},{"text":"作品尺寸要大","is_correct":false}]', 'hard', '艺术鉴赏', 20),
  ('根宝的服饰特点是什么?', '[{"text":"传统服饰,背负竹篓","is_correct":true},{"text":"现代西装","is_correct":false},{"text":"运动装","is_correct":false},{"text":"古代盔甲","is_correct":false}]', 'medium', '文化知识', 15),
  ('根书艺术将哪两种元素完美结合?', '[{"text":"自然与人文","is_correct":true},{"text":"科技与艺术","is_correct":false},{"text":"东方与西方","is_correct":false},{"text":"古代与现代","is_correct":false}]', 'medium', '艺术鉴赏', 15);
