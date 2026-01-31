import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Save, Loader2, CalendarIcon, User } from "lucide-react";
import { adminAPI, type Task, type CreateTaskRequest, type Customer } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  task?: Task | null;
  clerkUserId: string;
  members?: Customer[];
  onSave: () => void;
  onCancel: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  task_type: string;
}

const statusOptions = [
  { value: "New", label: "New" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const taskTypeOptions = [
  { value: "Send Email", label: "Send Email" },
  { value: "Phone Call", label: "Phone Call" },
  { value: "Follow Up", label: "Follow Up" },
  { value: "Meeting", label: "Meeting" },
  { value: "Review", label: "Review" },
  { value: "Other", label: "Other" },
];

export function TaskForm({ task, clerkUserId, members = [], onSave, onCancel }: TaskFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(task?.status || "New");
  const [taskType, setTaskType] = useState(task?.task_type || "Other");
  // Find member by customers_id (not role id) to initialize with correct value
  const initialAssigned = task?.assigned_customers_id 
    ? members.find(m => m.customers_id === task.assigned_customers_id)?.customers_id || "unassigned"
    : "unassigned";
  const [assignedTo, setAssignedTo] = useState<string>(initialAssigned);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? new Date(task.due_date) : undefined
  );

  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      task_type: task?.task_type || "Other",
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const taskPayload: CreateTaskRequest = {
        title: data.title,
        description: data.description,
        status: status,
        task_type: taskType,
        due_date: dueDate ? dueDate.getTime() : null,
        assigned_customers_id: assignedTo === "unassigned" ? null : assignedTo,
      };

      if (task?.id) {
        await adminAPI.updateTask(task.id, taskPayload, clerkUserId);
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        await adminAPI.createTask(taskPayload, clerkUserId);
        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }
      onSave();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{task ? "Edit Task" : "Create Task"}</h2>
          <p className="text-muted-foreground">
            {task ? "Update task details" : "Add a new task"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register("title", { required: "Title is required" })}
                  placeholder="Enter task title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task_type">Task Type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {taskTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 max-h-[300px]">
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Unassigned</span>
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.customers_id} value={member.customers_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{member._customers?.Full_name || member._customers?.email || 'Unknown'}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter task description"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {task ? "Update Task" : "Create Task"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
