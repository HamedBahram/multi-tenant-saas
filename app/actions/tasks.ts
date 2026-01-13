'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { TaskStatus } from '@/lib/generated/prisma/client'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

async function getOrgIdOrThrow() {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error('You must be in an organization to perform this action')
  }
  return orgId
}

async function getOrCreateFirstProject(orgId: string) {
  let project = await db.project.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })

  if (!project) {
    project = await db.project.create({
      data: {
        name: 'My Project',
        orgId,
      },
    })
  }

  return project
}

export async function createTask(
  name: string,
  projectId?: string,
  status: TaskStatus = 'PLANNED'
): Promise<ActionResult<{ id: string }>> {
  try {
    const orgId = await getOrgIdOrThrow()
    const user = await currentUser()

    // If no projectId provided, use the first project
    let targetProjectId = projectId
    if (!targetProjectId) {
      const firstProject = await getOrCreateFirstProject(orgId)
      targetProjectId = firstProject.id
    }

    // Ensure the user exists in our database (upsert)
    if (user) {
      await db.user.upsert({
        where: { id: user.id },
        update: {
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        },
        create: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        },
      })
    }

    // Get the highest order value for tasks in this project with the target status
    const lastTask = await db.task.findFirst({
      where: { projectId: targetProjectId, status },
      orderBy: { order: 'desc' },
    })

    const task = await db.task.create({
      data: {
        name,
        orgId,
        projectId: targetProjectId,
        assigneeId: user?.id,
        status,
        order: (lastTask?.order ?? 0) + 1,
      },
    })

    revalidatePath('/')
    return { success: true, data: { id: task.id } }
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

    // Verify task belongs to this org
    const task = await db.task.findFirst({
      where: { id: taskId, orgId },
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Get the highest order value for tasks in the target status column
    const lastTaskInColumn = await db.task.findFirst({
      where: { projectId: task.projectId, status },
      orderBy: { order: 'desc' },
    })

    await db.task.update({
      where: { id: taskId },
      data: {
        status,
        order: (lastTaskInColumn?.order ?? 0) + 1,
      },
    })

    revalidatePath('/')
    return { success: true, data: undefined }
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

    // Verify task belongs to this org
    const task = await db.task.findFirst({
      where: { id: taskId, orgId },
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await db.task.delete({
      where: { id: taskId },
    })

    revalidatePath('/')
    return { success: true, data: undefined }
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
  data: { name?: string }
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    // Verify task belongs to this org
    const task = await db.task.findFirst({
      where: { id: taskId, orgId },
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await db.task.update({
      where: { id: taskId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    })

    revalidatePath('/')
    return { success: true, data: undefined }
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
