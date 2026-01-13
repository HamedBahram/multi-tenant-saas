'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Pipeline from '@/components/pipeline'
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { ProjectSelector } from '@/components/project-selector'
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
  const [tasks, setTasks] = useState(initialTasks)
  const [projects, setProjects] = useState(initialProjects)
  const [isLoading, startTransition] = useTransition()

  // Filter tasks by current project
  const filteredTasks = tasks.filter(
    task => task.projectId === currentProjectId
  )

  const handleProjectChange = useCallback((projectId: string) => {
    setCurrentProjectId(projectId)
    // Tasks will be filtered client-side from the full list
    // For large datasets, you'd want to fetch from server instead
  }, [])

  // Refresh when tasks/projects change from server (after mutations)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

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
        <CreateTaskDialog projectId={currentProjectId} />
      </div>

      <div className={isLoading ? 'opacity-50' : ''}>
        <Pipeline initialTasks={filteredTasks} projectId={currentProjectId} />
      </div>
    </div>
  )
}
