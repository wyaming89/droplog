#!/usr/bin/env node
/**
 * 检查用户指标配置
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

async function checkUserMetrics() {
  const username = process.argv[2] || 'test';

  try {
    // 获取用户信息
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ 用户 '${username}' 不存在`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`\n👤 用户信息：`);
    console.log(`   ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);

    // 获取用户的指标配置
    const metricsResult = await pool.query(`
      SELECT 
        umc.id, umc.metric_key, umc.display_order, umc.is_active,
        mt.metric_name, mt.data_type, mt.unit
      FROM user_metrics_config umc
      JOIN metric_templates mt ON umc.metric_key = mt.metric_key
      WHERE umc.user_id = $1
      ORDER BY umc.display_order
    `, [user.id]);

    console.log(`\n📊 指标配置 (${metricsResult.rows.length} 个)：`);
    if (metricsResult.rows.length === 0) {
      console.log(`   ⚠️  未配置任何指标！`);
      console.log(`\n💡 解决方法：`);
      console.log(`   1. 访问 https://droplog.top/metrics-config.html`);
      console.log(`   2. 选择需要的指标`);
      console.log(`   3. 点击"保存配置"`);
    } else {
      metricsResult.rows.forEach((metric, index) => {
        console.log(`   ${index + 1}. ${metric.metric_name} (${metric.metric_key})`);
        console.log(`      类型: ${metric.data_type}${metric.unit ? ', 单位: ' + metric.unit : ''}`);
        console.log(`      顺序: ${metric.display_order}, 状态: ${metric.is_active ? '启用' : '禁用'}`);
      });
    }

    // 获取用户的记录数
    const recordsResult = await pool.query(
      'SELECT COUNT(*) as count FROM health_records WHERE user_id = $1',
      [user.id]
    );

    console.log(`\n📝 历史记录数: ${recordsResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUserMetrics();
