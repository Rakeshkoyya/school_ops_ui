/**
 * Holiday and User Leave API functions
 */

import { api } from './api-client';
import type {
  CreateHolidayPayload,
  CreateUserLeavePayload,
  ProjectHoliday,
  UserLeave,
} from '@/types';

// ==================== Holiday API ====================

/**
 * List all holidays for the current project
 * @param year - Optional year filter
 * @param month - Optional month filter (1-12)
 */
export const getHolidays = (params?: { year?: number; month?: number }) =>
  api.get<ProjectHoliday[]>('/holidays/holidays', { params });

/**
 * Create a new project holiday
 * Automatically cancels pending recurring tasks for past/today dates
 */
export const createHoliday = (payload: CreateHolidayPayload) =>
  api.post<ProjectHoliday>('/holidays/holidays', payload);

/**
 * Delete a holiday
 * Does not restore previously cancelled tasks
 */
export const deleteHoliday = (holidayId: number) =>
  api.delete<{ message: string }>(`/holidays/holidays/${holidayId}`);

// ==================== User Leave API ====================

/**
 * List user leaves for the current project
 * @param userId - Optional user filter
 * @param year - Optional year filter
 * @param month - Optional month filter (1-12)
 */
export const getUserLeaves = (params?: {
  user_id?: number;
  year?: number;
  month?: number;
}) => api.get<UserLeave[]>('/holidays/leaves', { params });

/**
 * Create a new user leave
 * Automatically cancels user's pending recurring tasks for past/today dates
 */
export const createUserLeave = (payload: CreateUserLeavePayload) =>
  api.post<UserLeave>('/holidays/leaves', payload);

/**
 * Delete a user leave
 * Does not restore previously cancelled tasks
 */
export const deleteUserLeave = (leaveId: number) =>
  api.delete<{ message: string }>(`/holidays/leaves/${leaveId}`);

// ==================== React Query Keys ====================

export const holidayKeys = {
  all: ['holidays'] as const,
  lists: () => [...holidayKeys.all, 'list'] as const,
  list: (projectId: number | null, year?: number, month?: number) =>
    [...holidayKeys.lists(), projectId, year, month] as const,
};

export const leaveKeys = {
  all: ['leaves'] as const,
  lists: () => [...leaveKeys.all, 'list'] as const,
  list: (
    projectId: number | null,
    userId?: number,
    year?: number,
    month?: number
  ) => [...leaveKeys.lists(), projectId, userId, year, month] as const,
};
