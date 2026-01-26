#!/usr/bin/env node
/**
 * 累计型指标迁移脚本
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

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始累计型指标迁移...\n');
    
    // 读取迁移 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'migration_cumulative_metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 执行迁移 SQL...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ 迁移成功完成！\n');
    
    // 显示累计型指标
    const result = await client.query(`
      SELECT metric_key, metric_name, is_cumulative, cumulative_period, unit
      FROM metric_templates
      WHERE is_cumulative = true
      ORDER BY metric_key
    `);
    
    console.log('📊 累计型指标列表：');
    result.rows.forEach(m => {
      console.log(`   - ${m.metric_name} (${m.metric_key})`);
      console.log(`     周期: ${m.cumulative_period}, 单位: ${m.unit || 'N/A'}`);
    });
    console.log('');
    
    console.log('✨ 迁移完成！');
    console.log('');
    console.log('📌 功能说明：');
    console.log('   - 累计型指标每次记录的是增量值');
    console.log('   - 系统会自动计算当日累计总量');
    console.log('   - 前端显示时会显示"本次 + 今日累计"');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 迁移失败：', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
