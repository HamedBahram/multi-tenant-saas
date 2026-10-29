'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import * as taskData from '@/lib/data/tasks'
import type { ActionResult } from '@/lib/data/result'
import { TaskStatus } from '@/lib/generated/prisma/client'

async function getOrgIdOrThrow() {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error('You must be in an organization to perform this action')
  }
  return orgId
}

export async function createTask(
  title: string,
  description?: string,
  projectId?: string,
  status: TaskStatus = 'PLANNED'
): Promise<ActionResult<{ id: string }>> {
  try {
    const orgId = await getOrgIdOrThrow()
    const user = await currentUser()

    // Ensure the user exists in our database before assigning the task
    if (user) await taskData.upsertUser(user)

    const result = await taskData.createTask(orgId, {
      title,
      description,
      projectId,
      status,
      assigneeId: user?.id,
    })

    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to create task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
    }
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const result = await taskData.updateTask(orgId, taskId, { status })
    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to update task status:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update task status',
    }
  }
}

export async function reorderTasks(
  taskIds: string[],
  status: TaskStatus
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    // Update all tasks with their new order
    await db.$transaction(
      taskIds.map((id, index) =>
        db.task.updateMany({
          where: { id, orgId },
          data: { order: index, status },
        })
      )
    )

    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to reorder tasks:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder tasks',
    }
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const result = await taskData.deleteTask(orgId, taskId)
    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to delete task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task',
    }
  }
}

export async function updateTask(
  taskId: string,
  data: { title?: string; description?: string }
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const result = await taskData.updateTask(orgId, taskId, data)
    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to update task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    }
  }
}

export async function getTasks(projectId?: string) {
  const orgId = await getOrgIdOrThrow()

  // If no projectId, get tasks from the first project
  let targetProjectId = projectId
  if (!targetProjectId) {
    const firstProject = await db.project.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    })
    if (!firstProject) {
      return []
    }
    targetProjectId = firstProject.id
  }

  const tasks = await db.task.findMany({
    where: { orgId, projectId: targetProjectId },
    orderBy: { order: 'asc' },
    include: {
      assignee: true,
    },
  })

  return tasks
}

export type TaskWithAssignee = Awaited<ReturnType<typeof getTasks>>[number]

export async function getDashboardStats() {
  const orgId = await getOrgIdOrThrow()

  // Get all tasks for this org
  const tasks = await db.task.findMany({
    where: { orgId },
    include: { assignee: true, project: true },
    orderBy: { updatedAt: 'desc' },
  })

  // Get project count
  const projectCount = await db.project.count({
    where: { orgId },
  })

  // Get projects with task counts
  const projects = await db.project.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Calculate tasks by status
  const tasksByStatus: Record<TaskStatus, number> = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  }

  for (const task of tasks) {
    tasksByStatus[task.status]++
  }

  // Get recent tasks (last 5 updated)
  const recentTasks = tasks.slice(0, 5)

  return {
    tasksByStatus,
    recentTasks,
    totalTasks: tasks.length,
    projectCount,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      taskCount: p._count.tasks,
    })),
  }
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>
