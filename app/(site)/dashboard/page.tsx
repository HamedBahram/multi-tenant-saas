import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Folder,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { getDashboardStats } from '@/app/actions/tasks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect('/')
  }

  const stats = await getDashboardStats()

  const completionRate =
    stats.totalTasks > 0
      ? Math.round((stats.tasksByStatus.DONE / stats.totalTasks) * 100)
      : 0

  return (
    <section className='w-full py-32'>
      <div className='container max-w-7xl'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='font-heading text-3xl font-semibold tracking-tight'>
            Dashboard
          </h1>
          <p className='text-muted-foreground mt-1'>
            Overview of your tasks and projects
          </p>
        </div>

        {/* Stats Grid */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {/* Total Tasks */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Total Tasks</CardTitle>
              <ListTodo className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>{stats.totalTasks}</div>
              <p className='text-muted-foreground text-xs'>
                Across {stats.projectCount} project
                {stats.projectCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Planned */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Planned</CardTitle>
              <div
                className='h-3 w-3 rounded-full'
                style={{ backgroundColor: 'rgba(120, 119, 116, 0.8)' }}
              />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {stats.tasksByStatus.PLANNED}
              </div>
              <p className='text-muted-foreground text-xs'>Tasks to start</p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>In Progress</CardTitle>
              <Clock className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {stats.tasksByStatus.IN_PROGRESS}
              </div>
              <p className='text-muted-foreground text-xs'>Being worked on</p>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Completed</CardTitle>
              <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {stats.tasksByStatus.DONE}
              </div>
              <p className='text-muted-foreground text-xs'>Tasks finished</p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className='mt-6 grid gap-6 lg:grid-cols-3'>
          {/* Progress Overview */}
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4' />
                Progress
              </CardTitle>
              <CardDescription>Overall task completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {/* Completion percentage */}
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-sm'>
                    Completion rate
                  </span>
                  <span className='text-2xl font-bold'>{completionRate}%</span>
                </div>

                {/* Progress bar */}
                <div className='bg-secondary h-3 w-full overflow-hidden rounded-full'>
                  <div
                    className='h-full rounded-full bg-emerald-500 transition-all duration-500'
                    style={{ width: `${completionRate}%` }}
                  />
                </div>

                {/* Status breakdown */}
                <div className='space-y-2 pt-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <div
                        className='h-2.5 w-2.5 rounded-full'
                        style={{ backgroundColor: 'rgba(120, 119, 116, 0.8)' }}
                      />
                      <span>Planned</span>
                    </div>
                    <span className='font-medium'>
                      {stats.tasksByStatus.PLANNED}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <div className='h-2.5 w-2.5 rounded-full bg-amber-500' />
                      <span>In Progress</span>
                    </div>
                    <span className='font-medium'>
                      {stats.tasksByStatus.IN_PROGRESS}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <div className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
                      <span>Done</span>
                    </div>
                    <span className='font-medium'>
                      {stats.tasksByStatus.DONE}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className='lg:col-span-2'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Recent Tasks</CardTitle>
                  <CardDescription>Latest updated tasks</CardDescription>
                </div>
                <Button variant='ghost' size='sm' asChild>
                  <Link href='/'>
                    View all
                    <ArrowRight className='ml-1 h-4 w-4' />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentTasks.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 text-center'>
                  <ListTodo className='text-muted-foreground mb-3 h-10 w-10' />
                  <p className='text-muted-foreground text-sm'>
                    No tasks yet. Create your first task to get started!
                  </p>
                  <Button variant='outline' size='sm' className='mt-4' asChild>
                    <Link href='/'>Go to Board</Link>
                  </Button>
                </div>
              ) : (
                <div className='space-y-4'>
                  {stats.recentTasks.map(task => {
                    const statusConfig = {
                      PLANNED: {
                        label: 'Planned',
                        color: 'rgba(120, 119, 116, 0.8)',
                        bgColor: 'rgba(120, 119, 116, 0.15)',
                      },
                      IN_PROGRESS: {
                        label: 'In Progress',
                        color: '#C4841D',
                        bgColor: 'rgba(196, 132, 29, 0.15)',
                      },
                      DONE: {
                        label: 'Done',
                        color: '#448361',
                        bgColor: 'rgba(68, 131, 97, 0.15)',
                      },
                    }[task.status]

                    const assigneeName = task.assignee
                      ? [task.assignee.firstName, task.assignee.lastName]
                          .filter(Boolean)
                          .join(' ') || task.assignee.email
                      : null

                    const assigneeInitials = task.assignee
                      ? (task.assignee.firstName?.[0] ?? '') +
                        (task.assignee.lastName?.[0] ?? '')
                      : '?'

                    return (
                      <div
                        key={task.id}
                        className='flex items-center justify-between gap-4 rounded-lg border p-3'
                      >
                        <div className='flex min-w-0 items-center gap-3'>
                          {task.assignee && (
                            <Avatar className='h-8 w-8 shrink-0'>
                              <AvatarImage
                                src={task.assignee.imageUrl ?? undefined}
                              />
                              <AvatarFallback className='text-xs'>
                                {assigneeInitials.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className='min-w-0'>
                            <p className='truncate font-medium'>{task.title}</p>
                            <p className='text-muted-foreground truncate text-xs'>
                              {task.project.name}
                              {assigneeName && ` • ${assigneeName}`}
                            </p>
                          </div>
                        </div>
                        <span
                          className='shrink-0 rounded px-2 py-0.5 text-xs font-medium'
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects Summary */}
        <Card className='mt-6'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Folder className='h-4 w-4' />
                  Projects
                </CardTitle>
                <CardDescription>Task distribution by project</CardDescription>
              </div>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/'>
                  Manage
                  <ArrowRight className='ml-1 h-4 w-4' />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.projects.length === 0 ? (
              <p className='text-muted-foreground py-4 text-center text-sm'>
                No projects yet.
              </p>
            ) : (
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {stats.projects.map(project => (
                  <div
                    key={project.id}
                    className='flex items-center justify-between rounded-lg border p-4'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='bg-primary/10 text-primary rounded-lg p-2'>
                        <Folder className='h-4 w-4' />
                      </div>
                      <div>
                        <p className='font-medium'>{project.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {project.taskCount} task
                          {project.taskCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
