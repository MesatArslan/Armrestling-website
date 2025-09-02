# Authentication Token Clearing Fix

## Problem

When users signed out, the authentication tokens were not being properly cleared from localStorage, causing login issues when trying to sign in again.

## Solution

Added comprehensive token clearing functionality to ensure complete logout:

### 1. Created `authUtils.ts`

- `clearAuthTokens()`: Clears all Supabase authentication tokens from localStorage
- `checkRemainingAuthTokens()`: Debug function to check for remaining tokens

### 2. Updated `AuthContext.tsx`

- Modified `signOut()` function to call `clearAuthTokens()` after Supabase signOut
- This ensures all authentication data is properly removed

### 3. Updated `AuthDebug.tsx`

- Added token checking and clearing functionality for debugging
- Now uses the centralized `signOut()` function from AuthContext

## How It Works

1. When user clicks "Sign Out":

   - Supabase `auth.signOut()` is called
   - `clearAuthTokens()` removes all auth-related localStorage items
   - User state is reset to null

2. Token clearing includes:
   - `sb-{projectRef}-auth-token`
   - `sb-{projectRef}-refresh-token`
   - `sb-{projectRef}-expires-at`
   - `sb-{projectRef}-expires-in`
   - `sb-{projectRef}-token-type`
   - `sb-{projectRef}-user`
   - `sb-{projectRef}-session`
   - Any other Supabase auth-related keys

## Testing

Use the AuthDebug page (`/auth-debug`) to:

- Check for remaining tokens
- Manually clear tokens
- Verify complete logout

## Files Modified

- `src/contexts/AuthContext.tsx`
- `src/utils/authUtils.ts` (new)
- `src/pages/AuthDebug.tsx`
