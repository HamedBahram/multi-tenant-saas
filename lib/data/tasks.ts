import type { User } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getOrCreateDefaultProject } from '@/lib/data/projects'
import type { ActionResult } from '@/lib/data/result'
import type { TaskStatus } from '@/lib/generated/prisma/client'

// Org-scoped task data access shared by server actions and the MCP server.
// Callers must establish that the current user belongs to `orgId`.

export async function listTasks(
  orgId: string,
  { projectId, status }: { projectId?: string; status?: TaskStatus } = {}
) {
  return db.task.findMany({
    where: {
      orgId,
      ...(projectId && { projectId }),
      ...(status && { status }),
    },
    orderBy: [{ status: 'asc' }, { order: 'asc' }],
    include: {
      assignee: true,
      project: { select: { id: true, name: true } },
    },
  })
}

// Keep our user table in sync with Clerk before assigning tasks
export async function upsertUser(user: User) {
  const profile = {
    email: user.primaryEmailAddress?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  }

  await db.user.upsert({
    where: { id: user.id },
    update: profile,
    create: { id: user.id, ...profile },
  })
}

export async function createTask(
  orgId: string,
  input: {
    title: string
    description?: string
    projectId?: string
    status?: TaskStatus
    assigneeId?: string
  }
): Promise<ActionResult<{ id: string }>> {
  let projectId = input.projectId

  if (!projectId) {
    // If no projectId provided, use the first project
    projectId = (await getOrCreateDefaultProject(orgId)).id
  } else {
    // Never trust a client-supplied project: it must belong to the org
    const project = await db.project.findFirst({
      where: { id: projectId, orgId },
    })

    if (!project) {
      return { success: false, error: 'Project not found' }
    }
  }

  const status = input.status ?? 'PLANNED'

  // Get the highest order value for tasks in this project with the target status
  const lastTask = await db.task.findFirst({
    where: { projectId, status },
    orderBy: { order: 'desc' },
  })

  const task = await db.task.create({
    data: {
      title: input.title,
      description: input.description || null,
      orgId,
      projectId,
      assigneeId: input.assigneeId,
      status,
      order: (lastTask?.order ?? 0) + 1,
    },
  })

  return { success: true, data: { id: task.id } }
}

export async function updateTask(
  orgId: string,
  taskId: string,
  data: { title?: string; description?: string; status?: TaskStatus }
): Promise<ActionResult> {
  const task = await db.task.findFirst({
    where: { id: taskId, orgId },
  })

  if (!task) {
    return { success: false, error: 'Task not found' }
  }

  // A status change moves the task to the end of the target column
  let order: number | undefined
  if (data.status !== undefined) {
    const lastTaskInColumn = await db.task.findFirst({
      where: { projectId: task.projectId, status: data.status },
      orderBy: { order: 'desc' },
    })
    order = (lastTaskInColumn?.order ?? 0) + 1
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.status !== undefined && { status: data.status, order }),
    },
  })

  return { success: true, data: undefined }
}

export async function deleteTask(
  orgId: string,
  taskId: string
): Promise<ActionResult> {
  const task = await db.task.findFirst({
    where: { id: taskId, orgId },
  })

  if (!task) {
    return { success: false, error: 'Task not found' }
  }

  await db.task.delete({ where: { id: taskId } })
  return { success: true, data: undefined }
}
