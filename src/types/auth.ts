// Auth ve Rol Sistemi için Type Definitions

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  institution_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  email: string;
  name: string;
  user_quota: number;
  users_created: number;
  subscription_end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Form Types
export interface CreateInstitutionForm {
  email: string;
  password: string;
  name: string;
  user_quota: number;
  subscription_end_date: string;
}

export interface CreateUserForm {
  username: string;
  email: string;
  password: string;
}

export interface LoginForm {
  email: string;
  password: string;
  role_type: 'admin' | 'user';
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface InstitutionWithUsers extends Institution {
  users?: Profile[];
}

// Auth Context Types
export interface AuthUser extends Profile {
  institution?: Institution;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, roleType?: 'admin' | 'user') => Promise<ApiResponse<AuthUser>>;
  signOut: () => Promise<ApiResponse<void>>;
  refreshProfile: () => Promise<void>;
  createProfile: (userId: string, email: string, role?: string) => Promise<Profile | null>;
}

// Route Protection Types
export interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

// Dashboard Stats Types
export interface SuperAdminStats {
  totalInstitutions: number;
  totalUsers: number;
  activeInstitutions: number;
  expiredInstitutions: number;
}

export interface AdminStats {
  totalUsers: number;
  remainingQuota: number;
  usedQuota: number;
  subscriptionDaysLeft: number;
}
