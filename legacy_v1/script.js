/**
 * 健康指标记录 - 动态表单版本
 */

// API 与登录
const API_BASE = '';
const TOKEN_KEY = 'health_records_token';
const LOCAL_RECORDS_KEY = 'health_records_local';
const LOCAL_LAST_VALUES_KEY = 'health_records_last_values';

let userMetrics = []; // 用户配置的指标
let todayCumulative = {}; // 当日累计数据
let lastRecordValues = {}; // 上次记录的值（用于非累计型指标的默认值）
let isLoggedIn = false; // 登录状态

// 默认指标配置（未登录用户使用）
const DEFAULT_METRICS = [
    {
        metric_key: 'temperature',
        metric_name: '体温',
        icon: '🌡️',
        data_type: 'number',
        unit: '℃',
        min_value: 35,
        max_value: 42,
        decimal_places: 1,
        is_cumulative: false
    },
    {
        metric_key: 'heart_rate',
        metric_name: '心率',
        icon: '❤️',
        data_type: 'number',
        unit: 'bpm',
        min_value: 40,
        max_value: 200,
        decimal_places: 0,
        is_cumulative: false
    },
    {
        metric_key: 'blood_oxygen',
        metric_name: '血氧',
        icon: '🫁',
        data_type: 'number',
        unit: '%',
        min_value: 0,
        max_value: 100,
        decimal_places: 0,
        is_cumulative: false
    },
    {
        metric_key: 'weight',
        metric_name: '体重',
        icon: '⚖️',
        data_type: 'number',
        unit: 'kg',
        min_value: 0,
        max_value: 300,
        decimal_places: 1,
        is_cumulative: false
    }
];

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
    const t = getToken();
    return {
        'Content-Type': 'application/json',
        ...(t ? { 'Authorization': 'Bearer ' + t } : {})
    };
}

function redirectLogin() {
    clearToken();
    location.replace('/login.html');
}

// DOM 元素
const recordForm = document.getElementById('recordForm');
const formLoading = document.getElementById('formLoading');
const historyList = document.getElementById('historyList');
const currentDateEl = document.getElementById('currentDate');
const userInfo = document.getElementById('userInfo');
const toast = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');
const configBtn = document.getElementById('configBtn');
const chartBtn = document.getElementById('chartBtn');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    updateCurrentDate();
    
    // 检查登录状态
    isLoggedIn = !!getToken();
    
    if (isLoggedIn) {
        // 已登录模式
        await loadUserInfo();
        await loadUserMetrics();
        await loadTodayCumulative();
        await loadLastRecordValues();
        renderForm();
        await loadHistory();
        
        // 显示退出和配置按钮
        if (logoutBtn) {
            logoutBtn.textContent = '退出';
            logoutBtn.addEventListener('click', redirectLogin);
        }
        if (configBtn) {
            configBtn.style.display = '';
            configBtn.addEventListener('click', () => {
                window.location.href = '/metrics-config.html';
            });
        }
        if (chartBtn) {
            chartBtn.style.display = '';
            chartBtn.addEventListener('click', () => {
                window.location.href = '/chart.html';
            });
        }
    } else {
        // 未登录模式 - 使用默认指标
        userMetrics = DEFAULT_METRICS;
        userInfo.textContent = '游客模式（未登录）';
        
        // 加载本地数据
        loadLocalLastValues();
        renderForm();
        loadLocalHistory();
        
        // 将退出按钮改为登录按钮
        if (logoutBtn) {
            logoutBtn.textContent = '登录';
            logoutBtn.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        }
        // 隐藏配置按钮（未登录用户不能配置，但可以查看图表）
        if (configBtn) {
            configBtn.style.display = 'none';
        }
        // 显示图表按钮
        if (chartBtn) {
            chartBtn.style.display = '';
            chartBtn.addEventListener('click', () => {
                window.location.href = '/chart.html';
            });
        }
    }
});

// 加载当前用户信息
async function loadUserInfo() {
    try {
        const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() });
        if (res.status === 401) {
            redirectLogin();
            return;
        }
        const data = await res.json();
        if (data.success && data.data) {
            userInfo.textContent = `当前用户：${data.data.username}`;
        }
    } catch (e) {
        console.error('加载用户信息失败:', e);
        userInfo.textContent = '';
    }
}

// 更新当前日期显示
function updateCurrentDate() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    currentDateEl.textContent = now.toLocaleDateString('zh-CN', options);
}

