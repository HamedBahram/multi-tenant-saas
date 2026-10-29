import { clerkClient } from '@clerk/nextjs/server'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import type { AuthInfo, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import * as projectData from '@/lib/data/projects'
import type { ActionResult } from '@/lib/data/result'
import * as taskData from '@/lib/data/tasks'

export const instructions = `This server gives access to the user's task tracker.
Data is organized as organizations > projects > tasks. Every tool takes an
optional orgId; it is only required when the user belongs to more than one
organization (call list_organizations to find it). Task status is one of
PLANNED, IN_PROGRESS or DONE.`

const orgIdInput = z
  .string()
  .optional()
  .describe(
    'Organization ID from list_organizations. Optional when the user belongs to exactly one organization.'
  )

const taskStatusInput = z.enum(['PLANNED', 'IN_PROGRESS', 'DONE'])

function json(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

function toolResult<T>(result: ActionResult<T>, format: (data: T) => unknown) {
  return result.success ? json(format(result.data)) : toolError(result.error)
}

// withMcpAuth only lets requests through with a verified Clerk OAuth token
function getUserId(ctx: { http?: { authInfo?: AuthInfo } }) {
  const userId = ctx.http?.authInfo?.extra?.userId
  if (typeof userId !== 'string') throw new Error('Missing authenticated user')
  return userId
}

async function getMemberships(userId: string) {
  const clerk = await clerkClient()
  const { data } = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  })
  return data
}

// OAuth tokens carry no active organization, so every call checks membership
async function resolveOrgId(
  userId: string,
  orgId?: string
): Promise<ActionResult<string>> {
  const memberships = await getMemberships(userId)

  if (orgId) {
    return memberships.some(m => m.organization.id === orgId)
      ? { success: true, data: orgId }
      : {
          success: false,
          error: 'Organization not found, or you are not a member of it.',
        }
  }

  if (memberships.length === 1) {
    return { success: true, data: memberships[0].organization.id }
  }

  return {
    success: false,
    error:
      memberships.length === 0
        ? 'You are not a member of any organization.'
        : 'You belong to several organizations. Pass orgId (see list_organizations).',
  }
}

// OAuth tokens carry no plan claims, so read the org's subscription instead
async function orgHasPro(orgId: string) {
  const clerk = await clerkClient()

  try {
    const subscription =
      await clerk.billing.getOrganizationBillingSubscription(orgId)
    return subscription.subscriptionItems.some(
      item => item.plan?.slug === 'pro' && item.status === 'active'
    )
  } catch (err) {
    if (isClerkAPIResponseError(err) && err.status === 404) return false
    throw err
  }
}

function formatTask(
  task: Awaited<ReturnType<typeof taskData.listTasks>>[number]
) {
  const assignee = task.assignee
    ? [task.assignee.firstName, task.assignee.lastName]
        .filter(Boolean)
        .join(' ') || task.assignee.email
    : null

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    project: task.project,
    assignee,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

export function registerTools(server: McpServer) {
  server.registerTool(
    'list_organizations',
    {
      title: 'List organizations',
      description: 'List the organizations the user belongs to.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ctx => {
      const memberships = await getMemberships(getUserId(ctx))

      return json(
        memberships.map(m => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        }))
      )
    }
  )

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List the projects in an organization.',
      inputSchema: z.object({ orgId: orgIdInput }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ orgId }, ctx) => {
      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const projects = await projectData.listProjects(org.data)

      return json(
        projects.map(project => ({
          id: project.id,
          name: project.name,
          taskCount: project._count.tasks,
          createdAt: project.createdAt,
        }))
      )
    }
  )

  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description:
        'List tasks in an organization, optionally filtered by project and status.',
      inputSchema: z.object({
        orgId: orgIdInput,
        projectId: z.string().optional().describe('Only tasks in this project'),
        status: taskStatusInput
          .optional()
          .describe('Only tasks with this status'),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ orgId, projectId, status }, ctx) => {
      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const tasks = await taskData.listTasks(org.data, { projectId, status })
      return json(tasks.map(formatTask))
    }
  )

  server.registerTool(
    'create_task',
    {
      title: 'Create task',
      description:
        "Create a task assigned to the user. Defaults to the organization's first project and PLANNED status.",
      inputSchema: z.object({
        orgId: orgIdInput,
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        projectId: z
          .string()
          .optional()
          .describe(
            "Project to add the task to. Defaults to the organization's first project."
          ),
        status: taskStatusInput.optional(),
      }),
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    async ({ orgId, title, description, projectId, status }, ctx) => {
      const userId = getUserId(ctx)
      const org = await resolveOrgId(userId, orgId)
      if (!org.success) return toolError(org.error)

      // Ensure the user exists in our database before assigning the task
      const clerk = await clerkClient()
      await taskData.upsertUser(await clerk.users.getUser(userId))

      const result = await taskData.createTask(org.data, {
        title,
        description,
        projectId,
        status,
        assigneeId: userId,
      })

      return toolResult(result, ({ id }) => ({ id }))
    }
  )

  server.registerTool(
    'update_task',
    {
      title: 'Update task',
      description:
        "Update a task's title, description or status. Changing status moves the task to the end of that column.",
      inputSchema: z.object({
        orgId: orgIdInput,
        taskId: z.string(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).optional(),
        status: taskStatusInput.optional(),
      }),
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orgId, taskId, title, description, status }, ctx) => {
      if (title === undefined && description === undefined && !status) {
        return toolError(
          'Provide at least one of title, description or status.'
        )
      }

      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const result = await taskData.updateTask(org.data, taskId, {
        title,
        description,
        status,
      })

      return toolResult(result, () => ({ id: taskId, updated: true }))
    }
  )

  server.registerTool(
    'delete_task',
    {
      title: 'Delete task',
      description: 'Permanently delete a task.',
      inputSchema: z.object({ orgId: orgIdInput, taskId: z.string() }),
      annotations: {
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orgId, taskId }, ctx) => {
      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const result = await taskData.deleteTask(org.data, taskId)
      return toolResult(result, () => ({ id: taskId, deleted: true }))
    }
  )

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description:
        'Create a project. Organizations on the free plan are limited to one project; more require the Pro plan.',
      inputSchema: z.object({
        orgId: orgIdInput,
        name: z.string().trim().min(1).max(100),
      }),
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    async ({ orgId, name }, ctx) => {
      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const result = await projectData.createProject(org.data, name, {
        hasPro: await orgHasPro(org.data),
      })

      return toolResult(result, ({ id }) => ({ id }))
    }
  )

  server.registerTool(
    'rename_project',
    {
      title: 'Rename project',
      description: 'Rename a project.',
      inputSchema: z.object({
        orgId: orgIdInput,
        projectId: z.string(),
        name: z.string().trim().min(1).max(100),
      }),
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orgId, projectId, name }, ctx) => {
      const org = await resolveOrgId(getUserId(ctx), orgId)
      if (!org.success) return toolError(org.error)

      const result = await projectData.renameProject(org.data, projectId, name)
      return toolResult(result, () => ({ id: projectId, name }))
    }
  )
}
