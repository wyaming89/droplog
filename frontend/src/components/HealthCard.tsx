import { motion } from 'framer-motion';
import { Thermometer, Heart, Wind, Scale, Droplets, Footprints, Moon, Activity } from 'lucide-react';
import type { MetricConfig } from '@/types';

interface HealthCardProps {
  metric: MetricConfig;
  value?: number | string;
  previousValue?: number | string;
  cumulative?: number;
  onClick: () => void;
}

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  heart_rate: Heart,
  blood_oxygen: Wind,
  weight: Scale,
  urine: Droplets,
  water: Droplets,
  steps: Footprints,
  sleep: Moon,
  default: Activity,
};

// 颜色主题映射
const themeMap: Record<string, { gradient: string; iconBg: string; changeBg: string }> = {
  temperature: {
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  heart_rate: {
    gradient: 'from-pink-500 to-rose-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  blood_oxygen: {
    gradient: 'from-cyan-500 to-blue-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  weight: {
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  urine: {
    gradient: 'from-cyan-500 to-teal-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  water: {
    gradient: 'from-blue-400 to-cyan-500',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  steps: {
    gradient: 'from-green-500 to-emerald-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  sleep: {
    gradient: 'from-indigo-500 to-purple-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
  default: {
    gradient: 'from-gray-500 to-gray-600',
    iconBg: 'bg-white/20',
    changeBg: 'bg-white/20',
  },
};

export function HealthCard({ metric, value, previousValue, cumulative, onClick }: HealthCardProps) {
  const IconComponent = iconMap[metric.metric_key] || iconMap.default;
  const theme = themeMap[metric.metric_key] || themeMap.default;
  
  const decimalPlaces = metric.decimal_places || 0;
  const displayValue = value !== undefined 
    ? typeof value === 'number' ? value.toFixed(decimalPlaces) : value
    : '--';
  
  // 计算变化
  let changeText = '';
  let changeDirection = '';
  if (value !== undefined && previousValue !== undefined && typeof value === 'number' && typeof previousValue === 'number') {
    const change = value - previousValue;
    if (change !== 0) {
      changeDirection = change > 0 ? '↑' : '↓';
      changeText = `${changeDirection} ${Math.abs(change).toFixed(decimalPlaces)} ${metric.unit || ''}`;
    }
  }

  // 状态文本
  const getStatusText = () => {
    if (metric.is_cumulative && cumulative !== undefined) {
      return `今日累计: ${cumulative.toFixed(decimalPlaces)} ${metric.unit || ''}`;
    }
    if (changeText) {
      return changeText;
    }
    return '点击记录数据';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${theme.gradient} rounded-2xl p-5 relative overflow-hidden shadow-lg text-left w-full`}
    >
      {/* 装饰圆形 */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />

      {/* 顶部图标和标题 */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-white/90 font-medium text-sm">
          {metric.icon} {metric.metric_name}
        </span>
        <div className={`${theme.iconBg} p-2 rounded-xl`}>
          <IconComponent className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* 数值显示 */}
      <div className="flex items-baseline gap-1 mb-2 relative z-10">
        <span className="text-4xl font-bold text-white">
          {displayValue}
        </span>
        <span className="text-white/70 text-lg">
          {metric.unit}
        </span>
      </div>

      {/* 状态信息 */}
      <div className="relative z-10">
        <span className={`text-xs ${theme.changeBg} text-white/90 px-2 py-1 rounded-full`}>
          {getStatusText()}
        </span>
      </div>
    </motion.button>
  );
}