// 加载用户指标配置
async function loadUserMetrics() {
    try {
        const response = await fetch(`${API_BASE}/api/user-metrics`, {
            headers: authHeaders()
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            userMetrics = result.data;
            
            if (userMetrics.length === 0) {
                // 没有配置指标，提示用户去配置
                recordForm.innerHTML = `
                    <div class="empty-state">
                        <p>还没有配置指标</p>
                        <p class="empty-hint">请点击右上角 ⚙️ 配置您的健康指标</p>
                        <button class="btn-primary" onclick="location.href='/metrics-config.html'">
                            去配置
                        </button>
                    </div>
                `;
            }
            // 不在这里调用 renderForm()，等 loadTodayCumulative() 完成后再渲染
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('加载指标配置失败:', error);
        recordForm.innerHTML = `
            <div class="empty-state">
                <p>加载失败</p>
                <p class="empty-hint">${error.message || '请刷新重试'}</p>
            </div>
        `;
    }
}

// 加载当日累计数据
async function loadTodayCumulative() {
    try {
        const response = await fetch(`${API_BASE}/api/today-cumulative`, {
            headers: authHeaders()
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            todayCumulative = result.data;
            // 如果表单已渲染，更新累计显示
            updateCumulativeDisplay();
        }
    } catch (error) {
        console.error('加载当日累计失败:', error);
    }
}

// 加载上次记录的值（用于非累计型指标的默认值）
async function loadLastRecordValues() {
    try {
        const response = await fetch(`${API_BASE}/api/records?limit=1`, {
            headers: authHeaders()
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const lastRecord = result.data[0];
            // 提取 metrics 中的值
            if (lastRecord.metrics) {
                lastRecordValues = { ...lastRecord.metrics };
            }
        }
    } catch (error) {
        console.error('加载上次记录失败:', error);
    }
}

// 渲染动态表单
function renderForm() {
    const formHTML = userMetrics.map(metric => {
        return renderFormField(metric);
    }).join('');
    
    recordForm.innerHTML = `
        ${formHTML}
        <button class="submit-btn" id="submitBtn">
            <span>保存记录</span>
        </button>
    `;
    
    // 绑定提交事件
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    
    // 回车键提交
    recordForm.querySelectorAll('.health-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
    });
}

// 渲染单个表单字段
function renderFormField(metric) {
    const icon = metric.icon || '📊';
    const label = metric.metric_name;
    const unit = metric.unit || '';
    const key = metric.metric_key;
    const isCumulative = metric.is_cumulative || false;
    const cumulativeValue = todayCumulative[key] || 0;
    
    // 对于非累计型指标，使用上次的值作为默认值
    const lastValue = !isCumulative && lastRecordValues[key] !== undefined ? lastRecordValues[key] : '';
    
    if (metric.data_type === 'number') {
        const step = metric.decimal_places > 0 ? (1 / Math.pow(10, metric.decimal_places)).toFixed(metric.decimal_places) : '1';
        const placeholder = metric.min_value !== null ? String(metric.min_value) : '0';
        
        // 累计型指标显示提示信息
        const cumulativeHint = isCumulative ? 
            `<div class="cumulative-info" id="cumulative-${key}">
                今日累计：<span class="cumulative-value">${cumulativeValue.toFixed(metric.decimal_places || 0)}</span> ${unit}
            </div>` : '';
        
        const labelSuffix = isCumulative ? ' <span class="cumulative-badge">累计</span>' : '';
        
        return `
            <div class="input-group ${isCumulative ? 'cumulative-metric' : ''}">
                <label class="input-label">
                    <span class="label-icon">${icon}</span>
                    <span class="label-text">${label}${unit ? ' (' + unit + ')' : ''}${labelSuffix}</span>
                </label>
                <div class="input-wrapper">
                    <input type="number" 
                           id="${key}" 
                           class="health-input" 
                           data-key="${key}"
                           data-type="number"
                           data-cumulative="${isCumulative}"
                           ${lastValue !== '' ? `value="${lastValue}"` : ''}
                           placeholder="${isCumulative ? '本次增量' : placeholder}"
                           step="${step}"
                           ${metric.min_value !== null ? `min="${metric.min_value}"` : ''}
                           ${metric.max_value !== null ? `max="${metric.max_value}"` : ''}>
                    ${unit ? `<span class="input-unit">${unit}</span>` : ''}
                </div>
                ${cumulativeHint}
            </div>
        `;
    } else if (metric.data_type === 'text') {
        return `
            <div class="input-group">
                <label class="input-label">
                    <span class="label-icon">${icon}</span>
                    <span class="label-text">${label}</span>
                </label>
                <div class="input-wrapper">
                    <input type="text" 
                           id="${key}" 
                           class="health-input" 
                           data-key="${key}"
                           data-type="text"
                           ${lastValue !== '' ? `value="${lastValue}"` : ''}
                           placeholder="请输入${label}">
                </div>
            </div>
        `;
    } else if (metric.data_type === 'select') {
        const options = metric.select_options || [];
        const optionsHTML = options.map(opt => 
            `<option value="${opt}" ${lastValue === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');
        
        return `
            <div class="input-group">
                <label class="input-label">
                    <span class="label-icon">${icon}</span>
                    <span class="label-text">${label}</span>
                </label>
                <div class="input-wrapper">
                    <select id="${key}" 
                            class="health-input" 
                            data-key="${key}"
                            data-type="select">
                        <option value="">请选择</option>
                        ${optionsHTML}
                    </select>
                </div>
            </div>
        `;
    }
    
    return '';
}

// 处理提交
async function handleSubmit() {
    const metrics = {};
    const errors = [];
    
    // 收集并验证所有字段
    userMetrics.forEach(metricConfig => {
        const input = document.getElementById(metricConfig.metric_key);
        if (!input) return;
        
        const value = input.value.trim();
        
        // 检查是否为空
        if (!value) {
            errors.push(`请填写 ${metricConfig.metric_name}`);
            return;
        }
        
        if (metricConfig.data_type === 'number') {
            const numValue = parseFloat(value);
            
            if (isNaN(numValue)) {
                errors.push(`${metricConfig.metric_name} 必须是数字`);
                return;
            }
            
            // 验证范围
            if (metricConfig.min_value !== null && numValue < metricConfig.min_value) {
                errors.push(`${metricConfig.metric_name} 不能小于 ${metricConfig.min_value}`);
                return;
            }
            
            if (metricConfig.max_value !== null && numValue > metricConfig.max_value) {
                errors.push(`${metricConfig.metric_name} 不能大于 ${metricConfig.max_value}`);
                return;
            }
            
            metrics[metricConfig.metric_key] = numValue;
        } else {
            metrics[metricConfig.metric_key] = value;
        }
    });
    
    if (errors.length > 0) {
        showToast(errors[0], 'error');
        return;
    }
    
    // 未登录用户提示注册
    if (!isLoggedIn) {
        showRegistrationPrompt(metrics);
        return;
    }
    
    // 禁用提交按钮
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>保存中...</span>';
    
    try {
        await saveRecord({ metrics });
        
        // 更新 lastRecordValues（保存非累计型指标的值）
        userMetrics.forEach(metric => {
            if (!metric.is_cumulative && metrics[metric.metric_key] !== undefined) {
                lastRecordValues[metric.metric_key] = metrics[metric.metric_key];
            }
        });
        
        await loadTodayCumulative(); // 重新加载累计数据
        renderForm(); // 重新渲染表单：累计型清空，非累计型自动填充上次的值
        await loadHistory();
        showToast('记录已保存', 'success');
    } catch (error) {
        console.error('保存记录错误:', error);
        showToast(error.message || '保存失败，请重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>保存记录</span>';
    }
}

// 保存记录到服务器
async function saveRecord(record) {
    const response = await fetch(`${API_BASE}/api/records`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(record)
    });
    
    if (response.status === 401) {
        redirectLogin();
        return;
    }
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
        throw new Error(result.error || '保存失败');
    }
    
    return result.data;
}

// 获取所有记录
async function getRecords() {
    try {
        const response = await fetch(`${API_BASE}/api/records`, {
            headers: authHeaders()
        });
        
        if (response.status === 401) {
            redirectLogin();
            return [];
        }
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || '获取记录失败');
        }
        
        return result.data || [];
    } catch (error) {
        console.error('获取记录错误:', error);
        showToast('加载记录失败', 'error');
        return [];
    }
}

// 清空表单
function clearForm() {
    userMetrics.forEach(metric => {
        const input = document.getElementById(metric.metric_key);
        if (input) {
            // 只清空累计型指标，非累计型保留默认值
            const isCumulative = metric.is_cumulative || false;
            if (isCumulative) {
                input.value = '';
            }
            // 非累计型指标的值不清空，保持上次的值
        }
    });
    
    // 聚焦第一个累计型输入框（如果有）或第一个输入框
    const firstCumulativeInput = recordForm.querySelector('.health-input[data-cumulative="true"]');
    const firstInput = firstCumulativeInput || recordForm.querySelector('.health-input');
    if (firstInput) {
        firstInput.focus();
    }
}

// 加载历史记录
async function loadHistory() {
    historyList.innerHTML = `
        <div class="empty-state">
            <p>加载中...</p>
        </div>
    `;
    
    const records = await getRecords();
    
    if (records.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>暂无记录</p>
                <p class="empty-hint">开始记录您的健康指标吧</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = records.map(record => createRecordHTML(record)).join('');
}

// 创建记录项HTML
function createRecordHTML(record) {
    const date = new Date(record.date);
    const dateStr = date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
    });
    const timeStr = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // 获取记录的指标数据
    const metrics = record.metrics || {};
    
    // 根据用户配置的指标顺序显示
    const dataItemsHTML = userMetrics.map(metricConfig => {
        const value = metrics[metricConfig.metric_key];
        
        if (value === undefined || value === null) {
            return `
                <div class="data-item">
                    <div class="data-value">--</div>
                    <div class="data-label">${metricConfig.metric_name}${metricConfig.unit ? ' ' + metricConfig.unit : ''}</div>
                </div>
            `;
        }
        
        let displayValue;
        let statusClass = '';
        
        if (metricConfig.data_type === 'number') {
            const numValue = parseFloat(value);
            displayValue = metricConfig.decimal_places > 0 
                ? numValue.toFixed(metricConfig.decimal_places)
                : numValue.toString();
            
            // 简单的状态判断（可以根据需求扩展）
            if (metricConfig.min_value !== null && numValue < metricConfig.min_value) {
                statusClass = 'status-low';
            } else if (metricConfig.max_value !== null && numValue > metricConfig.max_value) {
                statusClass = 'status-high';
            } else {
                statusClass = 'status-normal';
            }
        } else {
            displayValue = value;
            statusClass = 'status-normal';
        }
        
        return `
            <div class="data-item">
                <div class="data-value ${statusClass}">${displayValue}</div>
                <div class="data-label">${metricConfig.metric_name}${metricConfig.unit ? ' ' + metricConfig.unit : ''}</div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="record-item">
            <div class="record-header">
                <span class="record-date">${dateStr}</span>
                <span class="record-time">${timeStr}</span>
            </div>
            <div class="record-data">
                ${dataItemsHTML}
            </div>
        </div>
    `;
}

// 更新累计显示
function updateCumulativeDisplay() {
    userMetrics.forEach(metric => {
        if (metric.is_cumulative) {
            const cumulativeEl = document.getElementById(`cumulative-${metric.metric_key}`);
            if (cumulativeEl) {
                const value = todayCumulative[metric.metric_key] || 0;
                const valueSpan = cumulativeEl.querySelector('.cumulative-value');
                if (valueSpan) {
                    valueSpan.textContent = value.toFixed(metric.decimal_places || 0);
                }
            }
        }
    });
}

// 显示提示消息
function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ========== 本地存储相关函数（未登录模式） ==========

// 显示注册提示模态框
function showRegistrationPrompt(metrics) {
    // 先保存到本地
    saveLocalRecord(metrics);
    
    // 显示提示
    const modalHTML = `
        <div class="modal-overlay" id="registerPromptModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                <div class="modal-header" style="margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 20px; color: #333;">💡 提示</h3>
                </div>
                <div class="modal-body" style="margin-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; color: #666; line-height: 1.6;">您的数据已保存在本地浏览器中。</p>
                    <p style="margin: 0; color: #666; line-height: 1.6;">创建账号后，可以在多设备间同步您的健康数据，永久保存！</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="closeRegisterPrompt()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">继续使用本地</button>
                    <button class="btn-primary" onclick="goToRegister()" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">创建账号</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
}

// 关闭注册提示
window.closeRegisterPrompt = function() {
    const modal = document.getElementById('registerPromptModal');
    if (modal) {
        modal.remove();
    }
};

// 跳转到注册页面
window.goToRegister = function() {
    window.location.href = '/login.html#register';
};

// 保存记录到本地
function saveLocalRecord(metrics) {
    const records = getLocalRecords();
    
    const newRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        metrics: metrics
    };
    
    records.unshift(newRecord);
    
    // 只保留最近50条记录
    if (records.length > 50) {
        records.length = 50;
    }
    
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
    
    // 更新上次的值
    userMetrics.forEach(metric => {
        if (!metric.is_cumulative && metrics[metric.metric_key] !== undefined) {
            lastRecordValues[metric.metric_key] = metrics[metric.metric_key];
        }
    });
    localStorage.setItem(LOCAL_LAST_VALUES_KEY, JSON.stringify(lastRecordValues));
    
    // 刷新显示
    renderForm();
    loadLocalHistory();
}

// 获取本地记录
function getLocalRecords() {
    try {
        const data = localStorage.getItem(LOCAL_RECORDS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('读取本地记录失败:', e);
        return [];
    }
}

// 加载本地上次的值
function loadLocalLastValues() {
    try {
        const data = localStorage.getItem(LOCAL_LAST_VALUES_KEY);
        if (data) {
            lastRecordValues = JSON.parse(data);
        }
    } catch (e) {
        console.error('读取本地上次值失败:', e);
    }
}

// 加载本地历史记录
function loadLocalHistory() {
    const records = getLocalRecords();
    
    if (records.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>暂无记录</p>
                <p class="empty-hint">开始记录您的健康指标吧</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = records.map(record => createRecordHTML(record)).join('');
}
