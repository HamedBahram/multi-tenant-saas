'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTask } from '@/app/actions/tasks'

interface CreateTaskDialogProps {
  projectId?: string
  onTaskCreated?: () => void
}

export function CreateTaskDialog({
  projectId,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await createTask(
        taskTitle.trim(),
        taskDescription.trim() || undefined,
        projectId
      )
      if (result.success) {
        setTaskTitle('')
        setTaskDescription('')
        setOpen(false)
        onTaskCreated?.()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' className='sm:px-3'>
          <Plus className='size-4' />
          <span className='hidden sm:inline'>New Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to your board.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='task-title'>Title</Label>
              <Input
                id='task-title'
                placeholder='Enter task title...'
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='task-description'>Description (optional)</Label>
              <textarea
                id='task-description'
                placeholder='Enter task description...'
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                disabled={isPending}
                rows={3}
                className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              />
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending || !taskTitle.trim()}>
              {isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
