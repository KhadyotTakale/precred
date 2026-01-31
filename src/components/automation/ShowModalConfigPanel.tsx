import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ModalButton {
  id: string;
  text: string;
  value: string;
  fontColor: string;
  backgroundColor: string;
}

export interface ShowModalConfig {
  message: string;
  buttons: ModalButton[];
}

interface ShowModalConfigPanelProps {
  config: ShowModalConfig;
  onChange: (config: ShowModalConfig) => void;
}

// Predefined color options
const COLOR_PRESETS = [
  // Primary colors
  { name: 'Primary', value: 'hsl(var(--primary))' },
  { name: 'Secondary', value: 'hsl(var(--secondary))' },
  { name: 'Accent', value: 'hsl(var(--accent))' },
  { name: 'Destructive', value: 'hsl(var(--destructive))' },
  { name: 'Muted', value: 'hsl(var(--muted))' },
  // Common colors
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Transparent', value: 'transparent' },
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value.startsWith('#') || value.startsWith('hsl') || value === 'transparent' ? '' : value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
        >
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: value || '#ffffff' }}
          />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium">Preset Colors</Label>
          <div className="grid grid-cols-6 gap-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange(preset.value)}
                title={preset.name}
                className={cn(
                  "w-7 h-7 rounded border-2 transition-all hover:scale-110",
                  value === preset.value ? "border-primary ring-2 ring-primary/30" : "border-muted"
                )}
                style={{ 
                  backgroundColor: preset.value === 'transparent' ? 'transparent' : preset.value,
                  backgroundImage: preset.value === 'transparent' 
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : undefined,
                  backgroundSize: preset.value === 'transparent' ? '8px 8px' : undefined,
                  backgroundPosition: preset.value === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                }}
              />
            ))}
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-medium">Custom Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={value.startsWith('#') ? value : '#3b82f6'}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer"
              />
              <Input
                value={customColor || value}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                    onChange(e.target.value);
                  }
                }}
                placeholder="#3b82f6"
                className="flex-1 h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SortableButtonItemProps {
  button: ModalButton;
  onUpdate: (updates: Partial<ModalButton>) => void;
  onRemove: () => void;
}

function SortableButtonItem({ button, onUpdate, onRemove }: SortableButtonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: button.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 rounded-lg border bg-background space-y-3",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 font-medium text-sm truncate">
          {button.text || 'Untitled Button'}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Button Text</Label>
          <Input
            value={button.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="OK"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Value</Label>
          <Input
            value={button.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="ok"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Font Color
          </Label>
          <ColorPicker
            value={button.fontColor}
            onChange={(color) => onUpdate({ fontColor: color })}
            label={button.fontColor || 'Select...'}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Background
          </Label>
          <ColorPicker
            value={button.backgroundColor}
            onChange={(color) => onUpdate({ backgroundColor: color })}
            label={button.backgroundColor || 'Select...'}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Preview</Label>
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            color: button.fontColor || '#ffffff',
            backgroundColor: button.backgroundColor || 'hsl(var(--primary))',
          }}
        >
          {button.text || 'Button'}
        </button>
      </div>
    </div>
  );
}

const generateId = () => `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function ShowModalConfigPanel({ config, onChange }: ShowModalConfigPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addButton = () => {
    const newButton: ModalButton = {
      id: generateId(),
      text: 'OK',
      value: 'ok',
      fontColor: '#ffffff',
      backgroundColor: 'hsl(var(--primary))',
    };
    onChange({
      ...config,
      buttons: [...(config.buttons || []), newButton],
    });
  };

  const updateButton = (buttonId: string, updates: Partial<ModalButton>) => {
    onChange({
      ...config,
      buttons: (config.buttons || []).map((btn) =>
        btn.id === buttonId ? { ...btn, ...updates } : btn
      ),
    });
  };

  const removeButton = (buttonId: string) => {
    onChange({
      ...config,
      buttons: (config.buttons || []).filter((btn) => btn.id !== buttonId),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const buttons = config.buttons || [];
      const oldIndex = buttons.findIndex((btn) => btn.id === active.id);
      const newIndex = buttons.findIndex((btn) => btn.id === over.id);
      onChange({
        ...config,
        buttons: arrayMove(buttons, oldIndex, newIndex),
      });
    }
  };

  const buttons = config.buttons || [];

  return (
    <div className="space-y-4">
      {/* Message Configuration */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Modal Message</Label>
        <Textarea
          value={config.message || ''}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          placeholder="Enter the message to display in the modal..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          You can use variables like {'{{item.name}}'} or {'{{user.email}}'}
        </p>
      </div>

      {/* Buttons Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Modal Buttons</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addButton}
            className="gap-1 h-7 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Button
          </Button>
        </div>

        {buttons.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No buttons configured. Add a button to let users interact with the modal.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {buttons.map((button) => (
                  <SortableButtonItem
                    key={button.id}
                    button={button}
                    onUpdate={(updates) => updateButton(button.id, updates)}
                    onRemove={() => removeButton(button.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modal Preview */}
      {(config.message || buttons.length > 0) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Modal Preview</Label>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="max-w-sm mx-auto p-4 bg-background rounded-lg shadow-lg border">
              {config.message && (
                <p className="text-sm mb-4 whitespace-pre-wrap">{config.message}</p>
              )}
              {buttons.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {buttons.map((button) => (
                    <button
                      key={button.id}
                      type="button"
                      className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        color: button.fontColor || '#ffffff',
                        backgroundColor: button.backgroundColor || 'hsl(var(--primary))',
                      }}
                    >
                      {button.text || 'Button'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
