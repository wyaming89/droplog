import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, TrendingUp, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HomePage } from '@/pages/HomePage';
import { TrendPage } from '@/pages/TrendPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { ToastContainer } from '@/components/ui/Toast';
import { isLoggedIn } from '@/services/api';
import type { TabType } from '@/types';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = (): TabType => {
    if (location.pathname === '/trend') return 'trend';
    if (location.pathname === '/settings') return 'settings';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const paths: Record<TabType, string> = {
      home: '/',
      trend: '/trend',
      settings: '/settings',
    };
    navigate(paths[tab]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/trend" element={<TrendPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-card/80 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
              activeTab === 'home' ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            {activeTab === 'home' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-0.5 w-12 h-1 bg-blue-500 rounded-full"
              />
            )}
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">首页</span>
          </button>

          <button
            onClick={() => handleTabChange('trend')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
              activeTab === 'trend' ? 'text-purple-500' : 'text-gray-400'
            }`}
          >
            {activeTab === 'trend' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-0.5 w-12 h-1 bg-purple-500 rounded-full"
              />
            )}
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs mt-1">趋势</span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
              activeTab === 'settings' ? 'text-pink-500' : 'text-gray-400'
            }`}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-0.5 w-12 h-1 bg-pink-500 rounded-full"
              />
            )}
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">我的</span>
          </button>
        </div>
      </nav>

      {/* Toast 通知 */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 如果在登录页且已登录，跳转到首页
    if (isLoginPage && isLoggedIn()) {
      navigate('/');
    }
    setCheckingAuth(false);
  }, [isLoginPage, navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (isLoginPage) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return <AppLayout />;
}
