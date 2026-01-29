import type { ApiResponse, HealthRecord, LoginResponse, MetricConfig, UserInfo } from '@/types';

const API_BASE = '';
const TOKEN_KEY = 'health_records_token';

// Token 管理
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// 构建请求头
function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      clearToken();
      window.location.href = '/login';
      return { success: false, error: '请先登录' };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API 请求错误:', error);
    return { success: false, error: '网络错误，请重试' };
  }
}

// 用户相关 API
export async function login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
  return request<LoginResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username: string, password: string): Promise<ApiResponse<null>> {
  return request<null>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getCurrentUser(): Promise<ApiResponse<UserInfo>> {
  return request<UserInfo>('/api/me');
}

// 指标配置相关 API
export async function getUserMetrics(): Promise<ApiResponse<MetricConfig[]>> {
  return request<MetricConfig[]>('/api/user-metrics');
}

export async function getMetricTemplates(): Promise<ApiResponse<MetricConfig[]>> {
  return request<MetricConfig[]>('/api/metric-templates');
}

export async function updateUserMetrics(metrics: { metric_key: string }[]): Promise<ApiResponse<MetricConfig[]>> {
  return request<MetricConfig[]>('/api/user-metrics', {
    method: 'POST',
    body: JSON.stringify({ metrics }),
  });
}

// 健康记录相关 API
export async function getRecords(options?: {
  metric_key?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<ApiResponse<HealthRecord[]>> {
  const params = new URLSearchParams();
  if (options?.metric_key) params.append('metric_key', options.metric_key);
  if (options?.start_date) params.append('start_date', options.start_date);
  if (options?.end_date) params.append('end_date', options.end_date);
  if (options?.limit) params.append('limit', options.limit.toString());
  
  const url = `/api/records${params.toString() ? '?' + params.toString() : ''}`;
  return request<HealthRecord[]>(url);
}

// 创建记录（支持补录）
export async function createRecord(data: {
  metric_key: string;
  value: number | string;
  record_date?: string;  // YYYY-MM-DD，不传则为今天
  record_time?: string;  // HH:MM，可选
}): Promise<ApiResponse<HealthRecord>> {
  return request<HealthRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(id: number): Promise<ApiResponse<null>> {
  return request<null>(`/api/records/${id}`, {
    method: 'DELETE',
  });
}

export async function deleteAllRecords(): Promise<ApiResponse<null>> {
  return request<null>('/api/records', {
    method: 'DELETE',
  });
}

// 获取各指标最新值
export async function getLatestValues(): Promise<ApiResponse<Record<string, { value: number | string; record_date: string; record_time?: string }>>> {
  return request('/api/latest-values');
}

// 累计数据 API
export async function getTodayCumulative(): Promise<ApiResponse<Record<string, number>>> {
  return request<Record<string, number>>('/api/today-cumulative');
}

// 获取指定日期的累计值
export async function getDailyCumulative(date?: string): Promise<ApiResponse<Record<string, number>>> {
  const url = date ? `/api/daily-cumulative?date=${date}` : '/api/daily-cumulative';
  return request<Record<string, number>>(url);
}

// 默认指标配置（未登录用户使用）
export const DEFAULT_METRICS: MetricConfig[] = [
  {
    metric_key: 'temperature',
    metric_name: '体温',
    icon: '🌡️',
    data_type: 'number',
    unit: '℃',
    min_value: 35,
    max_value: 42,
    decimal_places: 1,
    is_cumulative: false,
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
    is_cumulative: false,
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
    is_cumulative: false,
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
    is_cumulative: false,
  },
];
