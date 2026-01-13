'use client'

import useSWR from 'swr'
import type { TaskWithAssignee } from '@/app/actions/tasks'

const fetcher = async (url: string): Promise<TaskWithAssignee[]> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch tasks')
  }
  return res.json()
}

interface UseTasksOptions {
  /**
   * Polling interval in milliseconds.
   * Set to 0 to disable polling.
   * @default 3000
   */
  refreshInterval?: number
  /**
   * Initial data to use before the first fetch completes.
   */
  fallbackData?: TaskWithAssignee[]
}

export function useTasks(
  projectId: string | null,
  options: UseTasksOptions = {}
) {
  const { refreshInterval = 3000, fallbackData } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    TaskWithAssignee[]
  >(projectId ? `/api/tasks?projectId=${projectId}` : null, fetcher, {
    refreshInterval,
    fallbackData,
    // Revalidate on focus (when user returns to tab)
    revalidateOnFocus: true,
    // Revalidate when browser regains connection
    revalidateOnReconnect: true,
    // Keep previous data while revalidating
    keepPreviousData: true,
    // Dedupe requests within 2 seconds
    dedupingInterval: 2000,
  })

  return {
    tasks: data ?? fallbackData ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

export function useAllTasks(options: UseTasksOptions = {}) {
  const { refreshInterval = 3000, fallbackData } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    TaskWithAssignee[]
  >('/api/tasks', fetcher, {
    refreshInterval,
    fallbackData,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    dedupingInterval: 2000,
  })

  return {
    tasks: data ?? fallbackData ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
