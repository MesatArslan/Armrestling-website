# Supabase Authentication Setup

This guide will help you set up Supabase authentication for your arm wrestling tournament application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account if you don't have one
2. Create a new project
3. Go to Settings > API
4. Copy your project URL and anon key

## 2. Environment Variables

Create a `.env` file in your project root and add the following:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_project_url` and `your_supabase_anon_key` with the values from your Supabase project.

## 3. Authentication Setup

The authentication system is already implemented with the following features:

- ✅ User signup with email/password
- ✅ User login with email/password
- ✅ Password reset functionality
- ✅ Logout functionality
- ✅ Turkish and English language support
- ✅ Responsive design for mobile and desktop
- ✅ Authentication state management with React Context

## 4. Usage

### Access Authentication

Users can access authentication features through:

- Login/Signup buttons in the navbar (both desktop and mobile)
- Modal-based authentication forms
- Responsive design that works on all devices

### Authentication Flow

1. **Sign Up**: Users can create new accounts with email and password
2. **Sign In**: Existing users can log in with their credentials
3. **Password Reset**: Users can reset their passwords via email
4. **Auto Login**: Users stay logged in across browser sessions
5. **Logout**: Users can safely log out from any page

### For Developers

The authentication system uses:

- `AuthContext` for state management
- `useAuth` hook for accessing authentication functions
- `AuthModal` component for the login/signup interface
- Supabase for backend authentication services

## 5. Features

- **Secure**: Uses Supabase's secure authentication system
- **Internationalized**: Supports Turkish and English
- **Responsive**: Works on desktop, tablet, and mobile
- **User-friendly**: Clear error messages and loading states
- **Accessible**: Keyboard navigation and screen reader support

## 6. Next Steps

After setting up your environment variables, you can:

1. Start the development server: `npm run dev`
2. Test user registration and login
3. Customize the authentication flow as needed
4. Add user roles or additional authentication features

## 7. Troubleshooting

If you encounter issues:

1. Check that your environment variables are correctly set
2. Verify your Supabase project URL and keys
3. Check the browser console for error messages
4. Ensure your Supabase project has email authentication enabled

