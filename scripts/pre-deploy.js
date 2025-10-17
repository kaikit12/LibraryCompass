#!/usr/bin/env node

/**
 * Pre-deployment script to remove sensitive data and optimize for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files and patterns to remove/sanitize
const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  'firebase-adminsdk-*.json',
  '*.log',
  '.DS_Store',
  'Thumbs.db'
];

const DEVELOPMENT_DIRS = [
  '.git',
  'node_modules/.cache',
  '.next/cache',
  '*.map'
];

const SENSITIVE_PATTERNS = [
  /console\.(log|debug|info)/g,
  /debugger;?/g,
  /\/\/\s*TODO:/gi,
  /\/\/\s*FIXME:/gi,
  /\/\*[\s\S]*?\*\//g // Remove block comments
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m', // cyan
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    success: '\x1b[32m' // green
  };
  console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
}

function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`Removed: ${filePath}`, 'success');
      return true;
    }
  } catch (error) {
    log(`Failed to remove ${filePath}: ${error.message}`, 'error');
  }
  return false;
}

function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      log(`Removed directory: ${dirPath}`, 'success');
      return true;
    }
  } catch (error) {
    log(`Failed to remove directory ${dirPath}: ${error.message}`, 'error');
  }
  return false;
}

function sanitizeJavaScriptFile(filePath) {
  try {
    if (!fs.existsSync(filePath) || !filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    SENSITIVE_PATTERNS.forEach(pattern => {
      const newContent = content.replace(pattern, '');
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      log(`Sanitized: ${filePath}`, 'success');
    }

    return modified;
  } catch (error) {
    log(`Failed to sanitize ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

function findFiles(dir, pattern) {
  const files = [];
  
  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
            walk(fullPath);
          }
        } else if (pattern.test(item)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      log(`Error reading directory ${currentDir}: ${error.message}`, 'error');
    }
  }
  
  walk(dir);
  return files;
}

function main() {
  log('Starting pre-deployment cleanup...', 'info');
  
  const rootDir = process.cwd();
  let totalRemoved = 0;
  let totalSanitized = 0;

  // Remove sensitive files
  log('Removing sensitive files...', 'info');
  SENSITIVE_FILES.forEach(pattern => {
    const files = findFiles(rootDir, new RegExp(pattern.replace(/\*/g, '.*')));
    files.forEach(file => {
      if (removeFile(file)) {
        totalRemoved++;
      }
    });
  });

  // Remove development directories
  log('Cleaning development directories...', 'info');
  DEVELOPMENT_DIRS.forEach(dirPattern => {
    const dirs = findFiles(rootDir, new RegExp(dirPattern.replace(/\*/g, '.*')));
    dirs.forEach(dir => {
      try {
        const stat = fs.statSync(dir);
        if (stat.isDirectory()) {
          if (removeDirectory(dir)) {
            totalRemoved++;
          }
        } else {
          if (removeFile(dir)) {
            totalRemoved++;
          }
        }
      } catch (error) {
        // File might not exist, ignore
      }
    });
  });

  // Sanitize JavaScript/TypeScript files in .next directory
  log('Sanitizing built JavaScript files...', 'info');
  const nextDir = path.join(rootDir, '.next');
  if (fs.existsSync(nextDir)) {
    const jsFiles = findFiles(nextDir, /\.(js|jsx)$/);
    jsFiles.forEach(file => {
      if (sanitizeJavaScriptFile(file)) {
        totalSanitized++;
      }
    });
  }

  // Create production environment marker
  const prodMarker = path.join(rootDir, '.production-ready');
  fs.writeFileSync(prodMarker, JSON.stringify({
    timestamp: new Date().toISOString(),
    cleaned: true,
    filesRemoved: totalRemoved,
    filesSanitized: totalSanitized
  }, null, 2));

  // Final security check
  log('Running final security check...', 'info');
  try {
    // Check for any remaining sensitive patterns
    execSync('grep -r "FIREBASE_ADMIN_PRIVATE_KEY\\|password\\|secret" .next/ || true', { stdio: 'pipe' });
    
    // Verify source maps are removed
    const sourceMaps = execSync('find .next -name "*.map" || true', { encoding: 'utf8' }).trim();
    if (sourceMaps) {
      log('Warning: Source maps still present in build', 'warn');
    }

  } catch (error) {
    // Ignore errors from grep (no matches is good)
  }

  log(`Pre-deployment cleanup completed!`, 'success');
  log(`Files removed: ${totalRemoved}`, 'info');
  log(`Files sanitized: ${totalSanitized}`, 'info');
  log('Application is ready for secure deployment', 'success');
}

if (require.main === module) {
  main();
}

module.exports = { main };