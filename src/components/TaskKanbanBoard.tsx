import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, Calendar, Users, Edit, Trash2, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, Customer } from "@/lib/admin-api";
import { useState } from "react";

interface TaskKanbanBoardProps {
  tasks: Task[];
  members: Customer[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string, previousStatus: string) => void;
}

const COLUMNS = [
  { id: "New", title: "New", color: "bg-blue-500/10 border-blue-200" },
  { id: "In Progress", title: "In Progress", color: "bg-yellow-500/10 border-yellow-200" },
  { id: "Completed", title: "Completed", color: "bg-green-500/10 border-green-200" },
  { id: "Cancelled", title: "Cancelled", color: "bg-gray-500/10 border-gray-200" },
];

interface TaskCardProps {
  task: Task;
  members: Customer[];
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

function TaskCard({ task, members, onEdit, onDelete, isDragging }: TaskCardProps) {
  return (
    <Card className={cn(
      "transition-all cursor-grab active:cursor-grabbing",
      isDragging && "opacity-50 rotate-2 scale-105 shadow-xl"
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-medium truncate">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
        {task.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1">{task.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs py-0">
            <ClipboardList className="h-3 w-3 mr-1" />
            {task.task_type}
          </Badge>
          {task.due_date && (
            <Badge variant="outline" className="text-xs py-0">
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(task.due_date), 'MMM dd')}
            </Badge>
          )}
          {task._assigned_customer ? (
            <Badge variant="outline" className="text-xs py-0">
              <Users className="h-3 w-3 mr-1" />
              {task._assigned_customer.Full_name?.split(' ')[0] || 'Assigned'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs py-0 text-muted-foreground/60">
              <Users className="h-3 w-3 mr-1" />
              Unassigned
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SortableTaskCardProps extends TaskCardProps {
  id: string;
}

function SortableTaskCard({ id, ...props }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} isDragging={isDragging} />
    </div>
  );
}

interface KanbanColumnProps {
  column: typeof COLUMNS[0];
  tasks: Task[];
  members: Customer[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

function KanbanColumn({ column, tasks, members, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);
  
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className={cn(
      "flex flex-col min-w-[280px] max-w-[320px] rounded-lg border-2 border-dashed p-3 transition-colors",
      column.color,
      isOver && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div 
          ref={setNodeRef}
          className="flex flex-col gap-2 min-h-[200px] flex-1"
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              id={task.id}
              task={task}
              members={members}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskKanbanBoard({ tasks, members, onEditTask, onDeleteTask, onStatusChange }: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    COLUMNS.forEach(col => {
      grouped[col.id] = tasks.filter(t => t.status === col.id);
    });
    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Find which column the task was dropped into
    let newStatus: string | null = null;
    
    // Check if dropped over another task
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      newStatus = overTask.status;
    } else {
      // Check if dropped directly on a column
      const column = COLUMNS.find(c => c.id === over.id);
      if (column) {
        newStatus = column.id;
      }
    }

    if (newStatus && newStatus !== task.status) {
      onStatusChange(taskId, newStatus, task.status);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            members={members}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            members={members}
            onEdit={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
