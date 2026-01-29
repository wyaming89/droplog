-- 迁移脚本：为现有表添加体重字段
-- 如果表已存在但没有 weight 字段，运行此脚本添加

ALTER TABLE health_records 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5, 2);

-- 为现有记录设置默认体重值（可选，根据需要调整）
-- UPDATE health_records SET weight = 70.0 WHERE weight IS NULL;

-- 如果希望 weight 为必填字段，取消下面的注释
-- ALTER TABLE health_records ALTER COLUMN weight SET NOT NULL;

COMMENT ON COLUMN health_records.weight IS '体重（千克）';