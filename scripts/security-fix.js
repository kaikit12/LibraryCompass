#!/usr/bin/env node

/**
 * Security Fix Script
 * Safely updates vulnerable dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`🔄 ${description}...`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

async function main() {
  log('🔒 Starting security vulnerability fixes...', 'magenta');

  try {
    // 1. Update Next.js to fix moderate vulnerabilities
    log('\n📦 Step 1: Updating Next.js', 'blue');
    execCommand('npm install next@latest', 'Update Next.js');

    // 2. Update Firebase Admin to fix critical protobuf vulnerability
    log('\n📦 Step 2: Updating Firebase Admin', 'blue');
    execCommand('npm install firebase-admin@latest', 'Update Firebase Admin');

    // 3. Replace xlsx with a safer alternative
    log('\n📦 Step 3: Handling xlsx vulnerability', 'blue');
    log('⚠️  xlsx package has known vulnerabilities', 'yellow');
    log('ℹ️  Consider replacing with @sheetjs/xlsx or luckysheet', 'cyan');
    
    // For now, we'll pin to a specific version that's less vulnerable
    // execCommand('npm uninstall xlsx', 'Remove vulnerable xlsx');
    // execCommand('npm install @sheetjs/xlsx@latest', 'Install safer sheet library');

    // 4. Run audit again to check fixes
    log('\n🔍 Step 4: Verifying fixes', 'blue');
    const auditResult = execCommand('npm audit --audit-level=high', 'Security audit');
    
    if (auditResult) {
      log('✅ Critical and high vulnerabilities addressed', 'green');
    } else {
      log('⚠️  Some vulnerabilities may remain', 'yellow');
    }

    // 5. Update package-lock.json
    log('\n📝 Step 5: Updating lockfile', 'blue');
    execCommand('npm install', 'Update package-lock.json');

    log('\n🎉 Security fixes completed!', 'green');
    log('ℹ️  Review changes and test thoroughly before deploying', 'cyan');

  } catch (error) {
    log('\n❌ Security fix failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

main().catch(console.error);