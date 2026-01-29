/**
 * 数据库规范化迁移脚本
 * 将 health_records 表中的 JSONB 数据迁移到新的 health_metric_values 表
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.postgres_username,
    host: process.env.postgres_host,
    database: process.env.postgres_database,
    password: process.env.postgres_password,
    port: process.env.postgres_port || 6543,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('==========================================');
        console.log('  数据库规范化迁移');
        console.log('==========================================\n');

        // 1. 创建新表
        console.log('📋 步骤 1: 创建 health_metric_values 表...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS health_metric_values (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                metric_key VARCHAR(50) NOT NULL,
                numeric_value DECIMAL(12, 4),
                text_value TEXT,
                record_date DATE NOT NULL,
                record_time TIME,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT fk_metric_key FOREIGN KEY (metric_key) 
                    REFERENCES metric_templates(metric_key) ON UPDATE CASCADE
            )
        `);
        console.log('   ✅ 表创建成功\n');

        // 2. 创建索引
        console.log('📋 步骤 2: 创建索引...');
        
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_metric_values_user_metric_date 
                ON health_metric_values(user_id, metric_key, record_date DESC)
            `);
        } catch (e) { console.log('   索引 1 已存在'); }
        
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_metric_values_user_date 
                ON health_metric_values(user_id, record_date DESC)
            `);
        } catch (e) { console.log('   索引 2 已存在'); }
        
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_metric_values_cumulative 
                ON health_metric_values(user_id, metric_key, record_date) 
                WHERE numeric_value IS NOT NULL
            `);
        } catch (e) { console.log('   索引 3 已存在'); }
        
        console.log('   ✅ 索引创建成功\n');

        // 3. 添加注释
        console.log('📋 步骤 3: 添加表注释...');
        await client.query(`COMMENT ON TABLE health_metric_values IS '健康指标值表（规范化存储）'`);
        await client.query(`COMMENT ON COLUMN health_metric_values.record_date IS '数据所属日期（支持补录）'`);
        await client.query(`COMMENT ON COLUMN health_metric_values.record_time IS '数据所属时间（可选）'`);
        await client.query(`COMMENT ON COLUMN health_metric_values.created_at IS '记录创建时间'`);
        console.log('   ✅ 注释添加成功\n');

        // 4. 创建视图
        console.log('📋 步骤 4: 创建视图...');
        
        await client.query(`
            CREATE OR REPLACE VIEW v_daily_cumulative AS
            SELECT 
                user_id,
                metric_key,
                record_date,
                SUM(numeric_value) as daily_total,
                COUNT(*) as record_count
            FROM health_metric_values
            WHERE numeric_value IS NOT NULL
            GROUP BY user_id, metric_key, record_date
        `);
        
        await client.query(`
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
            ORDER BY user_id, metric_key, record_date DESC, record_time DESC NULLS LAST, created_at DESC
        `);
        
        console.log('   ✅ 视图创建成功\n');

        // 5. 检查是否有旧数据需要迁移
        console.log('📋 步骤 5: 检查旧数据...');
        const oldDataCheck = await client.query(`
            SELECT COUNT(*) as cnt 
            FROM health_records 
            WHERE user_id IS NOT NULL AND metrics IS NOT NULL
        `);
        const oldRecordCount = parseInt(oldDataCheck.rows[0].cnt);
        console.log(`   找到 ${oldRecordCount} 条旧记录\n`);

        // 6. 迁移数据
        if (oldRecordCount > 0) {
            console.log('📋 步骤 6: 迁移数据...');
            
            const migrateResult = await client.query(`
                INSERT INTO health_metric_values 
                    (user_id, metric_key, numeric_value, text_value, record_date, record_time, created_at)
                SELECT 
                    hr.user_id,
                    kv.key as metric_key,
                    CASE 
                        WHEN kv.value::text ~ '^-?[0-9]+\\.?[0-9]*$' 
                        THEN (kv.value::text)::decimal 
                        ELSE NULL 
                    END as numeric_value,
                    CASE 
                        WHEN kv.value::text ~ '^-?[0-9]+\\.?[0-9]*$' 
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
                ON CONFLICT DO NOTHING
            `);
            
            console.log(`   ✅ 迁移了 ${migrateResult.rowCount} 条指标数据\n`);
        } else {
            console.log('📋 步骤 6: 无旧数据需要迁移\n');
        }

        // 7. 验证结果
        console.log('📋 步骤 7: 验证迁移结果...');
        const newCount = await client.query('SELECT COUNT(*) as cnt FROM health_metric_values');
        
        console.log('\n==========================================');
        console.log('  迁移完成');
        console.log('==========================================');
        console.log(`新表记录数量: ${newCount.rows[0].cnt}`);
        console.log('==========================================\n');

        console.log('✅ 迁移成功！\n');
        console.log('提示:');
        console.log('  - 新表 health_metric_values 已就绪');
        console.log('  - 旧表 health_records 已保留（可稍后手动删除）');
        console.log('  - 请重启应用: npm run pm2:restart');

    } catch (error) {
        console.error('\n❌ 迁移失败:', error.message);
        console.error(error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    process.exit(1);
});
