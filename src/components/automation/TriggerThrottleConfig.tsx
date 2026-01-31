import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TriggerThrottleConfig as ThrottleConfig, 
  THROTTLE_SCOPES, 
  THROTTLE_TARGETS 
} from "./types";
import { Clock, Users, Monitor, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TriggerThrottleConfigProps {
  config: ThrottleConfig;
  onChange: (config: ThrottleConfig) => void;
}

export function TriggerThrottleConfig({ config, onChange }: TriggerThrottleConfigProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      scope: enabled ? (config.scope || 'session') : 'none',
      target: enabled ? (config.target || 'browser') : 'browser',
    });
  };

  const handleScopeChange = (scope: ThrottleConfig['scope']) => {
    onChange({ ...config, scope });
  };

  const handleTargetChange = (target: ThrottleConfig['target']) => {
    onChange({ ...config, target });
  };

  const handleMaxExecutionsChange = (value: string) => {
    const num = parseInt(value, 10);
    onChange({ ...config, maxExecutions: isNaN(num) ? undefined : num });
  };

  const handleCooldownChange = (value: string) => {
    const num = parseInt(value, 10);
    onChange({ ...config, cooldownMinutes: isNaN(num) ? undefined : num });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="throttle-enabled" className="font-medium">
            Limit Executions
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>When disabled, this trigger executes every single time. Enable to limit frequency.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="throttle-enabled"
          checked={config.enabled}
          onCheckedChange={handleToggle}
        />
      </div>
      
      {!config.enabled && (
        <p className="text-xs text-muted-foreground pl-6">
          Trigger will execute every time without limits.
        </p>
      )}

      {config.enabled && (
        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
          {/* Throttle Scope */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Frequency Limit</Label>
            <Select value={config.scope} onValueChange={handleScopeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency..." />
              </SelectTrigger>
              <SelectContent>
                {THROTTLE_SCOPES.filter(s => s.value !== 'none').map((scope) => (
                  <SelectItem key={scope.value} value={scope.value}>
                    <div className="flex flex-col">
                      <span>{scope.label}</span>
                      <span className="text-xs text-muted-foreground">{scope.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Throttle Target */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Track By</Label>
            <Select value={config.target} onValueChange={handleTargetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                {THROTTLE_TARGETS.map((target) => (
                  <SelectItem key={target.value} value={target.value}>
                    <div className="flex items-center gap-2">
                      {target.value === 'browser' && <Monitor className="h-4 w-4" />}
                      {target.value === 'user' && <Users className="h-4 w-4" />}
                      {target.value === 'both' && (
                        <div className="flex -space-x-1">
                          <Monitor className="h-3 w-3" />
                          <Users className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span>{target.label}</span>
                        <span className="text-xs text-muted-foreground">{target.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Executions (optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="max-executions" className="text-sm text-muted-foreground">
                Max Executions
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Maximum times to execute within the selected frequency. Leave empty for 1.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="max-executions"
              type="number"
              min={1}
              max={100}
              placeholder="1"
              value={config.maxExecutions || ''}
              onChange={(e) => handleMaxExecutionsChange(e.target.value)}
              className="w-24"
            />
          </div>

          {/* Cooldown (optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="cooldown" className="text-sm text-muted-foreground">
                Cooldown (minutes)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Minimum time between executions regardless of other settings. Leave empty for no cooldown.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="cooldown"
              type="number"
              min={1}
              max={10080}
              placeholder="No cooldown"
              value={config.cooldownMinutes || ''}
              onChange={(e) => handleCooldownChange(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Summary */}
          <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <strong>Summary:</strong> This trigger will execute{' '}
            {config.maxExecutions && config.maxExecutions > 1 
              ? `up to ${config.maxExecutions} times` 
              : 'once'}{' '}
            {config.scope === 'session' && 'per browser session'}
            {config.scope === 'day' && 'per day'}
            {config.scope === 'week' && 'per week'}
            {config.scope === 'lifetime' && 'ever'}
            {config.target === 'browser' && ' per browser/device'}
            {config.target === 'user' && ' per logged-in user'}
            {config.target === 'both' && ' per user AND browser combination'}
            {config.cooldownMinutes && config.cooldownMinutes > 0 && 
              `, with at least ${config.cooldownMinutes} minute${config.cooldownMinutes > 1 ? 's' : ''} between executions`}
            .
          </div>
        </div>
      )}
    </div>
  );
}
