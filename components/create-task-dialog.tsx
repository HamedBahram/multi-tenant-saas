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
  const [taskName, setTaskName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await createTask(taskName.trim(), projectId)
      if (result.success) {
        setTaskName('')
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
        <Button size='sm'>
          <Plus className='size-4' />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your board. It will be added to the Planned
              column.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='task-name'>Task Name</Label>
              <Input
                id='task-name'
                placeholder='Enter task name...'
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
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
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending || !taskName.trim()}>
              {isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
