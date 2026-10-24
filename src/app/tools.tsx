import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Calculator } from '@/components/tools/calculator';
import { Calendar } from '@/components/tools/calendar';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { getCurrentCycle } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { cycleRange } from '@/lib/budget';
import { todayISO } from '@/lib/dates';
import {
  cancelCalculatorRequest,
  deliverCalculatorResult,
  hasPendingCalculatorRequest,
} from '@/lib/tool-bridge';

type Tool = 'calculator' | 'calendar';

/** Helper tools sheet (fixed height), reachable from the tab bar and from money fields. */
export default function ToolsScreen() {
  const [tool, setTool] = useState<Tool>('calculator');
  // Read once: whether a money field opened this sheet and is waiting for a result.
  const [picking] = useState(hasPendingCalculatorRequest);
  const today = todayISO();

  // Closing the sheet without using a result releases the waiting field.
  useEffect(() => cancelCalculatorRequest, []);

  const { data: cycle } = useDbData(getCurrentCycle);

  const handleUseResult = (cents: number) => {
    deliverCalculatorResult(cents);
    router.back();
  };

  return (
    <Sheet title="Tools" fill>
      <Segmented<Tool>
        options={[
          { value: 'calculator', label: 'Calculator' },
          { value: 'calendar', label: 'Calendar' },
        ]}
        value={tool}
        onChange={setTool}
      />
      {tool === 'calculator' ? (
        <Calculator onUseResult={picking ? handleUseResult : undefined} />
      ) : (
        <Calendar today={today} cycle={cycle ? cycleRange(cycle, today) : null} />
      )}
    </Sheet>
  );
}
