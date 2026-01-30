import { useState, useEffect, useCallback } from 'react';
import {
  getUserMetrics,
  getRecords,
  createRecord,
  deleteRecord,
  getTodayCumulative,
  getDailyCumulative,
  getLatestValues,
  isLoggedIn,
  DEFAULT_METRICS,
} from '@/services/api';
import type { MetricConfig, HealthRecord } from '@/types';
import { getLocalDateString, getLocalTimeString } from '@/utils/dateUtils';

const LOCAL_RECORDS_KEY = 'health_records_local';
const LOCAL_LAST_VALUES_KEY = 'health_records_last_values';

export function useHealthData() {
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [cumulative, setCumulative] = useState<Record<string, number>>({});
  const [latestValues, setLatestValues] = useState<Record<string, { value: number | string; record_date: string }>>({});
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // 加载本地数据（游客模式）
  const loadLocalData = useCallback(() => {
    try {
      const recordsData = localStorage.getItem(LOCAL_RECORDS_KEY);
      const lastValuesData = localStorage.getItem(LOCAL_LAST_VALUES_KEY);
      
      if (recordsData) {
        setRecords(JSON.parse(recordsData));
      }
      if (lastValuesData) {
        const parsed = JSON.parse(lastValuesData);
        // 转换为新格式
        const formatted: Record<string, { value: number | string; record_date: string }> = {};
        Object.entries(parsed).forEach(([key, val]) => {
          formatted[key] = {
            value: val as number | string,
            record_date: getLocalDateString()
          };
        });
        setLatestValues(formatted);
      }
    } catch (e) {
      console.error('读取本地数据失败:', e);
    }
  }, []);

  // 保存本地记录（游客模式）
  const saveLocalRecord = useCallback((metricKey: string, value: number | string, recordDate?: string) => {
    const date = recordDate || getLocalDateString();
    const newRecord: HealthRecord = {
      id: Date.now(),
      metric_key: metricKey,
      value: value,
      metrics: { [metricKey]: value },
      record_date: date,
      date: new Date().toISOString(),
    };

    setRecords(prev => {
      const updated = [newRecord, ...prev].slice(0, 100);
      localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(updated));
      return updated;
    });

    // 更新最新值
    setLatestValues(prev => {
      const updated = { 
        ...prev, 
        [metricKey]: { value, record_date: date } 
      };
      // 存储简化版本
      const simplified: Record<string, number | string> = {};
      Object.entries(updated).forEach(([k, v]) => {
        simplified[k] = v.value;
      });
      localStorage.setItem(LOCAL_LAST_VALUES_KEY, JSON.stringify(simplified));
      return updated;
    });
  }, []);

  // 加载服务器数据
  const loadServerData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, recordsRes, cumulativeRes, latestRes] = await Promise.all([
        getUserMetrics(),
        getRecords({ limit: 100 }),
        getTodayCumulative(),
        getLatestValues(),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (recordsRes.success && recordsRes.data) {
        setRecords(recordsRes.data);
      }
      if (cumulativeRes.success && cumulativeRes.data) {
        setCumulative(cumulativeRes.data);
      }
      if (latestRes.success && latestRes.data) {
        setLatestValues(latestRes.data);
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    const isAuth = isLoggedIn();
    setAuthenticated(isAuth);

    if (isAuth) {
      loadServerData();
    } else {
      setMetrics(DEFAULT_METRICS);
      loadLocalData();
      setLoading(false);
    }
  }, [loadServerData, loadLocalData]);

  // 保存记录（支持补录）
  const saveRecord = async (
    metricKey: string, 
    value: number | string,
    recordDate?: string,
    recordTime?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!authenticated) {
      saveLocalRecord(metricKey, value, recordDate);
      return { success: true };
    }

    const result = await createRecord({
      metric_key: metricKey,
      value,
      record_date: recordDate || getLocalDateString(),
      record_time: recordTime || getLocalTimeString(),
    });
    
    if (result.success) {
      await loadServerData();
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // 删除记录
  const removeRecord = async (id: number): Promise<{ success: boolean; error?: string }> => {
    if (!authenticated) {
      setRecords(prev => {
        const updated = prev.filter(r => r.id !== id);
        localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(updated));
        return updated;
      });
      return { success: true };
    }

    const result = await deleteRecord(id);
    if (result.success) {
      setRecords(prev => prev.filter(r => r.id !== id));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // 获取指定日期的累计值
  const getCumulativeForDate = async (date: string): Promise<Record<string, number>> => {
    if (!authenticated) {
      // 本地模式：计算指定日期的累计
      const dailyRecords = records.filter(r => r.record_date === date);
      const result: Record<string, number> = {};
      dailyRecords.forEach(r => {
        const key = r.metric_key;
        const val = typeof r.value === 'number' ? r.value : parseFloat(r.value as string);
        if (!isNaN(val)) {
          result[key] = (result[key] || 0) + val;
        }
      });
      return result;
    }

    const res = await getDailyCumulative(date);
    return res.success && res.data ? res.data : {};
  };

  // 刷新数据
  const refresh = useCallback(async () => {
    if (authenticated) {
      await loadServerData();
    } else {
      loadLocalData();
    }
  }, [authenticated, loadServerData, loadLocalData]);

  // 获取指标的最新值
  const getLatestValue = useCallback((metricKey: string): number | string | undefined => {
    return latestValues[metricKey]?.value;
  }, [latestValues]);

  // 获取指标的前一个值（用于计算变化）
  const getPreviousValue = useCallback((metricKey: string): number | string | undefined => {
    const metricRecords = records.filter(r => r.metric_key === metricKey);
    if (metricRecords.length > 1) {
      return metricRecords[1].value;
    }
    return undefined;
  }, [records]);

  return {
    metrics,
    records,
    cumulative,
    latestValues,
    loading,
    authenticated,
    saveRecord,
    removeRecord,
    refresh,
    getLatestValue,
    getPreviousValue,
    getCumulativeForDate,
  };
}
