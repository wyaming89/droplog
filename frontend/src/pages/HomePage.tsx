import { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { HealthCard } from '@/components/HealthCard';
import { DataEntryModal } from '@/components/DataEntryModal';
import { toast } from '@/components/ui/Toast';
import { useHealthData } from '@/hooks/useHealthData';
import type { MetricConfig } from '@/types';

export function HomePage() {
  const { metrics, records, cumulative, loading, saveRecord, refresh, getLatestValue, getPreviousValue } = useHealthData();
  const [selectedMetric, setSelectedMetric] = useState<MetricConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });


  const handleCardClick = (metric: MetricConfig) => {
    setSelectedMetric(metric);
  };

  const handleSave = async (value: number | string, recordDate?: string) => {
    if (!selectedMetric) return;

    const result = await saveRecord(
      selectedMetric.metric_key,
      value,
      recordDate
    );
    
    if (result.success) {
      const dateHint = recordDate ? ` (${recordDate})` : '';
      toast.success(`${selectedMetric.metric_name}记录成功：${value} ${selectedMetric.unit || ''}${dateHint}`);
      setSelectedMetric(null);
    } else {
      toast.error(result.error || '保存失败');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast.success('数据已刷新');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">点滴健康</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Calendar className="w-4 h-4" />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* 数据卡片网格 */}
      {metrics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-2">还没有配置指标</p>
          <p className="text-gray-500 text-sm">请前往「我的」页面配置健康指标</p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.metric_key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <HealthCard
                metric={metric}
                value={getLatestValue(metric.metric_key)}
                previousValue={getPreviousValue(metric.metric_key)}
                cumulative={cumulative[metric.metric_key]}
                onClick={() => handleCardClick(metric)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 最近记录预览 */}
      {records.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">最近记录</h2>
          <div className="space-y-3">
            {records.slice(0, 5).map((record) => {
              const metricConfig = metrics.find(m => m.metric_key === record.metric_key);
              if (!metricConfig) return null;
              
              const displayValue = typeof record.value === 'number' 
                ? record.value.toFixed(metricConfig.decimal_places || 0)
                : record.value;
              
              // 显示记录日期，如果是补录则显示补录日期
              const recordDate = record.record_date;
              const createdDate = new Date(record.date);
              const isBackfill = recordDate !== createdDate.toISOString().split('T')[0];

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{metricConfig.icon}</span>
                      <div>
                        <div className="text-white font-medium">
                          {displayValue} <span className="text-gray-500 text-sm">{metricConfig.unit}</span>
                        </div>
                        <div className="text-xs text-gray-500">{metricConfig.metric_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">{recordDate}</div>
                      {isBackfill && (
                        <div className="text-xs text-orange-400">补录</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 数据录入弹窗 */}
      {selectedMetric && (
        <DataEntryModal
          metric={selectedMetric}
          currentValue={getLatestValue(selectedMetric.metric_key)}
          cumulative={cumulative[selectedMetric.metric_key]}
          onClose={() => setSelectedMetric(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
