#!/usr/bin/env node
/**
 * 将 user_id 为 NULL 的旧记录分配给指定用户
 * 用法: node scripts/migrate-old-records.js [username]
 * 若不指定 username，默认分配给 'admin'
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
    const targetUsername = process.argv[2] || 'admin';
    
    try {
        // 获取目标用户
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [targetUsername]);
        if (userResult.rows.length === 0) {
            console.error(`❌ 用户 '${targetUsername}' 不存在`);
            process.exit(1);
        }
        const userId = userResult.rows[0].id;
        
        // 统计旧记录
        const countResult = await pool.query('SELECT COUNT(*) FROM health_records WHERE user_id IS NULL');
        const count = parseInt(countResult.rows[0].count);
        
        if (count === 0) {
            console.log('✅ 没有需要迁移的旧记录');
            process.exit(0);
        }
        
        // 迁移旧记录
        await pool.query('UPDATE health_records SET user_id = $1 WHERE user_id IS NULL', [userId]);
        console.log(`✅ 已将 ${count} 条旧记录分配给用户 '${targetUsername}' (id: ${userId})`);
    } catch (e) {
        console.error('迁移失败:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
