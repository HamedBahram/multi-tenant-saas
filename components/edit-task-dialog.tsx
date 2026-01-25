'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
import { updateTask } from '@/app/actions/tasks'

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    description: string | null
  } | null
  onTaskUpdated?: () => void
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onTaskUpdated,
}: EditTaskDialogProps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Sync task fields when dialog opens with a new task
  useEffect(() => {
    if (task) {
      setTaskTitle(task.title)
      setTaskDescription(task.description || '')
      setError(null)
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim() || !task) return

    setError(null)
    startTransition(async () => {
      const result = await updateTask(task.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
      })
      if (result.success) {
        onOpenChange(false)
        onTaskUpdated?.()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-task-title'>Title</Label>
              <Input
                id='edit-task-title'
                placeholder='Enter task title...'
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-task-description'>Description (optional)</Label>
              <textarea
                id='edit-task-description'
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
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending || !taskTitle.trim()}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
