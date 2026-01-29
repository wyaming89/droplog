-- ============================================
-- 规范化指标数据迁移脚本
-- 支持数据补录（record_date 与 created_at 分离）
-- ============================================

-- 1. 创建新的规范化指标值表
CREATE TABLE IF NOT EXISTS health_metric_values (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_key VARCHAR(50) NOT NULL,
    
    -- 数据值（二选一）
    numeric_value DECIMAL(12, 4),     -- 数值型指标
    text_value TEXT,                   -- 文本/选择型指标
    
    -- 时间字段（关键：支持补录）
    record_date DATE NOT NULL,         -- 数据所属日期（用户可选择，支持补录）
    record_time TIME,                  -- 数据所属时间（可选，精确到分钟）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 实际创建时间
    
    -- 添加外键约束
    CONSTRAINT fk_metric_key FOREIGN KEY (metric_key) 
        REFERENCES metric_templates(metric_key) ON UPDATE CASCADE
);

-- 2. 创建索引
-- 主查询索引：按用户、指标、日期查询
CREATE INDEX idx_metric_values_user_metric_date 
ON health_metric_values(user_id, metric_key, record_date DESC);

-- 按日期范围查询（趋势图）
CREATE INDEX idx_metric_values_user_date 
ON health_metric_values(user_id, record_date DESC);

-- 累计计算索引
CREATE INDEX idx_metric_values_cumulative 
ON health_metric_values(user_id, metric_key, record_date) 
WHERE numeric_value IS NOT NULL;

-- 3. 添加注释
COMMENT ON TABLE health_metric_values IS '健康指标值表（规范化存储，每行一个指标）';
COMMENT ON COLUMN health_metric_values.record_date IS '数据所属日期（支持补录历史数据）';
COMMENT ON COLUMN health_metric_values.record_time IS '数据所属时间（可选）';
COMMENT ON COLUMN health_metric_values.created_at IS '记录创建时间（系统自动）';
COMMENT ON COLUMN health_metric_values.numeric_value IS '数值型指标值';
COMMENT ON COLUMN health_metric_values.text_value IS '文本/选择型指标值';

-- 4. 创建每日累计统计视图（高效版本）
CREATE OR REPLACE VIEW v_daily_cumulative AS
SELECT 
    user_id,
    metric_key,
    record_date,
    SUM(numeric_value) as daily_total,
    COUNT(*) as record_count,
    MIN(record_time) as first_time,
    MAX(record_time) as last_time
FROM health_metric_values
WHERE numeric_value IS NOT NULL
GROUP BY user_id, metric_key, record_date;

COMMENT ON VIEW v_daily_cumulative IS '每日累计统计视图';

-- 5. 创建获取最新值的视图
CREATE OR REPLACE VIEW v_latest_metrics AS
SELECT DISTINCT ON (user_id, metric_key)
    user_id,
    metric_key,
    numeric_value,
    text_value,
    record_date,
    record_time,
    created_at
FROM health_metric_values
ORDER BY user_id, metric_key, record_date DESC, record_time DESC NULLS LAST, created_at DESC;

COMMENT ON VIEW v_latest_metrics IS '各指标最新值视图';

-- 6. 数据迁移：从旧的 JSONB 格式迁移到新表
INSERT INTO health_metric_values (user_id, metric_key, numeric_value, text_value, record_date, record_time, created_at)
SELECT 
    hr.user_id,
    kv.key as metric_key,
    -- 尝试转为数值，失败则为 NULL
    CASE 
        WHEN kv.value::text ~ '^-?[0-9]+\.?[0-9]*$' 
        THEN (kv.value::text)::decimal 
        ELSE NULL 
    END as numeric_value,
    -- 非数值则存为文本
    CASE 
        WHEN kv.value::text ~ '^-?[0-9]+\.?[0-9]*$' 
        THEN NULL 
        ELSE kv.value::text 
    END as text_value,
    DATE(hr.created_at) as record_date,
    (hr.created_at)::time as record_time,
    hr.created_at
FROM health_records hr,
     jsonb_each(hr.metrics) as kv
WHERE hr.user_id IS NOT NULL 
  AND hr.metrics IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. 验证迁移结果
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    -- 统计旧表中的指标数量（每条记录可能有多个指标）
    SELECT COALESCE(SUM(jsonb_object_keys_count), 0) INTO old_count
    FROM (
        SELECT COUNT(*) as jsonb_object_keys_count 
        FROM health_records, jsonb_object_keys(metrics)
        WHERE user_id IS NOT NULL AND metrics IS NOT NULL
        GROUP BY health_records.id
    ) t;
    
    SELECT COUNT(*) INTO new_count FROM health_metric_values;
    
    RAISE NOTICE '迁移完成：旧数据指标数 = %, 新表记录数 = %', old_count, new_count;
END $$;

-- 8. 创建备份标记（可选：稍后手动删除旧表）
-- ALTER TABLE health_records RENAME TO health_records_deprecated;

-- ============================================
-- 使用说明：
-- 
-- 1. record_date: 数据所属日期，用户可选择（默认今天）
--    - 今天记录：record_date = CURRENT_DATE
--    - 补录昨天：record_date = CURRENT_DATE - 1
--
-- 2. record_time: 可选的具体时间
--    - 可以为 NULL（只关心日期）
--    - 或精确到 HH:MM
--
-- 3. created_at: 系统自动记录的创建时间（用于审计）
--
-- 4. 累计型指标查询示例：
--    SELECT * FROM v_daily_cumulative 
--    WHERE user_id = 1 AND metric_key = 'water_intake' AND record_date = CURRENT_DATE;
--
-- 5. 获取最新值示例：
--    SELECT * FROM v_latest_metrics WHERE user_id = 1;
-- ============================================
