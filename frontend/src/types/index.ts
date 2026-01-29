// 指标配置类型
export interface MetricConfig {
  id?: number;
  metric_key: string;
  metric_name: string;
  data_type: 'number' | 'text' | 'select';
  unit?: string;
  min_value?: number | null;
  max_value?: number | null;
  decimal_places?: number;
  select_options?: string[];
  icon?: string;
  description?: string;
  is_cumulative?: boolean;
  cumulative_period?: string;
  display_order?: number;
  is_active?: boolean;
  is_system?: boolean;
  created_by?: number;
}

// 健康记录类型（规范化存储）
export interface HealthRecord {
  id: number;
  metric_key: string;
  value: number | string;
  metrics: Record<string, number | string>;  // 兼容旧格式
  record_date: string;  // YYYY-MM-DD
  record_time?: string; // HH:MM:SS
  date: string;         // created_at
}

// 最新值类型
export interface LatestValue {
  value: number | string;
  record_date: string;
  record_time?: string;
}

// 用户信息类型
export interface UserInfo {
  id: number;
  username: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 登录响应类型
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

// Tab 类型
export type TabType = 'home' | 'trend' | 'settings';

// 数据录入类型
export interface DataEntryType {
  key: string;
  title: string;
  unit: string;
  icon: string;
  color: string;
  gradient: string;
  increments: string[];
  defaultValue: string;
  decimalPlaces: number;
  min?: number;
  max?: number;
}
