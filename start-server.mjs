// Persistent server runner - auto-restarts on crash
import { spawn } from 'child_process';

const MAX_RESTARTS = 50;
let restarts = 0;

function startServer() {
  console.log('🚀 Starting Kynthai server...');
  
  const proc = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./prisma/dev.db' }
  });
  
  proc.on('close', (code) => {
    if (restarts < MAX_RESTARTS) {
      console.log(`🔄 Server crashed (code ${code}), restarting... (${restarts + 1}/${MAX_RESTARTS})`);
      restarts++;
      setTimeout(startServer, 2000);
    } else {
      console.error('💥 Max restarts reached, giving up');
      process.exit(1);
    }
  });
}

startServer();
