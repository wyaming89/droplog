import { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/Toast';
import { useHealthData } from '@/hooks/useHealthData';

// 颜色配置
const colorConfig: Record<string, string> = {
  temperature: '#f97316',
  heart_rate: '#ec4899',
  blood_oxygen: '#06b6d4',
  weight: '#3b82f6',
  urine: '#14b8a6',
  water: '#0ea5e9',
  steps: '#22c55e',
  sleep: '#8b5cf6',
  default: '#6b7280',
};

export function TrendPage() {
  const { metrics, records, removeRecord, loading } = useHealthData();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  // 自动选择第一个指标
  const activeMetric = selectedMetric || (metrics.length > 0 ? metrics[0].metric_key : null);
  const currentMetricConfig = metrics.find(m => m.metric_key === activeMetric);

  // 处理图表数据
  const chartData = useMemo(() => {
    if (!activeMetric || records.length === 0) return [];

    // 根据时间范围过滤
    const now = new Date();
    let filterDate = new Date(0);
    if (timeRange === 'week') {
      filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
      filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredRecords = records.filter(r => new Date(r.date) >= filterDate);

    // 按日期分组并取每天最后一条记录
    const dailyData: Record<string, { date: string; value: number }> = {};
    
    filteredRecords.forEach(record => {
      const dateKey = new Date(record.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      const value = record.metrics[activeMetric];
      
      if (value !== undefined && typeof value === 'number') {
        dailyData[dateKey] = { date: dateKey, value };
      }
    });

    return Object.values(dailyData).reverse();
  }, [activeMetric, records, timeRange]);

  // 计算统计数据
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { current: '--', avg: '--', min: '--', max: '--', trend: 0 };
    }

    const values = chartData.map(d => d.value);
    const current = values[values.length - 1];
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const trend = values.length > 1 ? current - values[0] : 0;

    return { current, avg, min, max, trend };
  }, [chartData]);

  const handleDelete = async (id: number) => {
    const result = await removeRecord(id);
    if (result.success) {
      toast.success('记录已删除');
    } else {
      toast.error(result.error || '删除失败');
    }
  };

  const color = currentMetricConfig ? (colorConfig[currentMetricConfig.metric_key] || colorConfig.default) : colorConfig.default;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-gray-400 mb-2">还没有配置指标</p>
        <p className="text-gray-500 text-sm">请先配置健康指标后查看趋势</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">数据趋势</h1>
        <p className="text-gray-400 text-sm">分析您的健康数据变化</p>
      </div>

      {/* 指标选择器 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {metrics.map((metric) => (
          <button
            key={metric.metric_key}
            onClick={() => setSelectedMetric(metric.metric_key)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all font-medium text-sm ${
              activeMetric === metric.metric_key
                ? 'bg-gradient-to-r text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={activeMetric === metric.metric_key ? {
              backgroundImage: `linear-gradient(to right, ${colorConfig[metric.metric_key] || colorConfig.default}, ${colorConfig[metric.metric_key] || colorConfig.default}88)`
            } : undefined}
          >
            {metric.icon} {metric.metric_name}
          </button>
        ))}
      </div>

      {/* 统计数据卡片 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-card rounded-xl p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">当前</div>
          <div className="text-lg font-bold text-white">{stats.current}</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">平均</div>
          <div className="text-lg font-bold text-white">{stats.avg}</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">最低</div>
          <div className="text-lg font-bold text-white">{stats.min}</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">最高</div>
          <div className="text-lg font-bold text-white">{stats.max}</div>
        </div>
      </div>

      {/* 时间范围选择器 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'week', label: '最近7天' },
          { key: 'month', label: '最近30天' },
          { key: 'all', label: '全部' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTimeRange(item.key as typeof timeRange)}
            className={`px-4 py-2 rounded-lg text-sm transition-all font-medium ${
              timeRange === item.key
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 图表卡片 */}
      <div className="bg-card rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-medium">
              {currentMetricConfig?.icon} {currentMetricConfig?.metric_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-white">{stats.current}</span>
              <span className="text-gray-400">{currentMetricConfig?.unit}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
            stats.trend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {stats.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{stats.trend >= 0 ? '+' : ''}{typeof stats.trend === 'number' ? stats.trend.toFixed(1) : stats.trend}</span>
          </div>
        </div>

        {/* 图表 */}
        <div className="h-48">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#999' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${activeMetric})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 历史记录 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">历史记录</h2>
        <div className="space-y-3">
          {(() => {
            // 先过滤出包含当前指标的记录，再取前10条
            const filteredRecords = records
              .filter(record => activeMetric && record.metrics[activeMetric] !== undefined)
              .slice(0, 10);
            
            if (filteredRecords.length === 0) {
              return <div className="text-center py-8 text-gray-500">暂无记录</div>;
            }
            
            return filteredRecords.map((record) => {
              const date = new Date(record.date);
              const value = record.metrics[activeMetric || ''];
              const displayValue = typeof value === 'number' 
                ? value.toFixed(currentMetricConfig?.decimal_places || 0)
                : value;

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm text-gray-400">
                      {date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xl font-bold text-white">{displayValue}</span>
                      <span className="text-gray-400 ml-1">{currentMetricConfig?.unit}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="删除"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
