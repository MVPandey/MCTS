import { useState } from 'react';
import { useConfigStore, useSearchStore } from '@/stores';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useModels } from '@/hooks/useModels';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { ChevronDown, Play, Loader2, Settings } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export function ConfigForm() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const { startSearch } = useWebSocket();
  const { models, defaultModel, loading: modelsLoading } = useModels();
  const status = useSearchStore((s) => s.status);
  const isRunning = status === 'running';

  const {
    goal,
    setGoal,
    firstMessage,
    setFirstMessage,
    initBranches,
    setInitBranches,
    turnsPerBranch,
    setTurnsPerBranch,
    rounds,
    setRounds,
    userIntentsPerBranch,
    setUserIntentsPerBranch,
    pruneThreshold,
    setPruneThreshold,
    scoringMode,
    setScoringMode,
    deepResearch,
    setDeepResearch,
    strategyModel,
    setStrategyModel,
    simulatorModel,
    setSimulatorModel,
    judgeModel,
    setJudgeModel,
  } = useConfigStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || !firstMessage.trim()) return;
    startSearch();
  };

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const parts = model.id.split('/');
    const provider = parts.length > 1 ? parts[0] : 'other';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  const ModelSelect = ({
    value,
    onChange,
    label,
    description
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
    label: string;
    description: string;
  }) => {
    // Use "__default__" as sentinel since Radix Select doesn't allow empty string
    const selectValue = value || '__default__';
    const handleChange = (v: string) => onChange(v === '__default__' ? null : v);

    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {label}
          <span className="text-muted-foreground/60 ml-1">({description})</span>
        </Label>
        <Select value={selectValue} onValueChange={handleChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={`Default${defaultModel ? ` (${defaultModel})` : ''}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Use Default{defaultModel ? ` (${defaultModel})` : ''}</SelectItem>
            {Object.entries(groupedModels).sort().map(([provider, providerModels]) => (
              <SelectGroup key={provider}>
                <SelectLabel className="capitalize">{provider}</SelectLabel>
                {providerModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="truncate">
                      {model.name}
                      {model.context_length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({formatNumber(model.context_length)} ctx)
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal" className="text-muted-foreground">
          Conversation Goal
        </Label>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., Identify the most promising direction for a research paper"
          className="min-h-[60px] bg-background"
          disabled={isRunning}
        />
      </div>

      {/* First Message */}
      <div className="space-y-2">
        <Label htmlFor="firstMessage" className="text-muted-foreground">
          First Message (User)
        </Label>
        <Textarea
          id="firstMessage"
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          placeholder="e.g., I want to improve the Muon optimizer..."
          className="min-h-[60px] bg-background"
          disabled={isRunning}
        />
      </div>

      {/* Basic Parameters */}
      <Card className="bg-background">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Branches</Label>
              <Input
                type="number"
                value={initBranches}
                onChange={(e) => setInitBranches(Number(e.target.value))}
                min={1}
                max={20}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Turns/Branch</Label>
              <Input
                type="number"
                value={turnsPerBranch}
                onChange={(e) => setTurnsPerBranch(Number(e.target.value))}
                min={1}
                max={20}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rounds</Label>
              <Input
                type="number"
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                min={1}
                max={10}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Deep Research</Label>
              <div className="h-9 flex items-center">
                <Switch checked={deepResearch} onCheckedChange={setDeepResearch} disabled={isRunning} />
                <span className="ml-2 text-xs text-muted-foreground">{deepResearch ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Parameters */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          Advanced parameters
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card className="bg-background">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Intents/Branch</Label>
                  <Input
                    type="number"
                    value={userIntentsPerBranch}
                    onChange={(e) => setUserIntentsPerBranch(Number(e.target.value))}
                    min={1}
                    max={10}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Prune Threshold</Label>
                  <Input
                    type="number"
                    value={pruneThreshold}
                    onChange={(e) => setPruneThreshold(Number(e.target.value))}
                    min={0}
                    max={10}
                    step={0.5}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Scoring Mode</Label>
                  <Select value={scoringMode} onValueChange={(v) => setScoringMode(v as 'absolute' | 'comparative')}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comparative">Comparative (force-rank siblings)</SelectItem>
                      <SelectItem value="absolute">Absolute (independent 0-10 scores)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Model Settings */}
      <Collapsible open={modelsOpen} onOpenChange={setModelsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings className={`h-3 w-3`} />
          <ChevronDown className={`h-3 w-3 transition-transform ${modelsOpen ? 'rotate-180' : ''}`} />
          Model settings
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card className="bg-background">
            <CardContent className="pt-4 space-y-3">
              {modelsLoading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading models...
                </div>
              ) : (
                <>
                  <ModelSelect
                    value={strategyModel}
                    onChange={setStrategyModel}
                    label="Strategy Generation"
                    description="strategies & intents"
                  />
                  <ModelSelect
                    value={simulatorModel}
                    onChange={setSimulatorModel}
                    label="Simulation"
                    description="user & assistant messages"
                  />
                  <ModelSelect
                    value={judgeModel}
                    onChange={setJudgeModel}
                    label="Judging"
                    description="trajectory evaluation"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isRunning || !goal.trim() || !firstMessage.trim()}>
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Start Exploration
          </>
        )}
      </Button>
    </form>
  );
}
