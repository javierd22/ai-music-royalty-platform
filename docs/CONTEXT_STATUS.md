# Context File Verification

- PRD.md → ✅ present (Oct 24 16:29:21 2025)
- ROLES.md → ✅ present (Oct 24 16:29:24 2025)
- Status: OK — all context files are valid and up-to-date

## Context Loading Protocol

Before executing any new task or code change, Cursor must:

1. **Check Context Files**: Verify `/docs/PRD.md` and `/docs/ROLES.md` exist and are non-empty
2. **Check Timestamps**: Ensure files are not older than 14 days
3. **Load Context**: If valid, load both files into context memory
4. **Summarize**: Provide system goals + roles summary before proceeding

## Blocking Conditions

If either file is missing, empty, or older than 14 days, Cursor must halt and print:

> "Execution blocked: Missing or outdated context files (PRD.md / ROLES.md). Please update before continuing."

## Current Status

✅ **PRD.md**: 128 lines, comprehensive product requirements
✅ **ROLES.md**: 153 lines, complete role definitions
✅ **Both files**: Fresh timestamps, ready for context loading
