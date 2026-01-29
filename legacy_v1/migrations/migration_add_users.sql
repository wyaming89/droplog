-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
COMMENT ON TABLE users IS '用户表';

-- health_records 增加 user_id（先可空，便于迁移）
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_health_records_user_id ON health_records(user_id);
COMMENT ON COLUMN health_records.user_id IS '所属用户 ID';

-- 创建默认管理员用户（密码: admin123，需在应用内用 bcrypt 生成后替换）
-- 下方为占位，实际执行 seed 脚本或通过注册接口创建首用户
