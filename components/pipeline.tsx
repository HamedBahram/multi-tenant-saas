'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/kibo-ui/kanban'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { EditTaskDialog } from '@/components/edit-task-dialog'
import {
  updateTaskStatus,
  reorderTasks,
  deleteTask,
  createTask,
  type TaskWithAssignee,
} from '@/app/actions/tasks'
import { TaskStatus } from '@/lib/generated/prisma/client'

const columns = [
  {
    id: 'PLANNED',
    name: 'Planned',
    color: '#787774',
    bgColor: 'rgba(120, 119, 116, 0.15)',
  },
  {
    id: 'IN_PROGRESS',
    name: 'In Progress',
    color: '#C4841D',
    bgColor: 'rgba(196, 132, 29, 0.15)',
  },
  {
    id: 'DONE',
    name: 'Done',
    color: '#448361',
    bgColor: 'rgba(68, 131, 97, 0.15)',
  },
] as const

type TaskItem = {
  id: string
  title: string
  description: string | null
  column: string
  status: TaskStatus
  order: number
  assigneeId: string | null
  assignee: {
    id: string
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    email: string | null
  } | null
  createdAt: Date
  updatedAt: Date
}

type OptimisticAction =
  | { type: 'update_status'; taskId: string; newStatus: TaskStatus }
  | { type: 'reorder'; tasks: TaskItem[] }
  | { type: 'add'; task: TaskItem }
  | { type: 'delete'; taskId: string }

function tasksReducer(state: TaskItem[], action: OptimisticAction): TaskItem[] {
  switch (action.type) {
    case 'update_status':
      return state.map(task =>
        task.id === action.taskId
          ? { ...task, status: action.newStatus, column: action.newStatus }
          : task
      )
    case 'reorder':
      return action.tasks
    case 'add':
      return [...state, action.task]
    case 'delete':
      return state.filter(task => task.id !== action.taskId)
    default:
      return state
  }
}

interface PipelineProps {
  initialTasks: TaskWithAssignee[]
  projectId?: string
  /** Callback to trigger SWR revalidation after mutations */
  onMutate?: () => void
}

// Inline create task component for each column
function InlineCreateTask({
  projectId,
  status,
  onTaskCreated,
}: {
  projectId?: string
  status: TaskStatus
  onTaskCreated?: () => void
}) {
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
        projectId,
        status
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
    <>
      <button
        onClick={() => setOpen(true)}
        className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors'
      >
        <Plus className='h-4 w-4' />
        <span>New</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to this column.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='inline-task-title'>Title</Label>
                <Input
                  id='inline-task-title'
                  placeholder='Enter task title...'
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='inline-task-description'>Description (optional)</Label>
                <textarea
                  id='inline-task-description'
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
    </>
  )
}

