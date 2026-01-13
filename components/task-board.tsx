'use client'

import { useState, useEffect, useCallback } from 'react'
import Pipeline from '@/components/pipeline'
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { ProjectSelector } from '@/components/project-selector'
import { useAllTasks } from '@/lib/hooks/use-tasks'
import type { Project } from '@/lib/generated/prisma/client'
import type { TaskWithAssignee } from '@/app/actions/tasks'

interface TaskBoardProps {
  initialTasks: TaskWithAssignee[]
  initialProjects: Project[]
  defaultProjectId: string
  hasPro: boolean
}

export function TaskBoard({
  initialTasks,
  initialProjects,
  defaultProjectId,
  hasPro,
}: TaskBoardProps) {
  const [currentProjectId, setCurrentProjectId] = useState(defaultProjectId)
  const [projects, setProjects] = useState(initialProjects)

  // Use SWR for realtime task updates with polling
  // Initial data from server is used as fallback until first fetch completes
  const { tasks, isValidating, mutate } = useAllTasks({
    refreshInterval: 3000, // Poll every 3 seconds for updates from other users
    fallbackData: initialTasks,
  })

  // Filter tasks by current project
  const filteredTasks = tasks.filter(
    task => task.projectId === currentProjectId
  )

  const handleProjectChange = useCallback((projectId: string) => {
    setCurrentProjectId(projectId)
  }, [])

  // Update projects when they change from server
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <ProjectSelector
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectChange={handleProjectChange}
          hasPro={hasPro}
        />
        <CreateTaskDialog projectId={currentProjectId} onTaskCreated={mutate} />
      </div>

      <div className={isValidating ? 'opacity-90' : ''}>
        <Pipeline
          initialTasks={filteredTasks}
          projectId={currentProjectId}
          onMutate={mutate}
        />
      </div>
    </div>
  )
}
