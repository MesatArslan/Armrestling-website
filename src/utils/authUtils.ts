/**
 * Authentication utility functions
 */

/**
 * Clears all Supabase authentication tokens from localStorage
 * This ensures complete logout and prevents token persistence issues
 */
export const clearAuthTokens = (): void => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) return

    // Extract project reference from URL
    const projectRef = supabaseUrl.split('//')[1].split('.')[0]
    
    // Common Supabase localStorage keys
    const keysToRemove = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-refresh-token`,
      `sb-${projectRef}-expires-at`,
      `sb-${projectRef}-expires-in`,
      `sb-${projectRef}-token-type`,
      `sb-${projectRef}-user`,
      `sb-${projectRef}-session`
    ]
    
    // Remove specific keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        // Ignore errors when removing localStorage items
      }
    })

    // Remove any other Supabase auth-related keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          // Ignore errors when removing localStorage items
        }
      }
    })

    console.log('Auth tokens cleared from localStorage')
  } catch (error) {
    console.error('Error clearing auth tokens:', error)
  }
}

/**
 * Checks if there are any remaining auth tokens in localStorage
 * Useful for debugging authentication issues
 */
export const checkRemainingAuthTokens = (): string[] => {
  try {
    const remainingKeys: string[] = []
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
        remainingKeys.push(key)
      }
    })
    
    return remainingKeys
  } catch (error) {
    console.error('Error checking remaining auth tokens:', error)
    return []
  }
}
