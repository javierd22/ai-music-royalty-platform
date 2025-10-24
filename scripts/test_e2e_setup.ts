#!/usr/bin/env ts-node

/**
 * E2E Test Setup Verification
 *
 * This script verifies that the E2E test infrastructure is properly set up
 * without requiring actual audio files.
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Verifying E2E Test Setup...\n');

// Check 1: Node.js version
console.log('1. Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 18) {
  console.log(`   ✅ Node.js ${nodeVersion} (OK)`);
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (Requires 18+)`);
  process.exit(1);
}

// Check 2: FFmpeg availability
console.log('\n2. Checking FFmpeg...');
try {
  const ffmpegVersion = execSync('ffmpeg -version', { stdio: 'pipe' }).toString();
  if (ffmpegVersion.includes('ffmpeg version')) {
    console.log('   ✅ FFmpeg is available');
  } else {
    throw new Error('FFmpeg not found');
  }
} catch (error) {
  console.log('   ❌ FFmpeg not found - please install FFmpeg');
  console.log('      Install: brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu)');
  process.exit(1);
}

// Check 3: Attribution service
console.log('\n3. Checking attribution service...');
try {
  const response = await fetch('http://localhost:8000/health');
  if (response.ok) {
    console.log('   ✅ Attribution service is running');
  } else {
    throw new Error('Service not responding');
  }
} catch (error) {
  console.log('   ❌ Attribution service not running');
  console.log('      Start with: cd attrib-service && python main.py');
  process.exit(1);
}

// Check 4: Test directories
console.log('\n4. Checking test directories...');
const requiredDirs = ['input_songs', 'scripts', 'docs/testing', 'changelogs'];

for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir}/ exists`);
  } else {
    console.log(`   ❌ ${dir}/ missing`);
    process.exit(1);
  }
}

// Check 5: Test files
console.log('\n5. Checking test files...');
const requiredFiles = [
  'scripts/fake_ai_e2e.ts',
  'attrib-service/routes/ingest.py',
  'docs/testing/E2E.md',
  'changelogs/2025-E2E-Harness.md',
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    process.exit(1);
  }
}

// Check 6: Package.json scripts
console.log('\n6. Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.scripts['test:e2e']) {
  console.log('   ✅ test:e2e script exists');
} else {
  console.log('   ❌ test:e2e script missing');
  process.exit(1);
}

// Check 7: Dependencies
console.log('\n7. Checking dependencies...');
const requiredDeps = ['form-data', 'node-fetch', 'dotenv', 'ts-node'];
for (const dep of requiredDeps) {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`   ✅ ${dep} is installed`);
  } else {
    console.log(`   ❌ ${dep} missing`);
    process.exit(1);
  }
}

console.log('\n🎉 E2E Test Setup Verification Complete!');
console.log('\nNext steps:');
console.log('1. Add 3+ audio files to input_songs/');
console.log('2. Run: npm run test:e2e');
console.log('3. Check results in .tmp/fake_ai/');

console.log('\nExample audio files:');
console.log('- input_songs/song1.wav');
console.log('- input_songs/song2.mp3');
console.log('- input_songs/song3.m4a');
