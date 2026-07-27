// ============================================================================
// PM2 ECOSYSTEM CONFIG — Auto-Recovery & Auto-Start on Boot
// KasKu-AI v2.0 Multi-Tenant SaaS Engine
// ============================================================================

module.exports = {
  apps: [
    {
      // ⚙️ Backend Express API + WhatsApp Engine
      name: 'kasku-backend',
      script: 'server.js',
      cwd: __dirname,
      
      // Auto-restart settings
      watch: false,
      autorestart: true,
      max_restarts: 50,
      min_uptime: '10s',
      restart_delay: 3000,        // Tunggu 3 detik sebelum restart
      
      // Memory limit — restart jika memory leak
      max_memory_restart: '500M',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_file: './logs/backend-combined.log',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      // 🎨 Next.js Frontend UI
      name: 'kasku-frontend',
      script: 'npm',
      args: 'run dev -- -p 3001',
      cwd: __dirname + '/frontend',
      
      // Auto-restart settings
      watch: false,
      autorestart: true,
      max_restarts: 30,
      min_uptime: '10s',
      restart_delay: 5000,        // Tunggu 5 detik sebelum restart
      
      // Memory limit
      max_memory_restart: '400M',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_file: './logs/frontend-combined.log',
      
      // Graceful shutdown
      kill_timeout: 5000,
    },
    {
      // 🩺 Health Monitor — Pantau kesehatan sistem
      name: 'kasku-health',
      script: 'services/healthMonitor.js',
      cwd: __dirname,
      
      // Restart settings
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 10000,
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/health-error.log',
      out_file: './logs/health-out.log',
      merge_logs: true,
    }
  ]
};
