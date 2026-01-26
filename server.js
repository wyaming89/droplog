const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const DOMAIN = process.env.DOMAIN || 'droplog.top';
const JWT_SECRET = process.env.JWT_SECRET || 'health-records-secret-change-in-production';

// 允许的 CORS 来源（本地开发 + 正式域名 droplog.top）
const allowedOrigins = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    `https://${DOMAIN}`,
    `http://${DOMAIN}`,
    `https://www.${DOMAIN}`,
    `http://www.${DOMAIN}`
];

function isOriginAllowed(origin) {
    if (!origin) return true;
    return allowedOrigins.some(allowed =>
        typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
    );
}

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || isOriginAllowed(origin)) return cb(null, true);
        cb(null, false);
    },
    credentials: false
}));
app.use(express.json());
app.use(express.static(__dirname)); // 提供静态文件服务

// 数据库连接配置
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

// 测试数据库连接
pool.on('connect', () => {
    console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
    console.error('❌ 数据库连接错误:', err);
    // 不要立即退出，让 PM2 处理重启
});

// 全局错误处理
process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    // PM2 会自动重启
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    // PM2 会自动重启
});

// 鉴权中间件：从 Authorization: Bearer <token> 解析用户
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
        return res.status(401).json({ success: false, error: '请先登录' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.id, username: payload.username };
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: '登录已失效，请重新登录' });
    }
}

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ success: false, error: '请输入账号和密码' });
        }
        const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
        if (r.rows.length === 0) {
            return res.status(401).json({ success: false, error: '账号或密码错误' });
        }
        const user = r.rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ success: false, error: '账号或密码错误' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ success: true, data: { token, user: { id: user.id, username: user.username } } });
    } catch (e) {
        console.error('登录错误:', e);
        res.status(500).json({ success: false, error: '登录失败' });
    }
});

// 注册（可选，用于创建新用户）
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ success: false, error: '请输入账号和密码' });
        }
        if (username.length < 2 || username.length > 32) {
            return res.status(400).json({ success: false, error: '账号长度 2–32 位' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '密码至少 6 位' });
        }
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
        res.status(201).json({ success: true, message: '注册成功，请登录' });
    } catch (e) {
        if (e.code === '23505') {
            return res.status(400).json({ success: false, error: '账号已存在' });
        }
        console.error('注册错误:', e);
        res.status(500).json({ success: false, error: '注册失败' });
    }
});

// 以下接口需登录
app.use('/api/records', authMiddleware);
app.use('/api/metric-templates', authMiddleware);
app.use('/api/user-metrics', authMiddleware);
app.use('/api/today-cumulative', authMiddleware);

// 获取当前用户信息
app.get('/api/me', authMiddleware, async (req, res) => {
    res.json({ success: true, data: { id: req.user.id, username: req.user.username } });
});

// ============================================
// 指标模板管理 API
// ============================================

// 获取所有指标模板
app.get('/api/metric-templates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, metric_key, metric_name, data_type, unit, 
                min_value, max_value, decimal_places, select_options,
                icon, description, is_system, created_by
            FROM metric_templates 
            ORDER BY 
                CASE WHEN is_system THEN 0 ELSE 1 END,
                metric_key
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('获取指标模板错误:', error);
        res.status(500).json({ success: false, error: '获取指标模板失败' });
    }
});

// 创建新的指标模板
app.post('/api/metric-templates', async (req, res) => {
    try {
        const {
            metric_key, metric_name, data_type, unit,
            min_value, max_value, decimal_places, select_options,
            icon, description
        } = req.body;

        if (!metric_key || !metric_name || !data_type) {
            return res.status(400).json({ 
                success: false, 
                error: '请提供 metric_key, metric_name 和 data_type' 
            });
        }

        // 验证 data_type
        if (!['number', 'text', 'select'].includes(data_type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'data_type 必须是 number, text 或 select' 
            });
        }

        // 验证 metric_key 格式（只允许小写字母、数字和下划线）
        if (!/^[a-z0-9_]+$/.test(metric_key)) {
            return res.status(400).json({ 
                success: false, 
                error: 'metric_key 只能包含小写字母、数字和下划线' 
            });
        }

        const result = await pool.query(`
            INSERT INTO metric_templates (
                metric_key, metric_name, data_type, unit,
                min_value, max_value, decimal_places, select_options,
                icon, description, created_by, is_system
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
            RETURNING *
        `, [
            metric_key, metric_name, data_type, unit,
            min_value, max_value, decimal_places, 
            select_options ? JSON.stringify(select_options) : null,
            icon, description, req.user.id
        ]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: '指标标识已存在' });
        }
        console.error('创建指标模板错误:', error);
        res.status(500).json({ success: false, error: '创建指标模板失败' });
    }
});

