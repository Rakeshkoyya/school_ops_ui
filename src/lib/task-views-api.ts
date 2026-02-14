/**
 * Task View Style API functions
 */

import { api } from './api-client';
import type {
  AvailableColumnsResponse,
  CreateTaskViewStylePayload,
  EffectiveViewResponse,
  TaskViewStyle,
  TaskViewStyleListResponse,
  UpdateTaskViewStylePayload,
  UserViewPreference,
} from '@/types';

// ==================== View Style CRUD ====================

/**
 * List all task view styles for the current project
 */
export const getTaskViewStyles = () =>
  api.get<TaskViewStyleListResponse>('/task-views');

/**
 * Create a new task view style
 */
export const createTaskViewStyle = (payload: CreateTaskViewStylePayload) =>
  api.post<TaskViewStyle>('/task-views', payload);

/**
 * Get a specific task view style by ID
 */
export const getTaskViewStyle = (viewId: number) =>
  api.get<TaskViewStyle>(`/task-views/${viewId}`);

/**
 * Update a task view style
 */
export const updateTaskViewStyle = (viewId: number, payload: UpdateTaskViewStylePayload) =>
  api.patch<TaskViewStyle>(`/task-views/${viewId}`, payload);

/**
 * Delete a task view style
 */
export const deleteTaskViewStyle = (viewId: number) =>
  api.delete<{ message: string }>(`/task-views/${viewId}`);

// ==================== Project Default ====================

/**
 * Set a view style as the project's default
 */
export const setProjectDefaultView = (viewId: number) =>
  api.post<TaskViewStyle>(`/task-views/${viewId}/set-project-default`);

// ==================== User Preference ====================

/**
 * Get the effective view for the current user
 * This resolves: user preference → project default → system default
 */
export const getEffectiveView = () =>
  api.get<EffectiveViewResponse>('/task-views/me/effective');

/**
 * Get current user's view preference for this project
 * Returns null if no preference is set
 */
export const getUserViewPreference = () =>
  api.get<UserViewPreference | null>('/task-views/me/preference');

/**
 * Set current user's preferred view style
 */
export const setUserViewPreference = (viewStyleId: number) =>
  api.put<UserViewPreference>('/task-views/me/preference', { view_style_id: viewStyleId });

/**
 * Clear current user's view preference (fall back to project default)
 */
export const clearUserViewPreference = () =>
  api.delete<{ message: string }>('/task-views/me/preference');

// ==================== Utility ====================

/**
 * Get list of all available columns for view configuration
 */
export const getAvailableColumns = () =>
  api.get<AvailableColumnsResponse>('/task-views/columns');

// ==================== React Query Keys ====================

export const taskViewKeys = {
  all: ['task-views'] as const,
  lists: () => [...taskViewKeys.all, 'list'] as const,
  list: (projectId: number | null) => [...taskViewKeys.lists(), projectId] as const,
  details: () => [...taskViewKeys.all, 'detail'] as const,
  detail: (viewId: number) => [...taskViewKeys.details(), viewId] as const,
  effective: (projectId: number | null, userId: number) => 
    [...taskViewKeys.all, 'effective', projectId, userId] as const,
  preference: (projectId: number | null, userId: number) => 
    [...taskViewKeys.all, 'preference', projectId, userId] as const,
  columns: () => [...taskViewKeys.all, 'columns'] as const,
};
