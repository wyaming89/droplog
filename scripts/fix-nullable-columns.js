#!/usr/bin/env node
/**
 * 修复health_records表的旧列，使其可以为空
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

async function fixColumns() {
  try {
    console.log('🔧 修复 health_records 表的列约束...\n');

    // 将旧列改为可空
    await pool.query(`
      ALTER TABLE health_records 
      ALTER COLUMN temperature DROP NOT NULL,
      ALTER COLUMN heart_rate DROP NOT NULL,
      ALTER COLUMN oxygen DROP NOT NULL,
      ALTER COLUMN weight DROP NOT NULL;
    `);

    console.log('✅ 已将以下列改为可空：');
    console.log('   - temperature');
    console.log('   - heart_rate');
    console.log('   - oxygen');
    console.log('   - weight');
    console.log('');

    // 验证修改
    const result = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'health_records'
      AND column_name IN ('temperature', 'heart_rate', 'oxygen', 'weight', 'metrics')
      ORDER BY column_name;
    `);

    console.log('📊 当前列状态：');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.is_nullable === 'YES' ? '可空 ✓' : '不可空 ✗'}`);
    });

    console.log('\n✨ 修复完成！现在可以正常保存记录了。');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixColumns();
