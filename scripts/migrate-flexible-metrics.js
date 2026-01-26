#!/usr/bin/env node
/**
 * 灵活指标系统迁移脚本
 * 将固定指标迁移为灵活的 JSONB 格式
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
  ssl: {
    rejectUnauthorized: false // Supabase 需要 SSL
  }
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始灵活指标系统迁移...\n');
    
    // 读取迁移 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'migration_flexible_metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 执行迁移 SQL...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ 迁移成功完成！\n');
    
    // 显示统计信息
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM metric_templates) as template_count,
        (SELECT COUNT(*) FROM user_metrics_config) as user_config_count,
        (SELECT COUNT(*) FROM health_records WHERE metrics IS NOT NULL) as migrated_records,
        (SELECT COUNT(DISTINCT user_id) FROM user_metrics_config) as configured_users
    `);
    
    console.log('📊 迁移统计：');
    console.log(`   - 指标模板数: ${stats.rows[0].template_count}`);
    console.log(`   - 用户配置数: ${stats.rows[0].user_config_count}`);
    console.log(`   - 已迁移记录: ${stats.rows[0].migrated_records}`);
    console.log(`   - 配置用户数: ${stats.rows[0].configured_users}`);
    console.log('');
    
    // 显示系统预设指标
    const templates = await client.query(`
      SELECT metric_key, metric_name, data_type, unit 
      FROM metric_templates 
      WHERE is_system = true 
      ORDER BY metric_key
    `);
    
    console.log('📋 系统预设指标：');
    templates.rows.forEach(t => {
      console.log(`   - ${t.metric_name} (${t.metric_key}): ${t.data_type}${t.unit ? ' [' + t.unit + ']' : ''}`);
    });
    console.log('');
    
    console.log('✨ 迁移完成！现在可以启动应用了。');
    console.log('');
    console.log('📌 注意事项：');
    console.log('   1. 旧数据已备份到 health_records_backup 表');
    console.log('   2. 旧列（temperature等）已保留，确认无误后可手动删除');
    console.log('   3. 所有现有用户已配置默认4个指标');
    console.log('   4. 可通过 /api/metric-templates 查看所有可用指标');
    
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

// 执行迁移
migrate();
