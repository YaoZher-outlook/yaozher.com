SET @schema = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE sys_user ADD COLUMN create_time DATETIME NULL AFTER role',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'sys_user'
    AND COLUMN_NAME = 'create_time'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE sys_user
SET create_time = '2007-04-10 00:00:00'
WHERE create_time IS NULL;

ALTER TABLE sys_user
MODIFY COLUMN create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE biz_project ADD COLUMN resource_type VARCHAR(32) NOT NULL DEFAULT ''OPEN_SOURCE'' AFTER github_url',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'biz_project'
    AND COLUMN_NAME = 'resource_type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS biz_chat_clear_marker (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  peer_id BIGINT NOT NULL,
  cleared_before DATETIME NOT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_peer (user_id, peer_id),
  KEY idx_peer (peer_id)
);

UPDATE biz_project
SET cover_image = CONCAT('/cover-images/', id, '.png')
WHERE cover_image IS NULL
   OR cover_image LIKE '/news-images/%'
   OR cover_image LIKE '/project-covers/%';
