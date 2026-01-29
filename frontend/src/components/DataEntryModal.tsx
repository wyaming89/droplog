import { useState } from 'react';
import { X, Delete, Calendar, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/Toast';
import type { MetricConfig } from '@/types';

interface DataEntryModalProps {
  metric: MetricConfig;
  currentValue?: number | string;
  cumulative?: number;
  onClose: () => void;
  onSave: (value: number | string, recordDate?: string) => void;
}

// 为不同指标配置颜色主题
const colorThemes: Record<string, { gradient: string; textColor: string }> = {
  temperature: { gradient: 'from-orange-500 to-red-500', textColor: 'text-orange-400' },
  heart_rate: { gradient: 'from-pink-500 to-rose-600', textColor: 'text-pink-400' },
  blood_oxygen: { gradient: 'from-cyan-500 to-blue-600', textColor: 'text-cyan-400' },
  weight: { gradient: 'from-blue-500 to-blue-600', textColor: 'text-blue-400' },
  urine: { gradient: 'from-cyan-500 to-blue-600', textColor: 'text-cyan-400' },
  water: { gradient: 'from-blue-400 to-cyan-500', textColor: 'text-blue-400' },
  steps: { gradient: 'from-green-500 to-emerald-600', textColor: 'text-green-400' },
  sleep: { gradient: 'from-indigo-500 to-purple-600', textColor: 'text-indigo-400' },
  default: { gradient: 'from-gray-500 to-gray-600', textColor: 'text-gray-400' },
};

export function DataEntryModal({ metric, currentValue, cumulative, onClose, onSave }: DataEntryModalProps) {
  const [value, setValue] = useState(currentValue?.toString() || '0');
  const [saving, setSaving] = useState(false);
  
  // 日期选择（支持补录）
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const isToday = selectedDate === today.toISOString().split('T')[0];

  const theme = colorThemes[metric.metric_key] || colorThemes.default;
  const decimalPlaces = metric.decimal_places || 0;
  
  // 日期切换
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    // 不能选择未来日期
    if (current <= today) {
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };
  
  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    if (isToday) {
      return '今天';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    }
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };
  
  // 生成增量按钮
  const getIncrements = (): string[] => {
    if (metric.is_cumulative) {
      // 累计型指标，较大增量
      const base = metric.metric_key === 'water' ? 250 : 
                   metric.metric_key === 'urine' ? 100 :
                   metric.metric_key === 'steps' ? 1000 : 100;
      return [`+${base}`, `+${base * 2}`, `+${base * 5}`];
    }
    // 非累计型指标
    if (decimalPlaces > 0) {
      return ['+0.1', '+0.5', '+1.0'];
    }
    return ['+1', '+5', '+10'];
  };

  const increments = getIncrements();

  const handleNumberClick = (num: string) => {
    if (num === '.' && value.includes('.')) return;
    if (num === '.' && decimalPlaces === 0) return;
    
    if (value === '0' && num !== '.') {
      setValue(num);
    } else if (value === '0' && num === '.') {
      setValue('0.');
    } else {
      // 检查小数位数
      if (value.includes('.')) {
        const decimals = value.split('.')[1];
        if (decimals && decimals.length >= decimalPlaces) return;
      }
      setValue(value + num);
    }
  };

  const handleDelete = () => {
    if (value.length > 1) {
      setValue(value.slice(0, -1));
    } else {
      setValue('0');
    }
  };

  const handleIncrement = (increment: string) => {
    const numValue = parseFloat(value) || 0;
    const incrementValue = parseFloat(increment.replace(/[^\d.]/g, ''));
    const newValue = numValue + incrementValue;
    setValue(decimalPlaces > 0 ? newValue.toFixed(decimalPlaces) : newValue.toString());
  };

  const handleSave = async () => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue === 0) {
      toast.error('请输入有效的数值');
      return;
    }

    if (metric.min_value !== null && metric.min_value !== undefined && numValue < metric.min_value) {
      toast.error(`${metric.metric_name}不能小于 ${metric.min_value}`);
      return;
    }

    if (metric.max_value !== null && metric.max_value !== undefined && numValue > metric.max_value) {
      toast.error(`${metric.metric_name}不能大于 ${metric.max_value}`);
      return;
    }

    setSaving(true);
    try {
      // 传递选择的日期（支持补录）
      onSave(numValue, isToday ? undefined : selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const dateStr = new Date(selectedDate).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
      >
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 弹窗内容 */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-gray-900 rounded-t-3xl w-full max-w-lg p-6 shadow-2xl"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              记录{metric.metric_name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* 日期选择器（支持补录） */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span className={!isToday ? 'text-orange-400' : ''}>
                {formatSelectedDate()} {!isToday && <span className="text-xs">(补录)</span>}
              </span>
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className={`p-2 rounded-full transition-colors ${
                isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-800'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* 完整日期显示 */}
          {!isToday && (
            <div className="text-center text-xs text-orange-400/70 -mt-4 mb-4">
              {dateStr}
            </div>
          )}

          {/* 显示当前值 */}
          <div className="text-center mb-6">
            <span className={`text-5xl font-bold ${theme.textColor}`}>
              {value}
            </span>
            <span className="text-2xl text-gray-400 ml-2">
              {metric.unit}
            </span>
            {metric.is_cumulative && cumulative !== undefined && (
              <div className="text-sm text-gray-500 mt-2">
                今日累计: {cumulative.toFixed(decimalPlaces)} {metric.unit}
              </div>
            )}
          </div>

          {/* 快捷按钮 */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">快捷增加</div>
            <div className="flex gap-2">
              {increments.map((inc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleIncrement(inc)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl py-2.5 text-sm transition-all font-medium text-white"
                >
                  {inc}
                </button>
              ))}
            </div>
          </div>

          {/* 数字键盘 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl py-4 text-xl font-semibold transition-all text-white"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumberClick('.')}
              disabled={decimalPlaces === 0}
              className={`rounded-xl py-4 text-xl font-semibold transition-all ${
                decimalPlaces === 0 
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-800 hover:bg-gray-700 active:scale-95 text-white'
              }`}
            >
              .
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl py-4 text-xl font-semibold transition-all text-white"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl py-4 flex items-center justify-center transition-all"
            >
              <Delete className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={saving || parseFloat(value) === 0}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              saving || parseFloat(value) === 0
                ? 'bg-gray-700 cursor-not-allowed'
                : `bg-gradient-to-r ${theme.gradient} hover:opacity-90 active:scale-[0.98]`
            }`}
          >
            <Check className="w-5 h-5" />
            {saving ? '保存中...' : '保存记录'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
