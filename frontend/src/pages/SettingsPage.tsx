import { useState, useEffect } from 'react';
import { User, ChevronRight, Bell, Lock, Info, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useHealthData } from '@/hooks/useHealthData';
import { getMetricTemplates, updateUserMetrics } from '@/services/api';
import type { MetricConfig } from '@/types';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, authenticated, logout } = useAuth();
  const { metrics, records, refresh } = useHealthData();
  const [allMetrics, setAllMetrics] = useState<MetricConfig[]>([]);
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // 加载所有可用指标
  useEffect(() => {
    const loadMetrics = async () => {
      if (!authenticated) return;
      
      const result = await getMetricTemplates();
      if (result.success && result.data) {
        setAllMetrics(result.data);
      }
    };
    loadMetrics();
  }, [authenticated]);

  // 初始化已启用的指标
  useEffect(() => {
    const enabled = new Set(metrics.map(m => m.metric_key));
    setEnabledMetrics(enabled);
  }, [metrics]);

  const toggleMetric = async (metricKey: string) => {
    if (!authenticated) {
      toast.info('请先登录后再配置指标');
      return;
    }

    const newEnabled = new Set(enabledMetrics);
    if (newEnabled.has(metricKey)) {
      newEnabled.delete(metricKey);
    } else {
      newEnabled.add(metricKey);
    }
    setEnabledMetrics(newEnabled);

    // 保存到服务器
    setSaving(true);
    const metricsToSave = Array.from(newEnabled).map(key => ({ metric_key: key }));
    const result = await updateUserMetrics(metricsToSave);
    setSaving(false);

    if (result.success) {
      refresh();
      toast.success(`指标已${newEnabled.has(metricKey) ? '启用' : '禁用'}`);
    } else {
      // 恢复原状态
      setEnabledMetrics(enabledMetrics);
      toast.error(result.error || '保存失败');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // 计算统计数据
  const totalRecords = records.length;
  const metricsCount = metrics.length;
  
  // 计算连续记录天数
  const calculateStreak = () => {
    if (records.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    const recordDates = new Set(
      records.map(r => new Date(r.date).toDateString())
    );
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      if (recordDates.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="p-4 pb-8">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">个人中心</h1>
        <p className="text-gray-400 text-sm">管理您的账户和设置</p>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-5 mb-6">
        {authenticated ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user?.username}</h2>
                <p className="text-white/70 text-sm">ID: {user?.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{streak}</div>
                <div className="text-white/70 text-xs">连续天数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalRecords}</div>
                <div className="text-white/70 text-xs">总记录</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{metricsCount}</div>
                <div className="text-white/70 text-xs">健康指标</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">欢迎使用点滴健康</h2>
            <p className="text-white/70 text-sm mb-4">登录后可同步您的健康数据</p>
            <button
              onClick={handleLogin}
              className="bg-white text-purple-600 px-6 py-2 rounded-xl font-medium hover:bg-white/90 transition-colors"
            >
              登录 / 注册
            </button>
          </div>
        )}
      </div>

      {/* 首页指标配置 */}
      {authenticated && (
        <div className="bg-card rounded-2xl mb-6 overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-white">首页显示指标</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {allMetrics.filter(m => m.is_system).map((metric) => (
              <div key={metric.metric_key} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{metric.icon}</span>
                  <span className="text-white">{metric.metric_name}</span>
                </div>
                <Switch
                  checked={enabledMetrics.has(metric.metric_key)}
                  onChange={() => toggleMetric(metric.metric_key)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 更多功能 */}
      <div className="bg-card rounded-2xl mb-6 overflow-hidden">
        <div className="divide-y divide-border">
          <button className="flex items-center justify-between p-4 w-full hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="text-white">通知设置</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button className="flex items-center justify-between p-4 w-full hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <span className="text-white">隐私与安全</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button className="flex items-center justify-between p-4 w-full hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-400" />
              <span className="text-white">关于应用</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* 退出登录按钮 */}
      {authenticated && (
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 text-red-400 py-4 rounded-xl font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      )}

      {/* 版本信息 */}
      <div className="text-center mt-6 text-gray-500 text-sm">
        点滴健康 v2.0.0
      </div>
    </div>
  );
}
