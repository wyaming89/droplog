#!/usr/bin/env node
/**
 * 修复用户指标配置（清理重复并重新配置默认指标）
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

async function fixUserMetrics() {
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
    console.log(`\n👤 修复用户: ${user.username} (ID: ${user.id})`);

    // 删除该用户的所有指标配置
    await pool.query(
      'DELETE FROM user_metrics_config WHERE user_id = $1',
      [user.id]
    );
    console.log(`✅ 已清除旧配置`);

    // 重新配置默认4个指标
    const defaultMetrics = [
      { key: 'temperature', order: 1 },
      { key: 'heart_rate', order: 2 },
      { key: 'oxygen', order: 3 },
      { key: 'weight', order: 4 }
    ];

    for (const metric of defaultMetrics) {
      await pool.query(`
        INSERT INTO user_metrics_config (user_id, metric_key, display_order, is_active)
        VALUES ($1, $2, $3, true)
      `, [user.id, metric.key, metric.order]);
    }

    console.log(`✅ 已配置默认4个指标：体温、心率、血氧、体重`);

    // 验证配置
    const verifyResult = await pool.query(`
      SELECT 
        umc.metric_key, umc.display_order,
        mt.metric_name, mt.data_type, mt.unit
      FROM user_metrics_config umc
      JOIN metric_templates mt ON umc.metric_key = mt.metric_key
      WHERE umc.user_id = $1
      ORDER BY umc.display_order
    `, [user.id]);

    console.log(`\n📊 当前配置 (${verifyResult.rows.length} 个)：`);
    verifyResult.rows.forEach((metric, index) => {
      console.log(`   ${index + 1}. ${metric.metric_name} (${metric.metric_key}) - 顺序: ${metric.display_order}`);
    });

    console.log(`\n✨ 修复完成！现在可以正常保存记录了。`);

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixUserMetrics();
