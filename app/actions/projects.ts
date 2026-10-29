'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import * as projectData from '@/lib/data/projects'
import type { ActionResult } from '@/lib/data/result'

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
    const hasPro = has?.({ plan: 'pro' }) ?? false

    const result = await projectData.createProject(orgId, name, { hasPro })
    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to create project:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create project',
    }
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const result = await projectData.deleteProject(orgId, projectId)
    if (result.success) revalidatePath('/')
    return result
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

export async function renameProject(
  projectId: string,
  newName: string
): Promise<ActionResult> {
  try {
    const orgId = await getOrgIdOrThrow()

    const result = await projectData.renameProject(orgId, projectId, newName)
    if (result.success) revalidatePath('/')
    return result
  } catch (error) {
    console.error('Failed to rename project:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to rename project',
    }
  }
}
