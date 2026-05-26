SET NAMES utf8mb4;

-- mock BCrypt (示例hash；用于本地初始化演示)
-- 常见格式: $2a$10$...
SET @mock_bcrypt = '$2a$10$7aQ3x9ZQxWm3kW8d8g5Q6O6r2oH4QxB7p8s3fDg3u6y2xVxq1y3e';

-- 123456 的 BCrypt（用 BCryptPasswordEncoder 生成）
SET @bcrypt_123456 = '$2a$10$Bgq8cZ8eBSWZ5u7hFcRYPuxOZ4CDyabnMRjXaLwvVpsYxvYiQIk8e';

-- 1) 用户
INSERT INTO sys_user (username, password, nickname, avatar, led_config, role)
VALUES
('chen_ziyao', @bcrypt_123456, '陈子尧', 'https://example.com/avatar/admin.png',
 JSON_OBJECT('theme','dark','glow',true,'color','#00e5ff','intensity',0.85),
 'ADMIN');

INSERT INTO sys_user (username, password, nickname, avatar, led_config, role)
VALUES
('peer_user', @bcrypt_123456, '蒋芸瑶', 'https://example.com/avatar/peer.png',
 JSON_OBJECT('theme','dark','glow',true,'color','#ff4dff','intensity',0.65),
 'USER');

-- 2) 技能机器人
INSERT INTO sys_skill_bot (bot_name, description, trigger_keyword)
VALUES
('Java Backend', 'Spring Boot/MyBatis/分布式方向问答', 'java'),
('Algorithm', '算法与刷题思路提示', 'algo'),
('Advanced Math', '高数/线代/概率相关解释', 'math');

-- 3) 项目
INSERT INTO biz_project (name, description, cover_image, download_url, github_url, sort_order)
VALUES
('LED Glow Portfolio', '极简暗黑 + LED Glow 风格个人站点（后端Spring Boot）',
 'https://example.com/covers/p1.png',
 'https://example.com/downloads/p1.zip',
 'https://github.com/example/led-glow-portfolio',
 1),
('Realtime Chat Module', 'WebSocket + JWT 的实时聊天模块（含机器人策略）',
 'https://example.com/covers/p2.png',
 NULL,
 'https://github.com/example/realtime-chat-module',
 2);

-- 4) 新闻
INSERT INTO biz_news (title, content, cover_image, type, create_time, view_count)
VALUES
('站点上线：Dark Mode + LED Glow', '个人网站V1版本上线，后端采用Spring Boot 3.x + MyBatis。', 'https://example.com/news/n1.png', '公告', NOW(), 12),
('新增：WebSocket 技能机器人', '增加技能机器人策略路由，支持 Algorithm/Math 等关键字触发。', 'https://example.com/news/n2.png', '更新', NOW(), 5);