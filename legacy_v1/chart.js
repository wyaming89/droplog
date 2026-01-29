/**
 * 数据可视化页面 JavaScript
 */

const API_BASE = '';
const TOKEN_KEY = 'health_records_token';
const LOCAL_RECORDS_KEY = 'health_records_local';

let userMetrics = [];
let selectedMetrics = [];
let selectedDays = 7;
let allRecords = [];
let myChart = null;
let isLoggedIn = false;

// DOM 元素
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const metricsSelector = document.getElementById('metricsSelector');
const chartContainer = document.getElementById('chartContainer');
const emptyState = document.getElementById('emptyState');
const statsContainer = document.getElementById('statsContainer');
const toast = document.getElementById('toast');

// 默认指标配置（未登录用户使用）
const DEFAULT_METRICS = [
    { metric_key: 'temperature', metric_name: '体温', icon: '🌡️', unit: '℃', data_type: 'number' },
    { metric_key: 'heart_rate', metric_name: '心率', icon: '❤️', unit: 'bpm', data_type: 'number' },
    { metric_key: 'blood_oxygen', metric_name: '血氧', icon: '🫁', unit: '%', data_type: 'number' },
    { metric_key: 'weight', metric_name: '体重', icon: '⚖️', unit: 'kg', data_type: 'number' }
];

// 工具函数
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function redirectLogin() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login.html';
}

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    };
}

function showToast(message, type = 'info') {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    isLoggedIn = !!getToken();
    
    if (isLoggedIn) {
        await loadUserInfo();
        await loadUserMetrics();
        await loadRecords();
        
        if (logoutBtn) {
            logoutBtn.textContent = '退出';
            logoutBtn.addEventListener('click', redirectLogin);
        }
    } else {
        userMetrics = DEFAULT_METRICS;
        userInfo.textContent = '游客模式（未登录）';
        loadLocalRecords();
        
        if (logoutBtn) {
            logoutBtn.textContent = '登录';
            logoutBtn.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        }
    }
    
    renderMetricsSelector();
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    // 时间范围按钮事件
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDays = parseInt(btn.dataset.days);
            updateChart();
        });
    });
});

// 加载用户信息
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
    }
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
            userMetrics = result.data.filter(m => m.data_type === 'number'); // 只显示数值型指标
        }
    } catch (error) {
        console.error('加载指标配置失败:', error);
        showToast('加载指标失败', 'error');
    }
}

// 加载记录数据
async function loadRecords() {
    try {
        const response = await fetch(`${API_BASE}/api/records`, {
            headers: authHeaders()
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            allRecords = result.data || [];
        }
    } catch (error) {
        console.error('加载记录失败:', error);
        showToast('加载记录失败', 'error');
    }
}

// 加载本地记录
function loadLocalRecords() {
    try {
        const data = localStorage.getItem(LOCAL_RECORDS_KEY);
        allRecords = data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('读取本地记录失败:', e);
        allRecords = [];
    }
}

// 渲染指标选择器
function renderMetricsSelector() {
    if (userMetrics.length === 0) {
        metricsSelector.innerHTML = `
            <div class="empty-state">
                <p>暂无可用指标</p>
            </div>
        `;
        return;
    }
    
    metricsSelector.innerHTML = userMetrics.map(metric => `
        <label class="metric-checkbox" data-key="${metric.metric_key}">
            <input type="checkbox" value="${metric.metric_key}">
            <span class="metric-label">
                <span class="metric-icon">${metric.icon || '📊'}</span>
                <span>${metric.metric_name}</span>
            </span>
        </label>
    `).join('');
    
    // 绑定事件
    metricsSelector.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const label = e.target.closest('.metric-checkbox');
            if (e.target.checked) {
                label.classList.add('selected');
                selectedMetrics.push(e.target.value);
            } else {
                label.classList.remove('selected');
                selectedMetrics = selectedMetrics.filter(m => m !== e.target.value);
            }
            updateChart();
        });
    });
}

// 更新图表
function updateChart() {
    if (selectedMetrics.length === 0) {
        chartContainer.style.display = 'none';
        emptyState.style.display = 'block';
        statsContainer.innerHTML = '<div class="empty-state"><p>请选择要查看的指标</p></div>';
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        return;
    }
    
    chartContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    // 过滤数据
    const filteredRecords = filterRecordsByDays(allRecords, selectedDays);
    
    if (filteredRecords.length === 0) {
        chartContainer.style.display = 'none';
        emptyState.style.display = 'block';
        statsContainer.innerHTML = '<div class="empty-state"><p>暂无数据</p></div>';
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        return;
    }
    
    // 准备图表数据
    const chartData = prepareChartData(filteredRecords);
    
    // 渲染图表
    renderChart(chartData);
    
    // 更新统计信息
    updateStats(filteredRecords);
}

// 过滤记录
function filterRecordsByDays(records, days) {
    if (days === 0) return records;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= cutoffDate;
    });
}

// 准备图表数据
function prepareChartData(records) {
    // 按日期排序
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedRecords.map(record => {
        const date = new Date(record.date);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    
    const datasets = selectedMetrics.map((metricKey, index) => {
        const metric = userMetrics.find(m => m.metric_key === metricKey);
        if (!metric) return null;
        
        const data = sortedRecords.map(record => {
            const value = record.metrics && record.metrics[metricKey];
            return value !== undefined ? parseFloat(value) : null;
        });
        
        const colors = [
            'rgb(102, 126, 234)',
            'rgb(234, 102, 102)',
            'rgb(102, 234, 126)',
            'rgb(234, 198, 102)',
            'rgb(156, 102, 234)',
            'rgb(234, 102, 198)'
        ];
        
        return {
            label: `${metric.metric_name}${metric.unit ? ' (' + metric.unit + ')' : ''}`,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
            tension: 0.3,
            fill: false
        };
    }).filter(d => d !== null);
    
    return { labels, datasets };
}

// 渲染图表
function renderChart(chartData) {
    const canvas = document.getElementById('metricsChart');
    const ctx = canvas.getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// 更新统计信息
function updateStats(records) {
    const statsHTML = selectedMetrics.map(metricKey => {
        const metric = userMetrics.find(m => m.metric_key === metricKey);
        if (!metric) return '';
        
        const values = records
            .map(r => r.metrics && r.metrics[metricKey])
            .filter(v => v !== undefined)
            .map(v => parseFloat(v));
        
        if (values.length === 0) return '';
        
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(metric.decimal_places || 1);
        const max = Math.max(...values).toFixed(metric.decimal_places || 1);
        const min = Math.min(...values).toFixed(metric.decimal_places || 1);
        const latest = values[values.length - 1].toFixed(metric.decimal_places || 1);
        
        return `
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-icon">${metric.icon || '📊'}</span>
                    <span>${metric.metric_name}</span>
                </div>
                <div class="stat-value">${latest} <span style="font-size: 16px; color: #999;">${metric.unit || ''}</span></div>
                <div class="stat-label">最新值</div>
                <div class="stat-detail">
                    <div class="stat-detail-item">
                        <span class="stat-detail-label">平均</span>
                        <span class="stat-detail-value">${avg}</span>
                    </div>
                    <div class="stat-detail-item">
                        <span class="stat-detail-label">最高</span>
                        <span class="stat-detail-value">${max}</span>
                    </div>
                    <div class="stat-detail-item">
                        <span class="stat-detail-label">最低</span>
                        <span class="stat-detail-value">${min}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    statsContainer.innerHTML = statsHTML || '<div class="empty-state"><p>暂无统计数据</p></div>';
}
