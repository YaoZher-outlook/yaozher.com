SET NAMES utf8mb4;

-- Minimal bootstrap accounts and bot definitions only.
-- Page content (news/projects/uploads) should be managed in MySQL, not seeded as demo display data.
SET @bcrypt_123456 = '$2a$10$Bgq8cZ8eBSWZ5u7hFcRYPuxOZ4CDyabnMRjXaLwvVpsYxvYiQIk8e';

INSERT INTO sys_user (username, password, nickname, avatar, email, led_config, role)
VALUES
('chen_ziyao', @bcrypt_123456, '陈子尧', '/avatars/1.png', 'chen_ziyao@example.com',
 JSON_OBJECT('theme','dark','glow',true,'color','#00e5ff','intensity',0.85),
 'ADMIN'),
('jiang_yunyao', @bcrypt_123456, '蒋芸瑶', '/avatars/2.png', 'jiang_yunyao@example.com',
 JSON_OBJECT('theme','dark','glow',true,'color','#ff4dff','intensity',0.65),
 'USER');

INSERT INTO sys_skill_bot (bot_name, description, trigger_keyword)
VALUES
('Java Backend', 'Spring Boot/MyBatis/分布式方向问答', 'java'),
('Algorithm', '算法与刷题思路提示', 'algo'),
('Advanced Math', '高数/线代/概率相关解释', 'math');
