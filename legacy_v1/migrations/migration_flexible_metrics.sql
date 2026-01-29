-- ============================================
-- 灵活指标系统迁移脚本
-- ============================================

-- 1. 创建指标模板表（全局预设指标）
CREATE TABLE IF NOT EXISTS metric_templates (
    id BIGSERIAL PRIMARY KEY,
    metric_key VARCHAR(50) UNIQUE NOT NULL,  -- 唯一标识，如 'temperature', 'weight'
    metric_name VARCHAR(50) NOT NULL,         -- 显示名称，如 '体温', '体重'
    data_type VARCHAR(20) NOT NULL,           -- 数据类型: 'number', 'text', 'select'
    unit VARCHAR(20),                         -- 单位，如 '℃', 'kg', 'ml'
    min_value DECIMAL(10, 2),                 -- 最小值（仅数值类型）
    max_value DECIMAL(10, 2),                 -- 最大值（仅数值类型）
    decimal_places INTEGER DEFAULT 0,         -- 小数位数（仅数值类型）
    select_options JSONB,                     -- 选择项（仅选择类型），格式: ["选项1", "选项2"]
    icon VARCHAR(20),                         -- 图标（可选）
    description TEXT,                         -- 描述
    created_by BIGINT REFERENCES users(id),   -- 创建者（NULL表示系统预设）
    is_system BOOLEAN DEFAULT false,          -- 是否系统预设
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建用户指标配置表（用户选择的指标）
CREATE TABLE IF NOT EXISTS user_metrics_config (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_key VARCHAR(50) NOT NULL,          -- 关联 metric_templates.metric_key
    display_order INTEGER NOT NULL DEFAULT 0, -- 显示顺序
    is_active BOOLEAN DEFAULT true,           -- 是否启用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric_key)
);

-- 3. 备份现有 health_records 表
CREATE TABLE IF NOT EXISTS health_records_backup AS 
SELECT * FROM health_records;

-- 4. 为 health_records 添加新的 JSONB 列并修改旧列为可空
ALTER TABLE health_records 
ADD COLUMN IF NOT EXISTS metrics JSONB;

-- 将旧列改为可空（允许 NULL），因为新数据存储在 metrics 字段
ALTER TABLE health_records 
ALTER COLUMN temperature DROP NOT NULL,
ALTER COLUMN heart_rate DROP NOT NULL,
ALTER COLUMN oxygen DROP NOT NULL,
ALTER COLUMN weight DROP NOT NULL;

-- 5. 将现有数据迁移到 JSONB 格式
UPDATE health_records
SET metrics = jsonb_build_object(
    'temperature', temperature,
    'heart_rate', heart_rate,
    'oxygen', oxygen,
    'weight', weight
)
WHERE metrics IS NULL;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_metric_templates_key ON metric_templates(metric_key);
CREATE INDEX IF NOT EXISTS idx_user_metrics_config_user ON user_metrics_config(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_health_records_metrics ON health_records USING gin(metrics);
CREATE INDEX IF NOT EXISTS idx_health_records_user_created ON health_records(user_id, created_at DESC);

-- 7. 添加注释
COMMENT ON TABLE metric_templates IS '健康指标模板表（全局预设）';
COMMENT ON TABLE user_metrics_config IS '用户指标配置表';
COMMENT ON COLUMN health_records.metrics IS '健康指标数据（JSONB格式）';

-- 8. 插入系统预设指标模板
INSERT INTO metric_templates (metric_key, metric_name, data_type, unit, min_value, max_value, decimal_places, icon, is_system, description) VALUES
('temperature', '体温', 'number', '℃', 35.0, 42.0, 1, '🌡️', true, '人体温度'),
('heart_rate', '心率', 'number', '次/分', 40, 200, 0, '❤️', true, '每分钟心跳次数'),
('oxygen', '血氧', 'number', '%', 70, 100, 0, '🫁', true, '血氧饱和度'),
('weight', '体重', 'number', 'kg', 20, 300, 1, '⚖️', true, '身体重量'),
('waist', '腰围', 'number', 'cm', 40, 200, 1, '📏', true, '腰部周长'),
('water_intake', '饮水量', 'number', 'ml', 0, 10000, 0, '💧', true, '每日饮水量'),
('urine_output', '排尿量', 'number', 'ml', 0, 5000, 0, '🚽', true, '每日排尿量'),
('blood_pressure_high', '收缩压', 'number', 'mmHg', 60, 220, 0, '💉', true, '高压/收缩压'),
('blood_pressure_low', '舒张压', 'number', 'mmHg', 40, 140, 0, '💉', true, '低压/舒张压'),
('blood_sugar', '血糖', 'number', 'mmol/L', 2.0, 30.0, 1, '🩸', true, '血糖浓度'),
('sleep_hours', '睡眠时长', 'number', '小时', 0, 24, 1, '😴', true, '每日睡眠时长'),
('steps', '步数', 'number', '步', 0, 100000, 0, '👟', true, '每日步行步数'),
('mood', '心情', 'select', NULL, NULL, NULL, NULL, '😊', true, '当日心情状态'),
('diet', '饮食', 'select', NULL, NULL, NULL, NULL, '🍽️', true, '饮食情况'),
('exercise', '运动', 'select', NULL, NULL, NULL, NULL, '🏃', true, '运动情况')
ON CONFLICT (metric_key) DO NOTHING;

-- 9. 更新选择类型指标的选项
UPDATE metric_templates SET select_options = '["😊 很好", "🙂 良好", "😐 一般", "😔 较差", "😢 很差"]'::jsonb WHERE metric_key = 'mood';
UPDATE metric_templates SET select_options = '["🥗 清淡", "🍱 正常", "🍖 油腻", "🍔 高热量", "🚫 未进食"]'::jsonb WHERE metric_key = 'diet';
UPDATE metric_templates SET select_options = '["💪 剧烈", "🏃 中等", "🚶 轻度", "🛋️ 无运动"]'::jsonb WHERE metric_key = 'exercise';

-- 10. 为现有用户创建默认指标配置（体温、心率、血氧、体重）
INSERT INTO user_metrics_config (user_id, metric_key, display_order, is_active)
SELECT 
    u.id,
    m.metric_key,
    CASE m.metric_key
        WHEN 'temperature' THEN 1
        WHEN 'heart_rate' THEN 2
        WHEN 'oxygen' THEN 3
        WHEN 'weight' THEN 4
    END as display_order,
    true
FROM users u
CROSS JOIN metric_templates m
WHERE m.metric_key IN ('temperature', 'heart_rate', 'oxygen', 'weight')
ON CONFLICT (user_id, metric_key) DO NOTHING;

-- 11. 验证数据迁移
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM health_records_backup;
    SELECT COUNT(*) INTO new_count FROM health_records WHERE metrics IS NOT NULL;
    
    RAISE NOTICE '数据迁移完成：备份记录数 = %, JSONB记录数 = %', old_count, new_count;
    
    IF old_count != new_count THEN
        RAISE WARNING '记录数不匹配！请检查数据完整性';
    END IF;
END $$;

-- ============================================
-- 注意事项：
-- 1. 本脚本会保留所有现有数据
-- 2. 旧的列（temperature, heart_rate等）暂时保留，可在确认无误后手动删除
-- 3. 创建了 health_records_backup 表作为备份
-- 4. 如需回滚，请联系管理员
-- ============================================
