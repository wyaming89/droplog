/**
 * 指标配置页面 JavaScript
 */

const API_BASE = '';
const TOKEN_KEY = 'health_records_token';

let allTemplates = [];
let myMetrics = [];
let draggedElement = null;

// DOM 元素
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const myMetricsList = document.getElementById('myMetricsList');
const allMetricsList = document.getElementById('allMetricsList');
const myMetricsCount = document.getElementById('myMetricsCount');
const saveBtn = document.getElementById('saveBtn');
const addCustomBtn = document.getElementById('addCustomBtn');
const customMetricModal = document.getElementById('customMetricModal');
const customMetricForm = document.getElementById('customMetricForm');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const dataTypeSelect = document.getElementById('dataType');
const toast = document.getElementById('toast');

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
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Toast 提示
function showToast(message, type = 'info') {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'success') {
        toast.classList.add('toast-success');
    } else if (type === 'error') {
        toast.classList.add('toast-error');
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.className = 'toast';
        }, 300);
    }, 3000);
}

// 加载用户信息
async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/me`, {
            headers: authHeaders()
        });
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        const result = await response.json();
        if (result.success) {
            userInfo.textContent = `${result.data.username}`;
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

// 加载所有指标模板
async function loadMetricTemplates() {
    try {
        const response = await fetch(`${API_BASE}/api/metric-templates`, {
            headers: authHeaders()
        });
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        const result = await response.json();
        if (result.success) {
            allTemplates = result.data;
            renderAllMetrics();
        }
    } catch (error) {
        console.error('加载指标模板失败:', error);
        allMetricsList.innerHTML = '<div class="empty-state">加载失败，请刷新重试</div>';
    }
}

// 加载用户配置的指标
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
            myMetrics = result.data;
            myMetricsCount.textContent = myMetrics.length;
            renderMyMetrics();
            renderAllMetrics();
        }
    } catch (error) {
        console.error('加载用户指标配置失败:', error);
        myMetricsList.innerHTML = '<div class="empty-state">加载失败，请刷新重试</div>';
    }
}

// 渲染我的指标列表
function renderMyMetrics() {
    if (myMetrics.length === 0) {
        myMetricsList.innerHTML = '<div class="empty-state">还没有配置指标，请从下方添加</div>';
        return;
    }

    myMetricsList.innerHTML = myMetrics.map((metric, index) => {
        const typeText = metric.data_type === 'number' ? '数值' : 
                        metric.data_type === 'text' ? '文本' : '选择';
        const unitText = metric.unit ? ` [${metric.unit}]` : '';
        
        return `
            <div class="metric-item" draggable="true" data-index="${index}" data-key="${metric.metric_key}">
                <div class="metric-drag-handle">☰</div>
                <div class="metric-icon">${metric.icon || '📊'}</div>
                <div class="metric-info">
                    <div class="metric-name">${metric.metric_name}</div>
                    <div class="metric-details">${typeText}${unitText} · ${metric.metric_key}</div>
                </div>
                <button class="metric-remove" data-key="${metric.metric_key}">删除</button>
            </div>
        `;
    }).join('');

    // 添加拖拽事件
    attachDragEvents();
    
    // 添加删除事件
    document.querySelectorAll('.metric-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.key;
            removeMetric(key);
        });
    });
}

// 渲染所有可用指标
function renderAllMetrics() {
    const myKeys = new Set(myMetrics.map(m => m.metric_key));
    
    allMetricsList.innerHTML = allTemplates.map(template => {
        const isAdded = myKeys.has(template.metric_key);
        const typeText = template.data_type === 'number' ? '数值' : 
                        template.data_type === 'text' ? '文本' : '选择';
        
        return `
            <div class="metric-card ${isAdded ? 'disabled' : ''}" 
                 data-key="${template.metric_key}"
                 ${isAdded ? '' : 'onclick="addMetric(\'' + template.metric_key + '\')"'}>
                <div class="metric-card-icon">${template.icon || '📊'}</div>
                <div class="metric-card-name">${template.metric_name}</div>
                <div class="metric-card-type">${typeText}</div>
            </div>
        `;
    }).join('');
}

// 添加指标
function addMetric(metricKey) {
    const template = allTemplates.find(t => t.metric_key === metricKey);
    if (!template) return;
    
    if (myMetrics.some(m => m.metric_key === metricKey)) {
        showToast('该指标已添加', 'info');
        return;
    }
    
    myMetrics.push(template);
    myMetricsCount.textContent = myMetrics.length;
    renderMyMetrics();
    renderAllMetrics();
}

// 移除指标
function removeMetric(metricKey) {
    myMetrics = myMetrics.filter(m => m.metric_key !== metricKey);
    myMetricsCount.textContent = myMetrics.length;
    renderMyMetrics();
    renderAllMetrics();
}

// 拖拽相关
function attachDragEvents() {
    const items = document.querySelectorAll('.metric-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(myMetricsList, e.clientY);
    if (afterElement == null) {
        myMetricsList.appendChild(draggedElement);
    } else {
        myMetricsList.insertBefore(draggedElement, afterElement);
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // 更新 myMetrics 数组顺序
    const items = Array.from(document.querySelectorAll('.metric-item'));
    const newOrder = items.map(item => item.dataset.key);
    myMetrics = newOrder.map(key => myMetrics.find(m => m.metric_key === key));
    
    renderMyMetrics();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.metric-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 保存配置
async function saveConfiguration() {
    if (myMetrics.length === 0) {
        showToast('请至少选择一个指标', 'error');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    try {
        const response = await fetch(`${API_BASE}/api/user-metrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({
                metrics: myMetrics.map((m, index) => ({
                    metric_key: m.metric_key,
                    display_order: index + 1
                }))
            })
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('配置已保存', 'success');
            // 延迟跳转，让用户看到提示
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showToast('保存失败：' + result.error, 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存失败，请重试', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存配置';
    }
}

