#!/usr/bin/env node
/**
 * 测试累计型指标功能
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

async function test() {
  try {
    const username = process.argv[2] || 'test';
    
    console.log(`\n📊 测试用户 '${username}' 的累计型指标功能\n`);
    
    // 获取用户ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ 用户 '${username}' 不存在`);
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    
    // 查看用户配置的累计型指标
    console.log('1️⃣  用户配置的累计型指标：');
    const configResult = await pool.query(`
      SELECT 
        mt.metric_key, mt.metric_name, mt.unit,
        mt.is_cumulative, mt.cumulative_period
      FROM user_metrics_config umc
      JOIN metric_templates mt ON umc.metric_key = mt.metric_key
      WHERE umc.user_id = $1 AND mt.is_cumulative = true
      ORDER BY umc.display_order
    `, [userId]);
    
    if (configResult.rows.length === 0) {
      console.log('   无累计型指标配置\n');
    } else {
      configResult.rows.forEach(row => {
        console.log(`   - ${row.metric_name} (${row.metric_key})`);
        console.log(`     单位: ${row.unit || 'N/A'}, 周期: ${row.cumulative_period}`);
      });
      console.log('');
    }
    
    // 查看今日累计数据
    console.log('2️⃣  今日累计数据：');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const cumulativeResult = await pool.query(`
      SELECT 
        metric_key,
        SUM(CAST(metric_value AS DECIMAL)) as cumulative_value,
        COUNT(*) as record_count
      FROM (
        SELECT 
          (jsonb_each_text(metrics)).key as metric_key,
          (jsonb_each_text(metrics)).value as metric_value
        FROM health_records
        WHERE user_id = $1 
        AND created_at >= $2
        AND metrics IS NOT NULL
      ) as expanded
      WHERE metric_value ~ '^[0-9]+\.?[0-9]*$'
      GROUP BY metric_key
    `, [userId, today]);
    
    if (cumulativeResult.rows.length === 0) {
      console.log('   今日暂无记录\n');
    } else {
      // 获取指标信息
      for (const row of cumulativeResult.rows) {
        const metricInfo = await pool.query(
          'SELECT metric_name, unit, is_cumulative FROM metric_templates WHERE metric_key = $1',
          [row.metric_key]
        );
        
        if (metricInfo.rows.length > 0) {
          const info = metricInfo.rows[0];
          const cumulativeTag = info.is_cumulative ? ' [累计]' : '';
          console.log(`   - ${info.metric_name}${cumulativeTag}: ${row.cumulative_value} ${info.unit || ''}`);
          console.log(`     记录次数: ${row.record_count}`);
        }
      }
      console.log('');
    }
    
    // 查看最近的记录
    console.log('3️⃣  最近3条记录：');
    const recentResult = await pool.query(`
      SELECT id, metrics, created_at
      FROM health_records
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [userId]);
    
    if (recentResult.rows.length === 0) {
      console.log('   暂无记录\n');
    } else {
      recentResult.rows.forEach((row, index) => {
        const time = new Date(row.created_at).toLocaleString('zh-CN');
        console.log(`   ${index + 1}. ${time}`);
        console.log(`      数据: ${JSON.stringify(row.metrics)}`);
      });
      console.log('');
    }
    
    console.log('✨ 测试完成！\n');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