// ============================================
// 用户指标配置 API
// ============================================

// 获取当前用户的指标配置
app.get('/api/user-metrics', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                umc.id, umc.metric_key, umc.display_order, umc.is_active,
                mt.metric_name, mt.data_type, mt.unit, 
                mt.min_value, mt.max_value, mt.decimal_places, 
                mt.select_options, mt.icon, mt.description,
                mt.is_cumulative, mt.cumulative_period
            FROM user_metrics_config umc
            JOIN metric_templates mt ON umc.metric_key = mt.metric_key
            WHERE umc.user_id = $1 AND umc.is_active = true
            ORDER BY umc.display_order, umc.metric_key
        `, [req.user.id]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('获取用户指标配置错误:', error);
        res.status(500).json({ success: false, error: '获取配置失败' });
    }
});

// 获取当日累计值
app.get('/api/today-cumulative', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const result = await pool.query(`
            SELECT 
                metric_key,
                SUM(CAST(metric_value AS DECIMAL)) as cumulative_value
            FROM (
                SELECT 
                    jsonb_object_keys(metrics) as metric_key,
                    jsonb_each_text(metrics) as metric_pair
                FROM health_records
                WHERE user_id = $1 
                AND created_at >= $2
                AND metrics IS NOT NULL
            ) as expanded
            CROSS JOIN LATERAL (
                SELECT (metric_pair).value as metric_value
            ) as vals
            WHERE (expanded.metric_pair).key = expanded.metric_key
            AND metric_value ~ '^[0-9]+\.?[0-9]*$'
            GROUP BY metric_key
        `, [req.user.id, today]);

        const cumulativeData = {};
        result.rows.forEach(row => {
            cumulativeData[row.metric_key] = parseFloat(row.cumulative_value) || 0;
        });

        res.json({ success: true, data: cumulativeData });
    } catch (error) {
        console.error('获取当日累计错误:', error);
        res.status(500).json({ success: false, error: '获取累计数据失败' });
    }
});

// 更新用户的指标配置
app.post('/api/user-metrics', async (req, res) => {
    try {
        const { metrics } = req.body; // metrics: [{ metric_key, display_order }]

        if (!Array.isArray(metrics)) {
            return res.status(400).json({ 
                success: false, 
                error: 'metrics 必须是数组' 
            });
        }

        // 开启事务
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 先删除当前用户的所有配置
            await client.query(
                'DELETE FROM user_metrics_config WHERE user_id = $1',
                [req.user.id]
            );

            // 插入新配置
            for (let i = 0; i < metrics.length; i++) {
                const { metric_key } = metrics[i];
                const display_order = i + 1;

                // 验证 metric_key 是否存在
                const templateCheck = await client.query(
                    'SELECT metric_key FROM metric_templates WHERE metric_key = $1',
                    [metric_key]
                );

                if (templateCheck.rows.length === 0) {
                    throw new Error(`指标 ${metric_key} 不存在`);
                }

                await client.query(`
                    INSERT INTO user_metrics_config (user_id, metric_key, display_order, is_active)
                    VALUES ($1, $2, $3, true)
                `, [req.user.id, metric_key, display_order]);
            }

            await client.query('COMMIT');

            // 返回更新后的配置
            const result = await client.query(`
                SELECT 
                    umc.id, umc.metric_key, umc.display_order, umc.is_active,
                    mt.metric_name, mt.data_type, mt.unit, 
                    mt.min_value, mt.max_value, mt.decimal_places, 
                    mt.select_options, mt.icon
                FROM user_metrics_config umc
                JOIN metric_templates mt ON umc.metric_key = mt.metric_key
                WHERE umc.user_id = $1 AND umc.is_active = true
                ORDER BY umc.display_order
            `, [req.user.id]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('更新用户指标配置错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '更新配置失败' 
        });
    }
});

// 获取当前用户的健康记录（支持新旧格式）
app.get('/api/records', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM health_records WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({
            success: true,
            data: result.rows.map(row => {
                // 优先使用新格式（JSONB metrics），如果不存在则使用旧格式
                if (row.metrics) {
                    return {
                        id: row.id,
                        metrics: row.metrics,
                        date: row.created_at
                    };
                } else {
                    // 兼容旧格式
                    return {
                        id: row.id,
                        temperature: parseFloat(row.temperature),
                        heartRate: row.heart_rate,
                        oxygen: row.oxygen,
                        weight: row.weight ? parseFloat(row.weight) : null,
                        date: row.created_at
                    };
                }
            })
        });
    } catch (error) {
        console.error('获取记录错误:', error);
        res.status(500).json({ success: false, error: '获取记录失败' });
    }
});

// 创建新的健康记录（支持动态字段）
app.post('/api/records', async (req, res) => {
    try {
        const { metrics } = req.body;

        if (!metrics || typeof metrics !== 'object') {
            return res.status(400).json({ success: false, error: '请提供 metrics 对象' });
        }

        // 获取用户配置的指标，用于验证
        const userMetrics = await pool.query(`
            SELECT 
                mt.metric_key, mt.metric_name, mt.data_type, 
                mt.min_value, mt.max_value, mt.decimal_places
            FROM user_metrics_config umc
            JOIN metric_templates mt ON umc.metric_key = mt.metric_key
            WHERE umc.user_id = $1 AND umc.is_active = true
        `, [req.user.id]);

        const configuredMetrics = userMetrics.rows.reduce((acc, row) => {
            acc[row.metric_key] = row;
            return acc;
        }, {});

        // 验证提交的指标
        const errors = [];
        for (const [key, value] of Object.entries(metrics)) {
            const config = configuredMetrics[key];
            
            if (!config) {
                errors.push(`指标 ${key} 未配置`);
                continue;
            }

            if (config.data_type === 'number') {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    errors.push(`${config.metric_name} 必须是数字`);
                } else {
                    if (config.min_value !== null && numValue < config.min_value) {
                        errors.push(`${config.metric_name} 不能小于 ${config.min_value}`);
                    }
                    if (config.max_value !== null && numValue > config.max_value) {
                        errors.push(`${config.metric_name} 不能大于 ${config.max_value}`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: errors.join('；') 
            });
        }

        // 插入记录
        const result = await pool.query(
            'INSERT INTO health_records (user_id, metrics, created_at) VALUES ($1, $2, NOW()) RETURNING *',
            [req.user.id, JSON.stringify(metrics)]
        );

        const record = result.rows[0];
        res.status(201).json({
            success: true,
            data: {
                id: record.id,
                metrics: record.metrics,
                date: record.created_at
            }
        });
    } catch (error) {
        console.error('创建记录错误:', error);
        res.status(500).json({ success: false, error: '保存记录失败' });
    }
});

// 删除所有记录（仅当前用户）
app.delete('/api/records', async (req, res) => {
    try {
        await pool.query('DELETE FROM health_records WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, message: '所有记录已删除' });
    } catch (error) {
        console.error('删除记录错误:', error);
        res.status(500).json({ success: false, error: '删除记录失败' });
    }
});

// 删除单条记录（仅本人）
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM health_records WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }
        res.json({ success: true, message: '记录已删除' });
    } catch (error) {
        console.error('删除记录错误:', error);
        res.status(500).json({ success: false, error: '删除记录失败' });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log('  健康指标记录应用 - 服务器启动');
    console.log('==========================================');
    console.log(`本地访问: http://localhost:${PORT}`);
    console.log(`公网域名: https://${DOMAIN}`);
    console.log(`API 地址: https://${DOMAIN}/api/records`);
    console.log('==========================================');
});

// 优雅关闭
async function gracefulShutdown(signal) {
    console.log(`\n收到 ${signal} 信号，正在优雅关闭服务器...`);
    
    try {
        // 关闭数据库连接池
        await pool.end();
        console.log('✅ 数据库连接已关闭');
        process.exit(0);
    } catch (error) {
        console.error('❌ 关闭时出错:', error);
        process.exit(1);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));