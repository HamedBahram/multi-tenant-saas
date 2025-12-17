'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, Plus, Folder, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProject } from '@/app/actions/projects'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  isDefault: boolean
}

interface ProjectSelectorProps {
  projects: Project[]
  currentProjectId: string
  onProjectChange: (projectId: string) => void
  hasPro: boolean
}

export function ProjectSelector({
  projects,
  currentProjectId,
  onProjectChange,
  hasPro,
}: ProjectSelectorProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentProject = projects.find(p => p.id === currentProjectId)

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await createProject(projectName.trim())
      if (result.success) {
        setProjectName('')
        setIsCreateOpen(false)
        onProjectChange(result.data.id)
      } else {
        setError(result.error)
      }
    })
  }

  const handleNewProjectClick = () => {
    if (hasPro) {
      setIsCreateOpen(true)
    } else {
      setIsUpgradeOpen(true)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='gap-2'>
            <Folder className='h-4 w-4' />
            {currentProject?.name || 'Select Project'}
            <ChevronDown className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56'>
          {projects.map(project => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => onProjectChange(project.id)}
              className={currentProjectId === project.id ? 'bg-accent' : ''}
            >
              <Folder className='mr-2 h-4 w-4' />
              {project.name}
              {project.isDefault && (
                <span className='text-muted-foreground ml-auto text-xs'>
                  Default
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNewProjectClick}>
            <Plus className='mr-2 h-4 w-4' />
            New Project
            {!hasPro && <Crown className='ml-auto h-4 w-4 text-yellow-500' />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your tasks.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='project-name'>Project Name</Label>
                <Input
                  id='project-name'
                  placeholder='Enter project name...'
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              {error && <p className='text-sm text-red-500'>{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending || !projectName.trim()}>
                {isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Crown className='h-5 w-5 text-yellow-500' />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              Creating multiple projects is a Pro feature. Upgrade your plan to
              organize tasks across different projects.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <ul className='space-y-2 text-sm'>
              <li className='flex items-center gap-2'>
                <span className='text-green-500'>✓</span>
                Unlimited projects
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-green-500'>✓</span>
                Advanced task management
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-green-500'>✓</span>
                Priority support
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsUpgradeOpen(false)}>
              Maybe Later
            </Button>
            <Button asChild onClick={() => setIsUpgradeOpen(false)}>
              <Link href='/pricing'>
                <Crown className='mr-2 h-4 w-4' />
                Upgrade Now
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
