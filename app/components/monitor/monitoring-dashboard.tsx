// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import type { MonitorData } from "./types";
import { ActiveQueries } from "./active-queries";
import { StoreSizes } from "./store-sizes";
import { MemoryUsage } from "./memory-usage";
import { TransactionStats } from "./transaction-stats";
import { ThroughputChart } from "./throughput-chart";
import { SlowQueryLog } from "./slow-query-log";

interface MonitoringDashboardProps {
  data: MonitorData;
  onKillQuery: (id: string) => void;
}

export function MonitoringDashboard({ data, onKillQuery }: MonitoringDashboardProps) {
  return (
    <div className="h-full overflow-auto">
      <div className="space-y-0 divide-y divide-zinc-800">
        <ActiveQueries queries={data.activeQueries} onKill={onKillQuery} />

        <div className="grid grid-cols-2 divide-x divide-zinc-800">
          <StoreSizes sizes={data.storeSizes} />
          <div className="divide-y divide-zinc-800">
            <MemoryUsage memory={data.memory} />
            <TransactionStats
              stats={data.transactions}
              connectionCount={data.connectionCount}
            />
          </div>
        </div>

        <ThroughputChart data={data.throughput} />
        <SlowQueryLog entries={data.slowQueries} />
      </div>
    </div>
  );
}
