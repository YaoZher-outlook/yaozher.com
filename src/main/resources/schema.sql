-- MySQL 8.4
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS biz_chat_message;
DROP TABLE IF EXISTS biz_project;
DROP TABLE IF EXISTS biz_news;
DROP TABLE IF EXISTS sys_skill_bot;
DROP TABLE IF EXISTS sys_user;

CREATE TABLE sys_user (
  id           BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  username     VARCHAR(64)  NOT NULL COMMENT '用户名(唯一)',
  password     VARCHAR(255) NOT NULL COMMENT 'BCrypt密码',
  nickname     VARCHAR(64)  NOT NULL COMMENT '昵称',
  avatar       VARCHAR(512) NULL COMMENT '头像URL',
  led_config   JSON         NULL COMMENT 'LED效果配置(JSON)',
  role         VARCHAR(32)  NOT NULL DEFAULT 'USER' COMMENT '角色: ADMIN/USER',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表';

CREATE TABLE sys_skill_bot (
  id              BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  bot_name        VARCHAR(64)  NOT NULL COMMENT '机器人名称(唯一)',
  description     VARCHAR(255) NULL COMMENT '描述',
  trigger_keyword VARCHAR(64)  NOT NULL COMMENT '触发关键字(策略路由)',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_skill_bot_name (bot_name),
  UNIQUE KEY uk_sys_skill_bot_keyword (trigger_keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='技能机器人配置表';

CREATE TABLE biz_news (
  id          BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  title       VARCHAR(200) NOT NULL COMMENT '标题',
  content     MEDIUMTEXT   NOT NULL COMMENT '内容',
  cover_image VARCHAR(512) NULL COMMENT '封面图URL',
  create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  view_count  BIGINT       NOT NULL DEFAULT 0 COMMENT '浏览次数',
  PRIMARY KEY (id),
  KEY idx_biz_news_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='新闻/动态表';

CREATE TABLE biz_project (
  id           BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  name         VARCHAR(128) NOT NULL COMMENT '项目名',
  description  VARCHAR(512) NULL COMMENT '描述',
  cover_image  VARCHAR(512) NULL COMMENT '封面图URL',
  download_url VARCHAR(512) NULL COMMENT '下载地址',
  github_url   VARCHAR(512) NULL COMMENT 'GitHub地址',
  sort_order   INT          NOT NULL DEFAULT 0 COMMENT '排序(升序)',
  PRIMARY KEY (id),
  KEY idx_biz_project_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目表';

CREATE TABLE biz_chat_message (
  id           BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  sender_id    BIGINT NOT NULL COMMENT '发送方ID(用户ID；机器人回消息时也可用bot的id，需在业务层区分)',
  receiver_id  BIGINT NOT NULL COMMENT '接收方ID(用户ID或bot ID)',
  message_type VARCHAR(16)  NOT NULL COMMENT '消息类型: TEXT/FILE/IMAGE',
  content      TEXT         NULL COMMENT '消息文本内容',
  file_url     VARCHAR(512) NULL COMMENT '文件/图片URL',
  create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_chat_sender_time (sender_id, create_time),
  KEY idx_chat_receiver_time (receiver_id, create_time),
  CONSTRAINT ck_chat_message_type CHECK (message_type IN ('TEXT','FILE','IMAGE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='聊天消息表';

SET FOREIGN_KEY_CHECKS = 1;