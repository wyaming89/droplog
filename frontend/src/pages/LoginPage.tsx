import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('请输入账号和密码');
      return;
    }

    if (isRegister) {
      if (username.length < 2 || username.length > 32) {
        toast.error('账号长度 2-32 位');
        return;
      }
      if (password.length < 6) {
        toast.error('密码至少 6 位');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        const result = await register(username, password);
        if (result.success) {
          toast.success('注册成功，请登录');
          setIsRegister(false);
          setPassword('');
          setConfirmPassword('');
        } else {
          toast.error(result.error || '注册失败');
        }
      } else {
        const result = await login(username, password);
        if (result.success) {
          toast.success('登录成功');
          navigate('/');
        } else {
          toast.error(result.error || '登录失败');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 头部 */}
      <header className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 pb-12">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleGuestMode}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>游客模式</span>
          </button>
          <h1 className="text-2xl font-bold text-white text-center">
            点滴健康
          </h1>
          <p className="text-white/70 text-center mt-2">
            {isRegister ? '创建您的账户' : '欢迎回来'}
          </p>
        </div>
      </header>

      {/* 表单区域 */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            {isRegister ? '注册账号' : '登录账号'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名输入 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">账号</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  className="w-full bg-gray-800 border border-border rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full bg-gray-800 border border-border rounded-xl py-3 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 确认密码（注册时显示） */}
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm text-gray-400 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full bg-gray-800 border border-border rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                loading
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 active:scale-[0.98]'
              }`}
            >
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </motion.div>

        {/* 游客模式提示 */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-2">
            不想注册？可以使用游客模式
          </p>
          <button
            onClick={handleGuestMode}
            className="text-gray-400 hover:text-white text-sm underline transition-colors"
          >
            以游客身份继续
          </button>
        </div>
      </main>
    </div>
  );
}
