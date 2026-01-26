#!/usr/bin/env node
/**
 * 创建测试用户脚本
 * 用法: node scripts/create-test-user.js <username> <password>
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
  ssl: {
    rejectUnauthorized: false
  }
});

async function createUser() {
  // 从命令行参数获取用户名和密码
  const username = process.argv[2] || 'testuser';
  const password = process.argv[3] || 'test123';

  if (username.length < 2) {
    console.error('❌ 用户名至少2个字符');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ 密码至少6个字符');
    process.exit(1);
  }

  try {
    // 检查用户是否已存在
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      console.log(`⚠️  用户 '${username}' 已存在，跳过创建`);
      process.exit(0);
    }

    // 创建用户
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );

    const user = result.rows[0];
    console.log(`✅ 测试用户创建成功！`);
    console.log(`   用户ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   密码: ${password}`);
    console.log('');
    console.log('可以使用以下信息登录：');
    console.log(`   https://droplog.top/login.html`);

  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUser();
