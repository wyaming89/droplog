#!/usr/bin/env node
/**
 * 创建首个用户（用于初始化）
 * 用法: node scripts/seed-user.js
 * 默认账号 admin / 密码 admin123，首次部署后请修改密码
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.postgres_username,
    host: process.env.postgres_host,
    database: process.env.postgres_database,
    password: process.env.postgres_password,
    port: process.env.postgres_port || 6543,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const username = process.env.SEED_USERNAME || 'admin';
    const plainPassword = process.env.SEED_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(plainPassword, 10);

    try {
        await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
            [username, hash]
        );
        console.log(`用户 ${username} 已就绪（已存在则跳过）。默认密码: ${plainPassword}`);
    } catch (e) {
        console.error('seed 失败:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
