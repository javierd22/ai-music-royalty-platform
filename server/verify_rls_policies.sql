-- RLS Policy Verification Script
-- Run this in Supabase SQL Editor to verify Row Level Security policies

-- ============================================================================
-- 1. Check if RLS is enabled on all artist-facing tables
-- ============================================================================

SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('artists', 'tracks', 'royalty_events', 'claims', 'claim_evidence', 'claim_comments')
AND schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- ============================================================================
-- 2. List all policies for artist-facing tables
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd, -- SELECT, INSERT, UPDATE, DELETE
  qual, -- USING clause
  with_check -- WITH CHECK clause
FROM pg_policies
WHERE tablename IN ('artists', 'tracks', 'royalty_events', 'claims', 'claim_evidence', 'claim_comments')
AND schemaname = 'public'
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. Verify artists table policies
-- ============================================================================

-- Artists should be able to:
-- ✅ SELECT their own profile
-- ✅ UPDATE their own profile
-- ✅ INSERT during registration (public)
-- ❌ DELETE restricted

SELECT
  policyname,
  cmd,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'artists'
AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- 4. Verify tracks table policies
-- ============================================================================

-- Artists should be able to:
-- ✅ SELECT only their own tracks (artist_id = auth.uid() lookup)
-- ✅ INSERT only their own tracks
-- ✅ UPDATE only their own tracks
-- ❌ View other artists' tracks

SELECT
  policyname,
  cmd,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'tracks'
AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- 5. Verify claims table policies
-- ============================================================================

-- Artists should be able to:
-- ✅ SELECT only their own claims (artist_id match)
-- ✅ INSERT their own claims
-- ✅ UPDATE their own claims
-- ✅ DELETE their own claims
-- ❌ View other artists' claims

SELECT
  policyname,
  cmd,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'claims'
AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- 6. Verify royalty_events table policies
-- ============================================================================

-- Artists should be able to:
-- ✅ SELECT events for their tracks only
-- ❌ INSERT/UPDATE/DELETE (read-only)

SELECT
  policyname,
  cmd,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'royalty_events'
AND schemaname = 'public'
ORDER BY cmd;

-- Expected: Only SELECT policy exists

-- ============================================================================
-- 7. Test RLS with simulated artist (manual test)
-- ============================================================================

-- IMPORTANT: Replace 'YOUR_ARTIST_UUID' with actual artist ID for testing

-- Simulate artist login
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "YOUR_AUTH_USER_UUID"}';

-- Test: Should only return this artist's tracks
SELECT id, title, artist_id
FROM tracks
WHERE artist_id = 'YOUR_ARTIST_UUID';

-- Test: Should return empty if querying other artist's tracks
SELECT id, title, artist_id
FROM tracks
WHERE artist_id != 'YOUR_ARTIST_UUID';
-- Expected: Empty result

-- Test: Should only return this artist's claims
SELECT id, title, artist_id
FROM claims
WHERE artist_id = 'YOUR_ARTIST_UUID';

-- Test: Should return empty if querying other artist's claims
SELECT id, title, artist_id
FROM claims
WHERE artist_id != 'YOUR_ARTIST_UUID';
-- Expected: Empty result

-- Reset role
RESET role;
RESET request.jwt.claims;

-- ============================================================================
-- 8. Verify function permissions (if any)
-- ============================================================================

SELECT
  proname AS function_name,
  pronargs AS num_args,
  proargnames AS arg_names
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%artist%';

-- ============================================================================
-- 9. Check for potential security issues
-- ============================================================================

-- List tables WITHOUT RLS enabled (should be empty or only internal tables)
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;

-- List policies that use 'true' in USING clause (overly permissive)
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND qual = 'true'
AND tablename IN ('artists', 'tracks', 'royalty_events', 'claims');

-- Expected: Only public operations like INSERT on artists for registration

-- ============================================================================
-- 10. Summary Report
-- ============================================================================

SELECT
  'RLS Verification Complete' AS status,
  COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('artists', 'tracks', 'royalty_events', 'claims', 'claim_evidence', 'claim_comments');

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================

-- ✅ All artist-facing tables have RLS enabled
-- ✅ Artists can only SELECT their own data (filtered by artist_id or auth.uid())
-- ✅ Artists can INSERT/UPDATE their own records
-- ✅ Artists CANNOT access other artists' data
-- ✅ Royalty events are read-only for artists
-- ✅ No overly permissive policies (except public registration)
-- ✅ PII is protected by RLS at database level

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If RLS is not enabled on a table, run:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- If policies are missing, re-run:
-- server/schema/artists.sql
-- server/schema/claims.sql

-- To test policies with actual auth:
-- 1. Get JWT token from Supabase Auth
-- 2. Use Supabase client with token
-- 3. Query tables and verify filtering

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================