export default function Pipeline({
  initialTasks,
  projectId,
  onMutate,
}: PipelineProps) {
  const [isPending, startTransition] = useTransition()
  const [editingTask, setEditingTask] = useState<{
    id: string
    title: string
    description: string | null
  } | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deletingTask, setDeletingTask] = useState<{
    id: string
    title: string
  } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Transform tasks to include column field for kanban compatibility
  const transformedTasks: TaskItem[] = initialTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    column: task.status,
    status: task.status,
    order: task.order,
    assigneeId: task.assigneeId,
    assignee: task.assignee,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }))

  const [optimisticTasks, addOptimisticUpdate] = useOptimistic(
    transformedTasks,
    tasksReducer
  )

  const handleEdit = (task: TaskItem) => {
    setEditingTask({ id: task.id, title: task.title, description: task.description })
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (task: TaskItem) => {
    setDeletingTask({ id: task.id, title: task.title })
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!deletingTask) return

    const taskId = deletingTask.id
    setIsDeleteDialogOpen(false)
    setDeletingTask(null)

    startTransition(async () => {
      // Optimistically remove the task from UI
      addOptimisticUpdate({ type: 'delete', taskId })

      // Call the server action
      const result = await deleteTask(taskId)
      if (!result.success) {
        console.error('Failed to delete task:', result.error)
      }
      // Trigger SWR revalidation for realtime sync
      onMutate?.()
    })
  }

  const handleDataChange = (newData: TaskItem[]) => {
    // Find tasks that changed columns
    const changedTasks = newData.filter(newTask => {
      const oldTask = optimisticTasks.find(t => t.id === newTask.id)
      return oldTask && oldTask.column !== newTask.column
    })

    if (changedTasks.length > 0) {
      const changedTask = changedTasks[0]
      const newStatus = changedTask.column as TaskStatus

      startTransition(async () => {
        // Optimistically update the UI
        addOptimisticUpdate({
          type: 'update_status',
          taskId: changedTask.id,
          newStatus,
        })

        // Call the server action
        const result = await updateTaskStatus(changedTask.id, newStatus)
        if (!result.success) {
          console.error('Failed to update task status:', result.error)
        }
        // Trigger SWR revalidation for realtime sync
        onMutate?.()
      })
    } else {
      // Handle reordering within the same column
      startTransition(async () => {
        addOptimisticUpdate({ type: 'reorder', tasks: newData })

        // Group tasks by column and update order
        const tasksByColumn = newData.reduce(
          (acc, task) => {
            if (!acc[task.column]) acc[task.column] = []
            acc[task.column].push(task.id)
            return acc
          },
          {} as Record<string, string[]>
        )

        // Update each column's task order
        for (const [column, taskIds] of Object.entries(tasksByColumn)) {
          await reorderTasks(taskIds, column as TaskStatus)
        }
        // Trigger SWR revalidation for realtime sync
        onMutate?.()
      })
    }
  }

  const taskCount = (columnId: string) =>
    optimisticTasks.filter(t => t.column === columnId).length

  return (
    <>
      <KanbanProvider
        columns={columns.map(col => ({ ...col, id: col.id }))}
        data={optimisticTasks}
        onDataChange={handleDataChange}
      >
        {column => (
          <KanbanBoard
            id={column.id}
            key={column.id}
            className={`max-h-[450px] sm:max-h-[600px] ${isPending ? 'opacity-70' : ''}`}
          >
            <KanbanHeader>
              <div className='flex items-center gap-2'>
                {/* Notion-style colored pill badge */}
                <span
                  className='inline-flex items-center rounded px-2 py-0.5 text-xs font-medium'
                  style={{
                    backgroundColor: column.bgColor,
                    color: column.color,
                  }}
                >
                  {column.name}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {taskCount(column.id)}
                </span>
              </div>
            </KanbanHeader>
            <KanbanCards id={column.id}>
              {(task: TaskItem) => {
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
                  <KanbanCard
                    column={column.id}
                    id={task.id}
                    key={task.id}
                    title={task.title}
                  >
                    <div className='flex flex-col gap-2'>
                      {/* Title */}
                      <div className='flex items-start justify-between gap-2'>
                        <p className='m-0 flex-1 leading-snug font-medium'>
                          {task.title}
                        </p>
                        <div className='-mt-1 -mr-1 flex shrink-0 items-center gap-0.5 transition-opacity in-data-dragging:opacity-100 md:opacity-0 md:group-hover:opacity-100'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground hover:text-foreground h-6 w-6'
                            onClick={e => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleEdit(task)
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            <Pencil className='h-3.5 w-3.5' />
                            <span className='sr-only'>Edit task</span>
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground hover:text-destructive h-6 w-6'
                            onClick={e => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleDeleteClick(task)
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                            <span className='sr-only'>Delete task</span>
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className='text-muted-foreground m-0 line-clamp-2 text-xs'>
                          {task.description}
                        </p>
                      )}

                      {/* Assignee on left, date on right */}
                      <div className='text-muted-foreground flex items-center justify-between text-xs'>
                        {task.assignee ? (
                          <div className='flex items-center gap-2'>
                            <Avatar className='h-5 w-5'>
                              <AvatarImage
                                src={task.assignee.imageUrl ?? undefined}
                              />
                              <AvatarFallback className='text-[9px]'>
                                {assigneeInitials.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{assigneeName}</span>
                          </div>
                        ) : (
                          <div />
                        )}
                        <span>
                          {new Date(task.createdAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </KanbanCard>
                )
              }}
            </KanbanCards>
            {/* New task button at bottom of column */}
            <div className='px-1 pb-2'>
              <InlineCreateTask
                projectId={projectId}
                status={column.id as TaskStatus}
                onTaskCreated={onMutate}
              />
            </div>
          </KanbanBoard>
        )}
      </KanbanProvider>

      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingTask?.title}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
