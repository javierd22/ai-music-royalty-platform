# End-to-End Testing Guide

## Overview

The E2E Test Orchestrator simulates the complete AI music attribution pipeline by:

1. **Ingesting** original tracks into the attribution database
2. **Generating** synthetic AI outputs by combining track snippets
3. **Creating** mock boarding passes with source attribution
4. **Comparing** generated tracks against the database
5. **Validating** detection accuracy against ground truth

## Prerequisites

- Node.js 18+
- FFmpeg installed and available in PATH
- Attribution service running on localhost:8000
- At least 3 audio files in `input_songs/` directory

## Quick Start

1. **Prepare test data:**

   ```bash
   mkdir input_songs
   # Copy 3+ audio files (WAV/MP3) into input_songs/
   ```

2. **Start attribution service:**

   ```bash
   cd attrib-service
   pip install -r requirements.txt
   python main.py
   ```

3. **Run E2E test:**
   ```bash
   npx ts-node scripts/fake_ai_e2e.ts
   ```

## Configuration

Environment variables (set in `scripts/.env.test`):

- `ATTRIB_BASE_URL`: Attribution service URL (default: http://localhost:8000)
- `SIMILARITY_THRESHOLD`: Detection threshold (default: 0.82)
- `OFFSET_TOLERANCE_SECONDS`: Time tolerance (default: 0.6)
- `USE_DISK_INDEX`: Use disk-based index (default: true)
- `OUTPUT_DIR`: Test artifacts directory (default: .tmp/fake_ai)

## Output

The test generates:

- `.tmp/fake_ai/results.json`: Detailed test results
- `.tmp/fake_ai/report.md`: Human-readable report
- `.tmp/fake_ai/boarding_pass.json`: Mock boarding pass
- `.tmp/fake_ai/generated_track.wav`: Synthetic AI output

## Acceptance Criteria

- ✅ Test runs without external dependencies
- ✅ Detects ≥60% of expected sources above threshold
- ✅ Generates all required artifacts
- ✅ Produces clear pass/fail summary

## Troubleshooting

**FFmpeg not found:**

- Install FFmpeg and ensure it's in PATH
- Set `FFMPEG_PATH` environment variable

**Attribution service not responding:**

- Check service is running on correct port
- Verify `ATTRIB_BASE_URL` configuration

**No audio files found:**

- Ensure `input_songs/` directory exists
- Add 3+ audio files (WAV/MP3 format)

## Advanced Usage

**Custom test data:**

```bash
INPUT_SONGS_DIR=my_test_songs npx ts-node scripts/fake_ai_e2e.ts
```

**Verbose logging:**

```bash
VERBOSE_LOGGING=true npx ts-node scripts/fake_ai_e2e.ts
```

**Custom thresholds:**

```bash
SIMILARITY_THRESHOLD=0.9 OFFSET_TOLERANCE_SECONDS=1.0 npx ts-node scripts/fake_ai_e2e.ts
```
