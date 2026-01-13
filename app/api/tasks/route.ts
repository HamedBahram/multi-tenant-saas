import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { orgId } = await auth()

    if (!orgId) {
      return NextResponse.json(
        { error: 'You must be in an organization to fetch tasks' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // If no projectId, get all tasks for the org
    const whereClause = projectId
      ? { orgId, projectId }
      : { orgId }

    const tasks = await db.task.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
      include: {
        assignee: true,
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
