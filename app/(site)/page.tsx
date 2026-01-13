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
        <section className='pointer-events-none relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden'>
          {/* Background decoration */}
          <div className='absolute inset-0 -z-20'>
            <div className='bg-primary/5 absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-3xl' />
            <div className='bg-chart-1/10 absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full blur-3xl' />
            <div className='from-chart-2/5 absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br to-transparent blur-3xl' />
          </div>

          <div className='pointer-events-auto container max-w-4xl px-6 text-center'>
            {/* Badge */}
            <div className='bg-primary/10 text-primary animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium'>
              <Zap className='size-4' />
              <span>Streamline your workflow</span>
            </div>

            {/* Headline */}
            <h1 className='from-foreground via-foreground to-muted-foreground mb-6 bg-linear-to-br bg-clip-text text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl'>
              Project management
              <br />
              <span className='text-primary'>made simple</span>
            </h1>

            {/* Description */}
            <p className='text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed sm:text-xl'>
              Organize tasks, collaborate with your team, and ship projects
              faster. Our intuitive Kanban boards help you visualize progress
              and stay on track.
            </p>

            {/* CTA */}
            <div className='mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <SignInButton mode='modal'>
                <Button
                  size='lg'
                  className='shadow-primary/25 hover:shadow-primary/30 h-12 rounded-full px-8 text-base shadow-lg transition-all hover:shadow-xl'
                >
                  Get started free
                  <ArrowRight className='ml-1 size-5' />
                </Button>
              </SignInButton>
            </div>

            {/* Features */}
            <div className='mt-8 grid gap-6 sm:grid-cols-3'>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-3 rounded-2xl border p-6 backdrop-blur-sm'>
                <div className='bg-chart-1/10 text-chart-1 rounded-xl p-3'>
                  <Kanban className='size-6' />
                </div>
                <h3 className='font-semibold'>Kanban Boards</h3>
                <p className='text-muted-foreground text-sm'>
                  Drag and drop tasks through customizable workflows
                </p>
              </div>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-3 rounded-2xl border p-6 backdrop-blur-sm'>
                <div className='bg-chart-2/10 text-chart-2 rounded-xl p-3'>
                  <Users className='size-6' />
                </div>
                <h3 className='font-semibold'>Team Collaboration</h3>
                <p className='text-muted-foreground text-sm'>
                  Work together seamlessly with your organization
                </p>
              </div>
              <div className='bg-card/50 border-border/50 flex flex-col items-center gap-3 rounded-2xl border p-6 backdrop-blur-sm'>
                <div className='bg-chart-4/10 text-chart-4 rounded-xl p-3'>
                  <Zap className='size-6' />
                </div>
                <h3 className='font-semibold'>Lightning Fast</h3>
                <p className='text-muted-foreground text-sm'>
                  Built for speed with real-time updates
                </p>
              </div>
            </div>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className='py-32'>
          <div className='container max-w-7xl'>
            <h1 className='text-3xl font-semibold'>Task tracker</h1>

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
