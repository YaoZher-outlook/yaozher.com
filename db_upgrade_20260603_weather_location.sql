ALTER TABLE sys_user
  ADD COLUMN location_latitude DECIMAL(10,7) NULL AFTER create_time,
  ADD COLUMN location_longitude DECIMAL(10,7) NULL AFTER location_latitude,
  ADD COLUMN location_accuracy DOUBLE NULL AFTER location_longitude,
  ADD COLUMN location_updated_at DATETIME NULL AFTER location_accuracy;
