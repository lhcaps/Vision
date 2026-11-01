import {
  ActivityIcon as Activity,
  CheckCircleIcon as CheckCircle,
  DatabaseIcon as Database,
  WarningIcon as Warning,
  StackIcon as Stack,
  CircleNotchIcon as CircleNotch,
  XCircleIcon as XCircle,
} from '@phosphor-icons/react';
import type { RuntimeReadiness } from '../features/runtime/runtime.types';

interface ReadinessStripProps {
  readiness: RuntimeReadiness;
  job?: {
    source: 'loading' | 'api' | 'fallback';
    status: string;
  };
}

export function ReadinessStrip({ readiness, job }: ReadinessStripProps) {
  return <ReadinessStripInner readiness={readiness} job={job} />;
}

function ReadinessStripInner({
  readiness,
  job,
}: {
  readiness: RuntimeReadiness;
  job?: { source: 'loading' | 'api' | 'fallback'; status: string };
}) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <ApiStatusBadge readiness={readiness} />
      <DatabaseStatusBadge readiness={readiness} />
      <QueueStatusBadge readiness={readiness} job={job} />
      <CvStatusBadge readiness={readiness} />
    </div>
  );
}

function ApiStatusBadge({ readiness }: { readiness: RuntimeReadiness }) {
  const { api } = readiness;

  if (api.kind === 'loading') {
    return (
      <StatusBadge
        label="API"
        value="Loading..."
        icon={CircleNotch}
        tone="text-neutral-400 animate-spin"
      />
    );
  }
  if (api.kind === 'connected') {
    const modeLabel = api.mode === 'database' ? 'Database ready' : 'In-memory';
    return <StatusBadge label="API" value={modeLabel} icon={CheckCircle} tone="text-signal-300" />;
  }
  return <StatusBadge label="API" value="Unavailable" icon={XCircle} tone="text-danger-400" />;
}

function DatabaseStatusBadge({ readiness }: { readiness: RuntimeReadiness }) {
  const { database } = readiness;

  if (database.kind === 'loading') {
    return (
      <StatusBadge
        label="Schema"
        value="Loading..."
        icon={CircleNotch}
        tone="text-neutral-400 animate-spin"
      />
    );
  }
  if (database.kind === 'ready') {
    return (
      <StatusBadge label="Schema" value="Database ready" icon={Database} tone="text-scan-300" />
    );
  }
  if (database.kind === 'unavailable') {
    return <StatusBadge label="Schema" value="Unavailable" icon={XCircle} tone="text-danger-400" />;
  }
  return <StatusBadge label="Schema" value="Unknown" icon={Warning} tone="text-amber-400" />;
}

function QueueStatusBadge({
  readiness,
  job,
}: {
  readiness: RuntimeReadiness;
  job?: { source: 'loading' | 'api' | 'fallback'; status: string };
}) {
  const { queue } = readiness;

  if (queue.kind === 'loading') {
    return (
      <StatusBadge
        label="Queue"
        value="Loading..."
        icon={CircleNotch}
        tone="text-neutral-400 animate-spin"
      />
    );
  }
  if (queue.kind === 'bullmq-ready') {
    if (job?.source === 'api' && job?.status === 'RUNNING') {
      return <StatusBadge label="Queue" value="Worker active" icon={Stack} tone="text-amber-300" />;
    }
    return <StatusBadge label="Queue" value="BullMQ ready" icon={Stack} tone="text-signal-300" />;
  }
  if (queue.kind === 'memory-fallback') {
    return <StatusBadge label="Queue" value="Memory fallback" icon={Stack} tone="text-amber-400" />;
  }
  if (queue.kind === 'unavailable') {
    return <StatusBadge label="Queue" value="Unavailable" icon={XCircle} tone="text-danger-400" />;
  }
  return <StatusBadge label="Queue" value="Unknown" icon={Warning} tone="text-neutral-400" />;
}

function CvStatusBadge({ readiness }: { readiness: RuntimeReadiness }) {
  const { cvWorker } = readiness;

  if (cvWorker.kind === 'loading') {
    return (
      <StatusBadge
        label="CV"
        value="Loading..."
        icon={CircleNotch}
        tone="text-neutral-400 animate-spin"
      />
    );
  }
  if (cvWorker.kind === 'onnx-ready') {
    return (
      <StatusBadge
        label="CV"
        value="ONNX detector ready"
        icon={CheckCircle}
        tone="text-signal-300"
      />
    );
  }
  if (cvWorker.kind === 'onnx-configured-unavailable') {
    return (
      <StatusBadge
        label="CV"
        value="ONNX configured, unavailable"
        icon={Warning}
        tone="text-amber-400"
      />
    );
  }
  if (cvWorker.kind === 'mock-fallback') {
    return (
      <StatusBadge label="CV" value="Mock detector fallback" icon={Stack} tone="text-neutral-400" />
    );
  }
  if (cvWorker.kind === 'worker-unavailable') {
    return (
      <StatusBadge label="CV" value="Worker unavailable" icon={XCircle} tone="text-danger-400" />
    );
  }
  return <StatusBadge label="CV" value="Unknown" icon={Warning} tone="text-neutral-400" />;
}

function StatusBadge({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  tone: string;
}) {
  return (
    <div className="inner-border-subtle rounded-md bg-white/[0.035] px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className={tone} size={16} weight="duotone" />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          {label}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-neutral-200">{value}</p>
    </div>
  );
}
