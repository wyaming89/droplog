module.exports = {
  apps: [{
    name: 'health-records-app',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      DOMAIN: 'droplog.top'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // 监听忽略文件
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log',
      '.git',
      'frontend'
    ]
  }]
};