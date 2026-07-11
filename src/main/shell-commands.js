const { exec, spawn } = require('child_process');

function runShell(cmd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    exec(`sudo ${cmd}`, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed && error.signal === 'SIGTERM') {
          resolve({ code: 'TIMEOUT', stdout, stderr: (stderr || '') + '\n[Comando cancelado por timeout]' });
        } else {
          resolve({ code: error.code || 1, stdout, stderr: stderr || error.message });
        }
      } else {
        resolve({ code: 0, stdout, stderr });
      }
    });
  });
}

function runShellWithPassword(cmd, password, timeoutMs = 120000) {
  return new Promise((resolve) => {
    exec(`echo '${password}' | sudo -S ${cmd}`, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed && error.signal === 'SIGTERM') {
          resolve({ code: 'TIMEOUT', stdout, stderr: (stderr || '') + '\n[Comando cancelado por timeout]' });
        } else {
          resolve({ code: error.code || 1, stdout, stderr: stderr || error.message });
        }
      } else {
        resolve({ code: 0, stdout, stderr });
      }
    });
  });
}

function runShellAsUser(cmd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed && error.signal === 'SIGTERM') {
          resolve({ code: 'TIMEOUT', stdout, stderr: (stderr || '') + '\n[Comando cancelado por timeout]' });
        } else {
          resolve({ code: error.code || 1, stdout, stderr: stderr || error.message });
        }
      } else {
        resolve({ code: 0, stdout, stderr });
      }
    });
  });
}

function runCommand(command, args = [], timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn('sudo', [command, ...args]);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      stderr += '\n[Comando cancelado por timeout]';
    }, timeoutMs);
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 || (command === 'fuser' && code === 1)) {
        resolve({ code, stdout, stderr });
      } else {
        reject({ code, stdout, stderr });
      }
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject({ code: -1, stdout: '', stderr: err.message });
    });
  });
}

module.exports = {
  runShell,
  runShellWithPassword,
  runShellAsUser,
  runCommand
};
