-- ============================================
-- 累计型指标支持迁移脚本
-- ============================================

-- 1. 为 metric_templates 添加累计相关字段
ALTER TABLE metric_templates
ADD COLUMN IF NOT EXISTS is_cumulative BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cumulative_period VARCHAR(20) DEFAULT 'daily';

-- 添加注释
COMMENT ON COLUMN metric_templates.is_cumulative IS '是否为累计型指标（如排尿量需要累加）';
COMMENT ON COLUMN metric_templates.cumulative_period IS '累计周期：daily(每日), weekly(每周), monthly(每月)';

-- 2. 更新现有指标，设置累计属性
UPDATE metric_templates SET 
    is_cumulative = true,
    cumulative_period = 'daily'
WHERE metric_key IN ('water_intake', 'urine_output', 'steps');

-- 3. 为 health_records 添加记录类型字段（可选，用于区分单次记录和汇总记录）
ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS record_type VARCHAR(20) DEFAULT 'single';

COMMENT ON COLUMN health_records.record_type IS '记录类型：single(单次记录), summary(汇总记录)';

-- 4. 创建视图：每日累计统计
CREATE OR REPLACE VIEW daily_cumulative_metrics AS
SELECT 
    user_id,
    DATE(created_at) as record_date,
    metric_key,
    SUM(CAST(metric_value AS DECIMAL)) as cumulative_value,
    COUNT(*) as record_count,
    MIN(created_at) as first_record_time,
    MAX(created_at) as last_record_time
FROM (
    SELECT 
        user_id,
        created_at,
        jsonb_object_keys(metrics) as metric_key,
        metrics->>jsonb_object_keys(metrics) as metric_value
    FROM health_records
    WHERE metrics IS NOT NULL
) as expanded_metrics
WHERE metric_value ~ '^[0-9]+\.?[0-9]*$'  -- 只统计数值型
GROUP BY user_id, DATE(created_at), metric_key;

COMMENT ON VIEW daily_cumulative_metrics IS '每日累计指标统计视图';

-- 验证
SELECT 
    COUNT(*) as cumulative_metrics_count
FROM metric_templates 
WHERE is_cumulative = true;

-- ============================================
-- 说明：
-- 1. is_cumulative = true 表示该指标需要累加
-- 2. cumulative_period 控制累加周期
-- 3. 前端录入时，累计型指标显示当日已累计量
-- 4. 可通过视图快速查询每日累计值
-- ============================================
