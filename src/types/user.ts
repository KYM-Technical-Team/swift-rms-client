// User types

import { UserType, UserStatus } from './common';
import { FacilitySummary } from './facility';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  userType: UserType;
  facilityId?: string;
  ambulanceId?: string;
  crewRole?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  userType?: UserType;
  status?: UserStatus;
  facilityId?: string;
  ambulanceId?: string;
  crewRole?: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface UserListQuery {
  userType?: UserType;
  facilityId?: string;
  ambulanceId?: string;
  status?: UserStatus;
  districtId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  userType: UserType;
  status: UserStatus;
  facility?: FacilitySummary;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  crewRole?: string;
}
