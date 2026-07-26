// ============================================================================
// KASKU-AI ONE-CLICK DUAL SERVER RUNNER
// Jalankan Backend (Port 3000) & Next.js Frontend (Port 3001) dalam 1 Terminal
// ============================================================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const frontendDir = path.join(__dirname, 'frontend');

// 1. Pastikan file .env ada di root, jika belum ada copy dari .env.example
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('📄 [AUTO-SETUP] Meng-copy .env.example -> .env otomatis...');
    fs.copyFileSync(envExamplePath, envPath);
}

console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║   🚀 KASKU-AI ONE-CLICK SYSTEM RUNNER v2.0                    ║
  ║   --------------------------------------------------------    ║
  ║   ⚙️  Backend Express API : http://localhost:3000              ║
  ║   🎨 Next.js Frontend UI  : http://localhost:3001              ║
  ╚═══════════════════════════════════════════════════════════════╝
`);

// Function helper untuk spawn process dengan prefix warna
function runProcess(name, command, args, cwd, colorCode) {
    const proc = spawn(command, args, { cwd, shell: true, stdio: 'pipe' });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.log(`\x1b[${colorCode}m[${name}]\x1b[0m ${line}`);
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.error(`\x1b[31m[${name}-ERR]\x1b[0m ${line}`);
        });
    });

    proc.on('close', (code) => {
        console.log(`\x1b[33m[${name}]\x1b[0m Proses berhenti (code ${code})`);
    });

    return proc;
}

// 2. Jalankan Backend (Port 3000)
console.log('🟢 Memulai Backend Express API (Port 3000)...');
runProcess('BACKEND', 'node', ['server.js'], rootDir, '36'); // Cyan

// 3. Jalankan Frontend (Port 3001)
setTimeout(() => {
    console.log('🟣 Memulai Next.js Frontend UI (Port 3001)...');
    runProcess('FRONTEND', 'npm', ['run', 'dev', '--', '-p', '3001'], frontendDir, '35'); // Magenta
}, 2000);

// Handle exit cleanly
process.on('SIGINT', () => {
    console.log('\n🛑 Menghentikan seluruh server KasKu-AI...');
    process.exit();
});