// 自定义指标模态框
function showCustomMetricModal() {
    customMetricModal.classList.add('show');
    customMetricForm.reset();
    updateFormFields();
}

function hideCustomMetricModal() {
    customMetricModal.classList.remove('show');
}

function updateFormFields() {
    const dataType = dataTypeSelect.value;
    
    // 根据数据类型显示/隐藏相关字段
    document.getElementById('unitGroup').style.display = dataType === 'number' ? 'block' : 'none';
    document.getElementById('minValueGroup').style.display = dataType === 'number' ? 'block' : 'none';
    document.getElementById('maxValueGroup').style.display = dataType === 'number' ? 'block' : 'none';
    document.getElementById('decimalPlacesGroup').style.display = dataType === 'number' ? 'block' : 'none';
    document.getElementById('selectOptionsGroup').style.display = dataType === 'select' ? 'block' : 'none';
}

async function createCustomMetric(e) {
    e.preventDefault();
    
    const formData = new FormData(customMetricForm);
    const data = {
        metric_key: formData.get('metricKey').trim(),
        metric_name: formData.get('metricName').trim(),
        data_type: formData.get('dataType'),
        icon: formData.get('icon')?.trim() || null,
        description: formData.get('description')?.trim() || null
    };
    
    if (data.data_type === 'number') {
        data.unit = formData.get('unit')?.trim() || null;
        data.min_value = formData.get('minValue') ? parseFloat(formData.get('minValue')) : null;
        data.max_value = formData.get('maxValue') ? parseFloat(formData.get('maxValue')) : null;
        data.decimal_places = parseInt(formData.get('decimalPlaces')) || 0;
    } else if (data.data_type === 'select') {
        const options = formData.get('selectOptions')?.trim();
        if (!options) {
            showToast('请输入选择项', 'error');
            return;
        }
        data.select_options = options.split('\n').map(s => s.trim()).filter(s => s);
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/metric-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            redirectLogin();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('自定义指标创建成功', 'success');
            hideCustomMetricModal();
            await loadMetricTemplates();
            // 自动添加到我的指标
            addMetric(result.data.metric_key);
        } else {
            showToast('创建失败：' + result.error, 'error');
        }
    } catch (error) {
        console.error('创建自定义指标失败:', error);
        showToast('创建失败，请重试', 'error');
    }
}

// 事件监听
backBtn.addEventListener('click', () => {
    window.location.href = '/';
});

logoutBtn.addEventListener('click', redirectLogin);

saveBtn.addEventListener('click', saveConfiguration);

addCustomBtn.addEventListener('click', showCustomMetricModal);

modalCloseBtn.addEventListener('click', hideCustomMetricModal);

modalCancelBtn.addEventListener('click', hideCustomMetricModal);

dataTypeSelect.addEventListener('change', updateFormFields);

customMetricForm.addEventListener('submit', createCustomMetric);

// 点击模态框背景关闭
customMetricModal.addEventListener('click', (e) => {
    if (e.target === customMetricModal) {
        hideCustomMetricModal();
    }
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    if (!getToken()) {
        redirectLogin();
        return;
    }
    
    await loadUserInfo();
    await loadMetricTemplates();
    await loadUserMetrics();
});
