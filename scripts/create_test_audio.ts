#!/usr/bin/env ts-node

/**
 * Create test audio files for E2E testing
 *
 * This script creates simple test audio files using FFmpeg
 * for testing the E2E attribution pipeline.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const inputDir = 'input_songs';

console.log('🎵 Creating test audio files for E2E testing...\n');

// Ensure input directory exists
if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

// Create 3 test audio files with different characteristics
const testFiles = [
  {
    name: 'test_song_1.wav',
    duration: 30,
    frequency: 440, // A4 note
    description: '30-second sine wave at 440Hz (A4)',
  },
  {
    name: 'test_song_2.wav',
    duration: 25,
    frequency: 523, // C5 note
    description: '25-second sine wave at 523Hz (C5)',
  },
  {
    name: 'test_song_3.wav',
    duration: 35,
    frequency: 659, // E5 note
    description: '35-second sine wave at 659Hz (E5)',
  },
];

for (const file of testFiles) {
  const filePath = path.join(inputDir, file.name);

  console.log(`Creating ${file.name}...`);
  console.log(`  ${file.description}`);

  try {
    // Generate sine wave using FFmpeg
    const cmd = `ffmpeg -f lavfi -i "sine=frequency=${file.frequency}:duration=${file.duration}" -ar 44100 -ac 2 "${filePath}" -y`;
    execSync(cmd, { stdio: 'pipe' });

    // Verify file was created
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  ✅ Created (${Math.round(stats.size / 1024)}KB)`);
    } else {
      throw new Error('File not created');
    }
  } catch (error) {
    console.log(`  ❌ Failed to create ${file.name}: ${error}`);
  }
}

console.log(`\n🎉 Test audio files created in ${inputDir}/`);
console.log('\nYou can now run the E2E test:');
console.log('  npm run test:e2e');
