import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/data/result'

// Org-scoped project data access shared by server actions and the MCP server.
// Callers must establish that the current user belongs to `orgId`.

export async function listProjects(orgId: string) {
  return db.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { tasks: true } } },
  })
}

export async function getOrCreateDefaultProject(orgId: string) {
  const project = await db.project.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })

  return project ?? db.project.create({ data: { name: 'My Project', orgId } })
}

export async function createProject(
  orgId: string,
  name: string,
  { hasPro }: { hasPro: boolean }
): Promise<ActionResult<{ id: string }>> {
  // Free tier: max 1 project
  if (!hasPro) {
    const projectCount = await db.project.count({ where: { orgId } })

    if (projectCount >= 1) {
      return {
        success: false,
        error: 'Upgrade to Pro to create multiple projects.',
      }
    }
  }

  const project = await db.project.create({ data: { name, orgId } })
  return { success: true, data: { id: project.id } }
}

export async function renameProject(
  orgId: string,
  projectId: string,
  name: string
): Promise<ActionResult> {
  const project = await db.project.findFirst({
    where: { id: projectId, orgId },
  })

  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  await db.project.update({ where: { id: projectId }, data: { name } })
  return { success: true, data: undefined }
}

export async function deleteProject(
  orgId: string,
  projectId: string
): Promise<ActionResult> {
  const project = await db.project.findFirst({
    where: { id: projectId, orgId },
  })

  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  // Prevent deleting the last project
  const projectCount = await db.project.count({ where: { orgId } })

  if (projectCount <= 1) {
    return { success: false, error: 'Cannot delete your only project' }
  }

  // Tasks are removed by the onDelete: Cascade relation
  await db.project.delete({ where: { id: projectId } })
  return { success: true, data: undefined }
}
