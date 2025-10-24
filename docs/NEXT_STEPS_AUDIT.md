# NEXT_STEPS_AUDIT

## Snapshot

Audit of current codebase against PRD Execution Contract requirements. Found a working Next.js app with FastAPI attribution service, but missing critical API routes and proper database schema alignment. The app structure exists in both `/app` and `/src/app` directories, creating confusion about the primary application location.

## Compliance Table

| Item                             | Status | Next Action                                                        |
| -------------------------------- | ------ | ------------------------------------------------------------------ |
| Home route (/)                   | ✅     | Present in both /app and /src/app                                  |
| app/layout.tsx                   | ✅     | Present in /app directory                                          |
| app/page.tsx                     | ✅     | Present in /app directory                                          |
| next.config.js                   | ❌     | Missing - only next.config.ts exists                               |
| vercel.json                      | ❌     | Missing - needs API rewrite configuration                          |
| /api/tracks endpoint             | ❌     | No API routes exist in /app/api or /src/app/api                    |
| /api/results endpoint            | ❌     | No API routes exist                                                |
| /api/sdk/log-use endpoint        | ❌     | No API routes exist                                                |
| /tracks route                    | ❌     | Missing - only /upload, /dashboard, /result exist                  |
| /tracks/[id] route               | ❌     | Missing                                                            |
| FastAPI /compare                 | ✅     | Present in /attrib/main.py with proper CompareRes                  |
| Database schema (tracks)         | ✅     | Present in supabase-schema.sql                                     |
| Database schema (results)        | ✅     | Present in supabase-schema.sql                                     |
| Database schema (royalty_events) | ✅     | Present in supabase-schema.sql                                     |
| Database schema (sdk_logs)       | ❌     | Missing - only partner_logs exists                                 |
| TypeScript types (Track)         | ❌     | Missing PRD-defined types - only Supabase types exist              |
| TypeScript types (Match)         | ❌     | Missing PRD-defined types                                          |
| TypeScript types (Result)        | ❌     | Missing PRD-defined types                                          |
| TypeScript types (SdkUseSlip)    | ❌     | Missing PRD-defined types                                          |
| Build commands (npm run build)   | ✅     | Present in package.json                                            |
| Build commands (npm start)       | ✅     | Present in package.json                                            |
| Environment variables            | ❌     | No .env files found - need NEXT_PUBLIC_APP_URL, SUPABASE_URL, etc. |
| No basePath/assetPrefix          | ✅     | next.config.ts is clean                                            |
| No global rewrites               | ✅     | vercel.json missing (needs to be created)                          |
| Home route data dependency       | ✅     | /app/page.tsx renders static "OK"                                  |

## Summary

- Count: ✅ 8 vs ❌ 12
- One-sentence summary: The codebase has a working foundation with FastAPI attribution service and basic Next.js structure, but is missing critical API routes, proper TypeScript types, and environment configuration needed for the 7-Day Sprint deliverables.
- Final line: "End of audit — no files modified."
