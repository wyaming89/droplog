const API = { login: '/api/login', register: '/api/register' };
const TOKEN_KEY = 'health_records_token';

const username = document.getElementById('username');
const password = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const registerBtn = document.getElementById('registerBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerLink = document.getElementById('registerLink');
const backLoginLink = document.getElementById('backLoginLink');
const toast = document.getElementById('toast');

function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
}

// 已登录则跳转首页
if (localStorage.getItem(TOKEN_KEY) && !location.hash) {
    location.replace('/');
}

if (location.hash === '#register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});
backLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    doLogin();
});

async function doLogin() {
    const u = (username.value || '').trim();
    const p = password.value || '';
    if (!u || !p) {
        showToast('请输入账号和密码', 'error');
        return;
    }
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>登录中...</span>';
    try {
        const res = await fetch(API.login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showToast(data.error || '登录失败', 'error');
            return;
        }
        setToken(data.data.token);
        showToast('登录成功', 'success');
        setTimeout(() => location.replace('/'), 500);
    } catch (e) {
        showToast('网络错误，请重试', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>登录</span>';
    }
}

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    doRegister();
});

async function doRegister() {
    const u = (regUsername.value || '').trim();
    const p = regPassword.value || '';
    if (!u || !p) {
        showToast('请输入账号和密码', 'error');
        return;
    }
    if (u.length < 2 || u.length > 32) {
        showToast('账号长度 2–32 位', 'error');
        return;
    }
    if (p.length < 6) {
        showToast('密码至少 6 位', 'error');
        return;
    }
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span>注册中...</span>';
    try {
        const res = await fetch(API.register, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showToast(data.error || '注册失败', 'error');
            return;
        }
        showToast('注册成功，请登录', 'success');
        setTimeout(() => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            username.value = u;
            password.value = '';
            regUsername.value = '';
            regPassword.value = '';
        }, 800);
    } catch (e) {
        showToast('网络错误，请重试', 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span>注册</span>';
    }
}
