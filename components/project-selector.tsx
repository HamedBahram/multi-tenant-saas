'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, Plus, Folder, Crown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { createProject, deleteProject, renameProject } from '@/app/actions/projects'
import Link from 'next/link'

interface Project {
  id: string
  name: string
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
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentProject = projects.find(p => p.id === currentProjectId)
  const isLastProject = projects.length <= 1

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

  const handleRenameClick = (project: Project) => {
    setSelectedProject(project)
    setProjectName(project.name)
    setError(null)
    setIsRenameOpen(true)
  }

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project)
    setError(null)
    setIsDeleteOpen(true)
  }

  const handleRenameProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim() || !selectedProject) return

    setError(null)
    startTransition(async () => {
      const result = await renameProject(selectedProject.id, projectName.trim())
      if (result.success) {
        setProjectName('')
        setIsRenameOpen(false)
        setSelectedProject(null)
      } else {
        setError(result.error)
      }
    })
  }

  const handleDeleteProject = () => {
    if (!selectedProject) return

    setError(null)
    startTransition(async () => {
      const result = await deleteProject(selectedProject.id)
      if (result.success) {
        setIsDeleteOpen(false)
        setSelectedProject(null)
        // Switch to first available project if deleting current
        if (selectedProject.id === currentProjectId) {
          const remainingProject = projects.find(p => p.id !== selectedProject.id)
          if (remainingProject) {
            onProjectChange(remainingProject.id)
          }
        }
      } else {
        setError(result.error)
      }
    })
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
            <div
              key={project.id}
              className={`flex items-center justify-between gap-1 rounded-sm px-2 py-1.5 ${
                currentProjectId === project.id ? 'bg-accent' : ''
              }`}
            >
              <button
                onClick={() => onProjectChange(project.id)}
                className='flex flex-1 items-center gap-2 text-sm outline-none'
              >
                <Folder className='h-4 w-4' />
                <span className='truncate'>{project.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 shrink-0 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100'
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal className='h-3.5 w-3.5' />
                    <span className='sr-only'>Project options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-40'>
                  <DropdownMenuItem onClick={() => handleRenameClick(project)}>
                    <Pencil className='mr-2 h-4 w-4' />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(project)}
                    disabled={isLastProject}
                    className={isLastProject ? 'opacity-50' : 'text-destructive focus:text-destructive'}
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      {/* Rename Project Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <form onSubmit={handleRenameProject}>
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
              <DialogDescription>
                Enter a new name for your project.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='rename-project-name'>Project Name</Label>
                <Input
                  id='rename-project-name'
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
                onClick={() => setIsRenameOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending || !projectName.trim()}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedProject?.name}&rdquo;? This will
              also delete all tasks in this project. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className='text-sm text-red-500 py-2'>{error}</p>}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteProject}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
