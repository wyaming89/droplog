#!/usr/bin/env node
/**
 * 执行用户表迁移
 * 用法: node scripts/migrate-users.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.postgres_username,
    host: process.env.postgres_host,
    database: process.env.postgres_database,
    password: process.env.postgres_password,
    port: process.env.postgres_port || 6543,
    ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync(path.join(__dirname, '../migration_add_users.sql'), 'utf8');

async function run() {
    try {
        await pool.query(sql);
        console.log('✅ migration_add_users 执行完成');
    } catch (e) {
        console.error('迁移失败:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
