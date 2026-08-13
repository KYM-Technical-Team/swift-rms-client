// Authentication types

import { UserType, UserStatus } from './common';
import { DistrictSummary, FacilitySummary } from './facility';

export interface LoginRequest {
  phone?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  userType: UserType;
  facilityId?: string;
  districtId?: string;
  ambulanceId?: string;
}

export interface ForgotPasswordRequest {
  phone: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  userType: UserType;
  status: UserStatus;
  districtId?: string;
  district?: DistrictSummary;
  facility?: FacilitySummary;
  ambulanceId?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}
