'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

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

export async function getProjects() {
  const orgId = await getOrgIdOrThrow()

  const projects = await db.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })

  return projects
}

export async function createProject(
  name: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, has } = await auth()

    if (!orgId) {
      return {
        success: false,
        error: 'You must be in an organization to create a project',
      }
    }

    // Check if user has Pro plan - gate multiple projects behind billing
    const hasPro = has?.({ plan: 'pro' })

    if (!hasPro) {
      // Free tier: max 1 project
      const projectCount = await db.project.count({
        where: { orgId },
      })

      if (projectCount >= 1) {
        return {
          success: false,
          error: 'Upgrade to Pro to create multiple projects.',
        }
      }
    }

    const project = await db.project.create({
      data: {
        name,
        orgId,
      },
    })

    revalidatePath('/')
    return { success: true, data: { id: project.id } }
  } catch (error) {
    console.error('Failed to create project:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create project',
    }
  }
}

export async function deleteProject(
  projectId: string
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const project = await db.project.findFirst({
      where: { id: projectId, orgId },
    })

    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    // Prevent deleting the last project
    const projectCount = await db.project.count({
      where: { orgId },
    })

    if (projectCount <= 1) {
      return { success: false, error: 'Cannot delete your only project' }
    }

    // Delete all tasks in the project first
    await db.task.deleteMany({
      where: { projectId },
    })

    await db.project.delete({
      where: { id: projectId },
    })

    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to delete project:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete project',
    }
  }
}

export async function checkProAccess(): Promise<boolean> {
  const { has } = await auth()
  return has?.({ plan: 'pro' }) ?? false
}

