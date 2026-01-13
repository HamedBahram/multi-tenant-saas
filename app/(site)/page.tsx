import { auth } from '@clerk/nextjs/server'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { TaskBoard } from '@/components/task-board'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Kanban, Users, Zap, ArrowRight } from 'lucide-react'

async function getDataForOrg(orgId: string) {
  // Get all projects for this org
  let projects = await db.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })

  // Auto-create first project if none exist (onboarding)
  if (projects.length === 0) {
    const newProject = await db.project.create({
      data: {
        name: 'My Project',
        orgId,
      },
    })
    projects = [newProject]
  }

  // Get all tasks for this org (all projects)
  const tasks = await db.task.findMany({
    where: { orgId },
    orderBy: { order: 'asc' },
    include: { assignee: true },
  })

  return { projects, tasks, defaultProjectId: projects[0].id }
}

export default async function Home() {
  const { orgId, has } = await auth()

  // Check if user has Pro plan
  const hasPro = has?.({ plan: 'pro' }) ?? false

  // Fetch data if user is in an organization
  const data = orgId
    ? await getDataForOrg(orgId)
    : { projects: [], tasks: [], defaultProjectId: '' }

  return (
    <>
      <SignedOut>
        <section className='pointer-events-none relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden sm:min-h-[calc(100vh-6rem)]'>
          {/* Background decoration */}
          <div className='absolute inset-0 -z-20 overflow-hidden'>
            <div className='bg-primary/5 absolute top-1/4 left-1/4 h-48 w-48 rounded-full blur-3xl sm:h-72 sm:w-72 md:h-96 md:w-96' />
            <div className='bg-chart-1/10 absolute right-1/4 bottom-1/4 h-40 w-40 rounded-full blur-3xl sm:h-60 sm:w-60 md:h-80 md:w-80' />
            <div className='from-chart-2/5 absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br to-transparent blur-3xl sm:h-[450px] sm:w-[450px] md:h-[600px] md:w-[600px]' />
          </div>

          <div className='pointer-events-auto container max-w-4xl px-4 pt-16 text-center sm:px-6 sm:pt-0'>
            {/* Badge */}
            <div className='bg-primary/10 text-primary animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:mb-8 sm:px-4 sm:py-2 sm:text-sm'>
              <Zap className='size-3 sm:size-4' />
              <span>Streamline your workflow</span>
            </div>

            {/* Headline */}
            <h1 className='from-foreground via-foreground to-muted-foreground mb-4 bg-linear-to-br bg-clip-text text-3xl font-bold tracking-tight sm:mb-6 sm:text-5xl md:text-6xl'>
              Project management
              <br />
              <span className='text-primary'>made simple</span>
            </h1>

            {/* Description */}
            <p className='text-muted-foreground mx-auto mb-8 max-w-2xl text-base leading-relaxed sm:mb-10 sm:text-lg md:text-xl'>
              Organize tasks, collaborate with your team, and ship projects
              faster. Our intuitive Kanban boards help you visualize progress
              and stay on track.
            </p>

            {/* CTA */}
            <div className='mb-10 flex flex-col items-center justify-center gap-4 sm:mb-16 sm:flex-row'>
              <SignInButton mode='modal'>
                <Button
                  size='lg'
                  className='shadow-primary/25 hover:shadow-primary/30 h-11 rounded-full px-6 text-sm shadow-lg transition-all hover:shadow-xl sm:h-12 sm:px-8 sm:text-base'
                >
                  Get started free
                  <ArrowRight className='ml-1 size-4 sm:size-5' />
                </Button>
              </SignInButton>
            </div>

            {/* Features */}
            <div className='mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6'>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-2 rounded-xl border p-4 backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-6'>
                <div className='bg-chart-1/10 text-chart-1 rounded-lg p-2.5 sm:rounded-xl sm:p-3'>
                  <Kanban className='size-5 sm:size-6' />
                </div>
                <h3 className='text-sm font-semibold sm:text-base'>
                  Kanban Boards
                </h3>
                <p className='text-muted-foreground text-xs sm:text-sm'>
                  Drag and drop tasks through customizable workflows
                </p>
              </div>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-2 rounded-xl border p-4 backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-6'>
                <div className='bg-chart-2/10 text-chart-2 rounded-lg p-2.5 sm:rounded-xl sm:p-3'>
                  <Users className='size-5 sm:size-6' />
                </div>
                <h3 className='text-sm font-semibold sm:text-base'>
                  Team Collaboration
                </h3>
                <p className='text-muted-foreground text-xs sm:text-sm'>
                  Work together seamlessly with your organization
                </p>
              </div>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-2 rounded-xl border p-4 backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-6'>
                <div className='bg-chart-4/10 text-chart-4 rounded-lg p-2.5 sm:rounded-xl sm:p-3'>
                  <Zap className='size-5 sm:size-6' />
                </div>
                <h3 className='text-sm font-semibold sm:text-base'>
                  Lightning Fast
                </h3>
                <p className='text-muted-foreground text-xs sm:text-sm'>
                  Built for speed with real-time updates
                </p>
              </div>
            </div>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className='pt-24 pb-8 sm:py-32'>
          <div className='container max-w-7xl'>
            {/* <h1 className='text-3xl font-semibold'>Task tracker</h1> */}

            {!orgId ? (
              <p className='text-muted-foreground mt-4'>
                Please select or create an organization to start tracking tasks.
              </p>
            ) : (
              <div className='mt-6'>
                <TaskBoard
                  initialTasks={data.tasks}
                  initialProjects={data.projects}
                  defaultProjectId={data.defaultProjectId}
                  hasPro={hasPro}
                />
              </div>
            )}
          </div>
        </section>
      </SignedIn>
    </>
  )
}
