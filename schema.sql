-- 健康指标记录表
CREATE TABLE IF NOT EXISTS health_records (
    id BIGSERIAL PRIMARY KEY,
    temperature DECIMAL(4, 1) NOT NULL,
    heart_rate INTEGER NOT NULL,
    oxygen INTEGER NOT NULL,
    weight DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_health_records_created_at ON health_records(created_at DESC);

-- 添加注释
COMMENT ON TABLE health_records IS '健康指标记录表';
COMMENT ON COLUMN health_records.temperature IS '体温（摄氏度）';
COMMENT ON COLUMN health_records.heart_rate IS '心率（每分钟心跳次数）';
COMMENT ON COLUMN health_records.oxygen IS '血氧（百分比）';
COMMENT ON COLUMN health_records.weight IS '体重（千克）';