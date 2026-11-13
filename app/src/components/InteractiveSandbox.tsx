import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Code2,
  Database,
  GitBranch,
  KeyRound,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Tag,
  Terminal,
} from 'lucide-react';
import { AccessibleTabs, type TabItem } from './AccessibleTabs';

interface TicketObj {
  ticketId: string;
  title: string;
  status: 'Open' | 'Closed';
  priority: 'P0' | 'P1' | 'P2';
  sourcePriority: 'P0' | 'P1' | 'P2';
  userEditedPriority: boolean;
  lastUpdatedNote: string;
}

interface AircraftObj {
  tailNumber: string;
  model: string;
  operatingStatus: 'Yes' | 'Maintenance';
  engineCount: number;
}

interface FlightObj {
  flightId: string;
  routeTitle: string;
  departure: string;
  arrival: string;
  assignedTail: string;
  delayMinutes: number;
}

interface ActionLogItem {
  id: string;
  time: string;
  actionName: string;
  context: 'Main' | 'Scenario';
  target: string;
  result: 'Success' | 'Blocked';
  detail: string;
}

interface InteractiveSandboxProps {
  onOpenDoc: (docId: string) => void;
}

const INITIAL_TICKETS: TicketObj[] = [
  {
    ticketId: 'PDS-123',
    title: 'Demo Ticket One — 引擎传感器阈值复核',
    status: 'Open',
    priority: 'P2',
    sourcePriority: 'P2',
    userEditedPriority: false,
    lastUpdatedNote: '来自上游数据源初始同步',
  },
  {
    ticketId: 'PDS-124',
    title: 'Demo Ticket Two — 航前例行检查工单',
    status: 'Closed',
    priority: 'P1',
    sourcePriority: 'P1',
    userEditedPriority: false,
    lastUpdatedNote: '来自上游数据源初始同步',
  },
];

const INITIAL_AIRCRAFT: AircraftObj[] = [
  { tailNumber: 'N737PA', model: 'Boeing 737-800', operatingStatus: 'Yes', engineCount: 2 },
  { tailNumber: 'N787PB', model: 'Boeing 787-9', operatingStatus: 'Yes', engineCount: 2 },
  { tailNumber: 'N320PC', model: 'Airbus A320neo', operatingStatus: 'Maintenance', engineCount: 2 },
];

const INITIAL_FLIGHTS: FlightObj[] = [
  {
    flightId: 'FLT-20261113-01',
    routeTitle: 'JFK → SFO 2026-11-13',
    departure: 'JFK',
    arrival: 'SFO',
    assignedTail: 'N737PA',
    delayMinutes: 45,
  },
  {
    flightId: 'FLT-20261113-02',
    routeTitle: 'LAX → SFO 2026-11-13',
    departure: 'LAX',
    arrival: 'SFO',
    assignedTail: 'N787PB',
    delayMinutes: 0,
  },
];

export function InteractiveSandbox({ onOpenDoc }: InteractiveSandboxProps) {
  const [activeTab, setActiveTab] = useState('mapping');
  const [mappingMode, setMappingMode] = useState<'good' | 'antipattern'>('good');
  const [selectedNode, setSelectedNode] = useState<'flight' | 'aircraft' | 'airport' | 'facility'>('flight');
  const [searchAroundMsg, setSearchAroundMsg] = useState<string>('点击「Search Around」体验 Link 双向遍历');

  // Action Lab State
  const [tickets, setTickets] = useState<TicketObj[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('PDS-123');
  const [targetPriority, setTargetPriority] = useState<'P0' | 'P1' | 'P2'>('P0');
  const [actionFeedback, setActionFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Scenario & Function Lab State
  const [flightsMain, setFlightsMain] = useState<FlightObj[]>(INITIAL_FLIGHTS);
  const [flightsScenario, setFlightsScenario] = useState<FlightObj[]>(INITIAL_FLIGHTS);
  const [execContext, setExecContext] = useState<'Main' | 'Scenario'>('Scenario');
  const [codeLang, setCodeLang] = useState<'tsv2' | 'python'>('tsv2');
  const [selectedAircraftTail, setSelectedAircraftTail] = useState<string>('N787PB');

  const [actionLogs, setActionLogs] = useState<ActionLogItem[]>([
    {
      id: 'init-1',
      time: '16:40:00',
      actionName: 'Funnel Sync',
      context: 'Main',
      target: 'Demo Ticket / Flight',
      result: 'Success',
      detail: 'OSv2 Funnel 已完成初始数据索引',
    },
  ]);

  const selectedTicket = tickets.find((t) => t.ticketId === selectedTicketId) || tickets[0];
  const activeFlights = execContext === 'Main' ? flightsMain : flightsScenario;
  const primaryFlight = activeFlights[0];

  const appendLog = (item: Omit<ActionLogItem, 'id' | 'time'>) => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    setActionLogs((prev) => [
      { ...item, id: `${Date.now()}-${Math.random()}`, time },
      ...prev.slice(0, 5),
    ]);
  };

  const handleApplyTicketAction = () => {
    // Submission Criteria: Ticket.status is "Open"
    if (selectedTicket.status !== 'Open') {
      const msg = `提交被拦截 (Submission Criteria 未通过)：${selectedTicket.ticketId} 当前 Status 为 "${selectedTicket.status}"，规则要求必须为 "Open"。`;
      setActionFeedback({ ok: false, message: msg });
      appendLog({
        actionName: 'Change Ticket Priority',
        context: 'Main',
        target: selectedTicket.ticketId,
        result: 'Blocked',
        detail: 'Status is Closed (expected Open)',
      });
      return;
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === selectedTicket.ticketId
          ? {
              ...t,
              priority: targetPriority,
              userEditedPriority: true,
              lastUpdatedNote: `用户通过 Action 修改为 ${targetPriority}（已写入 Funnel Edits 队列）`,
            }
          : t
      )
    );
    const msg = `Action 执行成功！${selectedTicket.ticketId} 的 Priority 已更新为 ${targetPriority}，并已触发 Notification 通知副作用。`;
    setActionFeedback({ ok: true, message: msg });
    appendLog({
      actionName: 'Change Ticket Priority',
      context: 'Main',
      target: selectedTicket.ticketId,
      result: 'Success',
      detail: `priority → ${targetPriority} (+ Notification sent)`,
    });
  };

  const handleSimulateDatasourceSync = () => {
    // OSv2 Default Conflict Resolution: Strategy 1 (Apply user edits)
    setTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId !== 'PDS-123') return t;
        const resolvedPriority = t.userEditedPriority ? t.priority : 'P2';
        return {
          ...t,
          sourcePriority: 'P2',
          priority: resolvedPriority,
          title: 'Demo Ticket One — 引擎传感器阈值复核 [Batch Synced]',
          lastUpdatedNote: t.userEditedPriority
            ? `上游推送了旧值 P2，但 OSv2「Apply user edits」策略保留了你的编辑 (${t.priority})，同时更新了未编辑的 Title！`
            : '上游数据集重跑同步完成（无用户编辑冲突）',
        };
      })
    );
    setActionFeedback({
      ok: true,
      message:
        '已模拟上游 Batch Pipeline 推送：在 OSv2 默认策略下，未编辑的 Title 自动接收新数据，而你通过 Action 修改过的 Priority 不会被覆盖！',
    });
    appendLog({
      actionName: 'Pipeline Batch Sync',
      context: 'Main',
      target: 'PDS-123',
      result: 'Success',
      detail: 'OSv2 Conflict Resolution: user edits preserved',
    });
  };

  const handleRunReassignFunction = () => {
    const chosenAircraft = INITIAL_AIRCRAFT.find((a) => a.tailNumber === selectedAircraftTail);
    if (!chosenAircraft) return;

    if (chosenAircraft.operatingStatus !== 'Yes') {
      appendLog({
        actionName: 'reassignFlightAircraft()',
        context: execContext,
        target: `${primaryFlight.flightId} → ${chosenAircraft.tailNumber}`,
        result: 'Blocked',
        detail: `Submission Criteria 拦截：飞机 ${chosenAircraft.tailNumber} 状态为 Maintenance`,
      });
      return;
    }

    const updater = (list: FlightObj[]) =>
      list.map((f, i) =>
        i === 0
          ? {
              ...f,
              assignedTail: chosenAircraft.tailNumber,
              delayMinutes: chosenAircraft.tailNumber === 'N787PB' ? 10 : 45,
            }
          : f
      );

    if (execContext === 'Scenario') {
      setFlightsScenario(updater);
      appendLog({
        actionName: 'reassignFlightAircraft()',
        context: 'Scenario',
        target: `${primaryFlight.flightId} → ${chosenAircraft.tailNumber}`,
        result: 'Success',
        detail: '已写入 Scenario #scn-402 隔离沙盒（Main 主分支未受影响）',
      });
    } else {
      setFlightsMain(updater);
      appendLog({
        actionName: 'reassignFlightAircraft()',
        context: 'Main',
        target: `${primaryFlight.flightId} → ${chosenAircraft.tailNumber}`,
        result: 'Success',
        detail: '已直接提交至 Main 生产本体',
      });
    }
  };

  const handleMergeScenario = () => {
    setFlightsMain(flightsScenario);
    appendLog({
      actionName: 'Apply Scenario (Merge)',
      context: 'Main',
      target: 'Scenario #scn-402 → main',
      result: 'Success',
      detail: '已将沙盒中所有暂存修改原子合并至 Main Ontology',
    });
  };

  const handleResetAll = () => {
    setTickets(INITIAL_TICKETS);
    setFlightsMain(INITIAL_FLIGHTS);
    setFlightsScenario(INITIAL_FLIGHTS);
    setActionFeedback(null);
    setSearchAroundMsg('沙盘状态已重置');
  };

  const tabs: TabItem[] = [
    {
      id: 'mapping',
      label: '1. 表 → 本体映射',
      icon: <Database className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              切换对比：传统原始数据集（Dataset）如何映射到语义清晰的 Palantir Ontology，以及为什么不能「直接把宽表一比一照搬」。
            </p>
            <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
              <button
                type="button"
                onClick={() => setMappingMode('good')}
                aria-pressed={mappingMode === 'good'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mappingMode === 'good'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                ✓ 领域建模（推荐）
              </button>
              <button
                type="button"
                onClick={() => setMappingMode('antipattern')}
                aria-pressed={mappingMode === 'antipattern'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mappingMode === 'antipattern'
                    ? 'bg-[var(--danger)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                ✗ 宽表直映（反模式）
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Raw Dataset */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--text-secondary)]">
                  <Database className="size-3.5" aria-hidden="true" />
                  数据源：flights_raw_dataset.parquet
                </span>
                <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                  Backing Datasource
                </span>
              </div>
              <div className="table-scroll-wrap">
                <table className="doc-table text-xs">
                  <thead>
                    <tr>
                      <th scope="col">flight_id</th>
                      <th scope="col">route_label</th>
                      <th scope="col">tail_num</th>
                      <th scope="col">airport_code</th>
                      <th scope="col">_etl_batch_ts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-mono text-[var(--accent)]">FLT-01</td>
                      <td>JFK → SFO</td>
                      <td className="font-mono">N737PA</td>
                      <td className="font-mono">SFO</td>
                      <td className="font-mono text-[var(--text-muted)]">1762991200</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-[var(--accent)]">FLT-02</td>
                      <td>LAX → SFO</td>
                      <td className="font-mono">N787PB</td>
                      <td className="font-mono">SFO</td>
                      <td className="font-mono text-[var(--text-muted)]">1762991200</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                痛点：原始表把航班、飞机尾号、机场、甚至 ETL 调试时间戳 <code>_etl_batch_ts</code> 混在一张表里。
              </p>
            </div>

            {/* Right: Ontology Representation */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              {mappingMode === 'good' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      领域驱动 Ontology（拆分为真实实体 + 双向 Link）
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDoc('ontology/core-concepts')}
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      查看 Core Concepts →
                    </button>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg border border-[var(--accent)]/35 bg-[var(--accent-soft)]/35 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Flight (Object Type)</span>
                        <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px]">
                          实体
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                        <li className="flex items-center gap-1.5">
                          <KeyRound className="size-3 text-[var(--warning)]" aria-hidden="true" />
                          <code>flightId</code> <span className="text-[11px] text-[var(--text-muted)]">(Primary Key)</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Tag className="size-3 text-[var(--accent)]" aria-hidden="true" />
                          <code>routeTitle</code> <span className="text-[11px] text-[var(--text-muted)]">(Title Key)</span>
                        </li>
                        <li>
                          <code>flightTailNumber</code> <span className="text-[11px] text-[var(--text-muted)]">(FK → Aircraft)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Aircraft & Airport</span>
                        <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px]">
                          关联对象
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                        <li>
                          <code>Aircraft.tailNumber</code> (PK)
                        </li>
                        <li>
                          <code>Airport.iataCode</code> (PK)
                        </li>
                        <li className="text-[var(--success)]">✓ 已剔除 _etl_batch_ts 噪声列</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
                    <ArrowLeftRight className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                    <span>
                      <strong>双向 Link Type：</strong>
                      <code>flight.assignedAircraft.get()</code> ↔ <code>aircraft.flights.all()</code>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)]">
                      <AlertCircle className="size-4" aria-hidden="true" />
                      反模式警告：God Object + The Kitchen Sink
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDoc('ontology/ontology-anti-patterns')}
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      查看反模式手册 →
                    </button>
                  </div>
                  <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-3 text-xs space-y-1.5">
                    <p className="font-semibold text-[var(--text-primary)]">
                      ✗ FlightAndAircraftRawData（直接照搬表结构）
                    </p>
                    <p className="font-mono text-[var(--text-secondary)]">
                      - row_num (非确定性主键 → 每次重跑丢失所有历史编辑！)
                    </p>
                    <p className="font-mono text-[var(--text-secondary)]">
                      - airport_code (被拍扁成普通文本列，无法 Search Around 跳转到机场详情)
                    </p>
                    <p className="font-mono text-[var(--text-secondary)]">
                      - _etl_batch_ts (Kitchen Sink 技术字段污染业务搜索与 AI 上下文)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'graph',
      label: '2. 关联图谱 & Interface 多态',
      icon: <Layers className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Interactive Graph Nodes */}
            <div className="blueprint-grid rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 lg:col-span-7">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  点击节点查看语义定义，或点击连线执行 Search Around
                </span>
                <span className="rounded-full bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  实线 = Object Type · 虚线 = Interface
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedNode('flight')}
                  className={`rounded-xl border-2 p-3 text-start transition ${
                    selectedNode === 'flight'
                      ? 'border-[var(--accent)] bg-[var(--bg-surface)] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">Flight</span>
                    <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      Object Type
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[var(--text-primary)]">
                    {primaryFlight.routeTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    PK: <code>{primaryFlight.flightId}</code> · 执飞: <code>{primaryFlight.assignedTail}</code>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedNode('aircraft')}
                  className={`rounded-xl border-2 p-3 text-start transition ${
                    selectedNode === 'aircraft'
                      ? 'border-[var(--accent)] bg-[var(--bg-surface)] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">Aircraft</span>
                    <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                      N:1 Linked
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[var(--text-primary)]">
                    Boeing 737-800 ({primaryFlight.assignedTail})
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Status: <span className="text-[var(--success)]">Yes (In Operation)</span>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedNode('airport')}
                  className={`rounded-xl border-2 p-3 text-start transition ${
                    selectedNode === 'airport'
                      ? 'border-[var(--accent)] bg-[var(--bg-surface)] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">Airport</span>
                    <span className="rounded border border-dashed border-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      implements Facility
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[var(--text-primary)]">
                    San Francisco Intl (SFO)
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Geopoint: <code>37.6213,-122.3790</code>
                  </p>
                </button>

                {/* Interface card with dashed border just like Palantir UI! */}
                <button
                  type="button"
                  onClick={() => setSelectedNode('facility')}
                  className={`rounded-xl border-2 border-dashed p-3 text-start transition ${
                    selectedNode === 'facility'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30 shadow-md'
                      : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">Facility</span>
                    <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                      Interface (虚线标志)
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[var(--text-primary)]">
                    抽象契约：Name + Location
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    被 Airport · Manufacturing Plant 共同实现
                  </p>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode('aircraft');
                    setSearchAroundMsg(
                      `执行 Search Around: flight.assignedAircraft.get() → 命中飞机 ${primaryFlight.assignedTail}`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                  从 Flight 跳到 Aircraft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode('flight');
                    setSearchAroundMsg(
                      `反向遍历同一条 Link: aircraft.flights.all() → 返回 ${primaryFlight.assignedTail} 执飞的全部航班`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                  从 Aircraft 反向查 Flights
                </button>
              </div>
              <p className="mt-2 rounded-lg bg-[var(--bg-surface)] px-3 py-2 font-mono text-xs text-[var(--accent)] border border-[var(--border-subtle)]">
                {searchAroundMsg}
              </p>
            </div>

            {/* Inspector Panel (Panel Object View Simulation) */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-5">
              <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Panel Object View 检查器
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onOpenDoc(
                      selectedNode === 'facility'
                        ? 'interfaces/interface-overview'
                        : 'object-views/overview'
                    )
                  }
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  阅读文档 →
                </button>
              </div>

              {selectedNode === 'flight' && (
                <div className="space-y-2.5 text-sm">
                  <h3 className="font-semibold">Flight: {primaryFlight.routeTitle}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    通过 Foreign Key (<code>flightTailNumber</code>) 与 <code>Aircraft</code> 建立 N:1 双向链接。
                  </p>
                  <dl className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-elevated)] p-3 text-xs">
                    <div>
                      <dt className="text-[var(--text-muted)]">Primary Key</dt>
                      <dd className="font-mono font-medium">{primaryFlight.flightId}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Title Key</dt>
                      <dd className="font-medium">{primaryFlight.routeTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Assigned Aircraft</dt>
                      <dd className="font-mono text-[var(--accent)]">{primaryFlight.assignedTail}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">预计延误</dt>
                      <dd className="font-medium">{primaryFlight.delayMinutes} 分钟</dd>
                    </div>
                  </dl>
                </div>
              )}

              {selectedNode === 'aircraft' && (
                <div className="space-y-2.5 text-sm">
                  <h3 className="font-semibold">Aircraft: {primaryFlight.assignedTail}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    作为单向/多对一的主体端，无需再定义一条反向 Link Type，即可在代码里调用 <code>aircraft.flights.all()</code>。
                  </p>
                  <dl className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-elevated)] p-3 text-xs">
                    <div>
                      <dt className="text-[var(--text-muted)]">Tail Number (PK)</dt>
                      <dd className="font-mono font-medium">{primaryFlight.assignedTail}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Operating Status</dt>
                      <dd className="font-medium text-[var(--success)]">Yes</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Engine Count</dt>
                      <dd className="font-mono">2</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Action 权限约束</dt>
                      <dd>仅状态为 Yes 时允许指派</dd>
                    </div>
                  </dl>
                </div>
              )}

              {selectedNode === 'airport' && (
                <div className="space-y-2.5 text-sm">
                  <h3 className="font-semibold">Airport: San Francisco Intl (SFO)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    具体 Object Type（有底层数据集支持），同时实现了 <code>Facility</code> 接口，因此可自动进入所有面向设施的通用工作流。
                  </p>
                  <dl className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-elevated)] p-3 text-xs">
                    <div>
                      <dt className="text-[var(--text-muted)]">IATA Code (PK)</dt>
                      <dd className="font-mono font-medium">SFO</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">实现接口</dt>
                      <dd className="font-mono text-[var(--accent)]">Facility</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Runway Count (自有属性)</dt>
                      <dd className="font-mono">4</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Location (接口属性)</dt>
                      <dd className="font-mono">37.62, -122.37</dd>
                    </div>
                  </dl>
                </div>
              )}

              {selectedNode === 'facility' && (
                <div className="space-y-2.5 text-sm">
                  <h3 className="font-semibold">Interface: Facility（抽象类型）</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    官方文档特征：<strong>无底层数据集</strong>、<strong>无法直接实例化</strong>、平台 UI 中图标带<strong>虚线边框</strong>。在 TypeScript v2 和 OSDK 中可直接针对接口编写多态逻辑！
                  </p>
                  <div className="rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/25 p-3 text-xs space-y-1">
                    <div className="font-semibold">契约属性 (Interface Properties):</div>
                    <div className="font-mono">• facilityName: String</div>
                    <div className="font-mono">• location: Geopoint</div>
                    <div className="pt-1 text-[var(--text-muted)]">
                      实现类：Airport · Manufacturing Plant · Maintenance Hangar
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      label: '3. Action 校验 & 编辑冲突',
      icon: <ShieldAlert className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Interactive Action Form */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    实战演练：Change Ticket Priority（官方入门案例）
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Submission Criteria 规则：<code>Ticket.status is "Open"</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDoc('action-types/getting-started')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  官方原教程 →
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="ticket-select" className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    1. 选择目标对象 (Demo Ticket Parameter)
                  </label>
                  <select
                    id="ticket-select"
                    value={selectedTicketId}
                    onChange={(e) => {
                      setSelectedTicketId(e.target.value);
                      setActionFeedback(null);
                    }}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {tickets.map((t) => (
                      <option key={t.ticketId} value={t.ticketId}>
                        {t.ticketId} — {t.title} [{t.status} · {t.priority}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    2. 选择新优先级 (Multiple Choice Constraint: P0 / P1 / P2)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['P0', 'P1', 'P2'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTargetPriority(p)}
                        aria-pressed={targetPriority === p}
                        className={`min-h-9 rounded-lg border px-4 py-1.5 font-mono text-xs font-semibold transition ${
                          targetPriority === p
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyTicketAction}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-text)] shadow-sm hover:opacity-95"
                  >
                    <Play className="size-3.5" aria-hidden="true" />
                    提交 Action (Submit)
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateDatasourceSync}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    模拟上游 Pipeline 重跑推送
                  </button>
                </div>

                {actionFeedback ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                      actionFeedback.ok
                        ? 'border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--text-primary)]'
                        : 'border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--text-primary)]'
                    }`}
                  >
                    {actionFeedback.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden="true" />
                    )}
                    <span>{actionFeedback.message}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Live Object State + Conflict Strategy */}
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">OSv2 实时对象状态 & 冲突策略演示</h3>
                <button
                  type="button"
                  onClick={() => onOpenDoc('object-edits/how-edits-applied')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Edits 原理 →
                </button>
              </div>
              <div className="space-y-2.5">
                {tickets.map((t) => (
                  <div
                    key={t.ticketId}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {t.ticketId}: {t.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-2 py-0.5 font-medium ${
                            t.status === 'Open'
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 font-mono font-semibold text-[var(--accent)]">
                          {t.priority}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[var(--text-secondary)]">{t.lastUpdatedNote}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                提示：试试先选 <strong>PDS-124 (Closed)</strong> 触发拦截校验；再选 <strong>PDS-123 (Open)</strong> 改成 P0，然后点击「模拟上游 Pipeline 重跑推送」，观察用户编辑如何在不丢失的情况下合并上游新 Title！
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'functions',
      label: '4. Functions & Scenario 沙盒',
      icon: <Code2 className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Code Panel */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-7">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setCodeLang('tsv2')}
                    aria-pressed={codeLang === 'tsv2'}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      codeLang === 'tsv2'
                        ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    TypeScript v2 (推荐)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeLang('python')}
                    aria-pressed={codeLang === 'python'}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      codeLang === 'python'
                        ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Python (@function)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDoc('functions/language-feature-support')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  语言能力对比表 →
                </button>
              </div>

              <pre
                role="region"
                aria-label="Ontology 函数示例代码"
                tabIndex={0}
                className="code-surface overflow-x-auto rounded-lg p-3.5 text-xs leading-relaxed"
              >
                <code>
                  {codeLang === 'tsv2'
                    ? `// typescript-functions/src/functions/reassignAircraft.ts
import { Edits, Flight, Aircraft } from "@foundry/ontology-api";

export default function reassignAircraft(
  flight: Flight,
  newAircraft: Aircraft
): Edits.Flight {
  // 校验逻辑 & 通过外键/链接读取关联对象
  if (newAircraft.operatingStatus !== "Yes") {
    throw new Error(\`Aircraft \${newAircraft.tailNumber} is not operational\`);
  }
  flight.flightTailNumber = newAircraft.tailNumber;
  return flight;
}`
                    : `# python-functions/python/python_functions/reassign.py
from functions.api import function, String
from ontology_sdk import FoundryClient

@function
def summarize_flight_delay(flight_id: String) -> str:
    client = FoundryClient()
    flight = client.ontology.objects.Flight.get(flight_id)
    aircraft = flight.assigned_aircraft.get()
    return f"{flight.route_title} -> {aircraft.tail_number}"`}
                </code>
              </pre>
            </div>

            {/* Scenario Sandbox Runner */}
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <GitBranch className="size-4 text-[var(--accent)]" aria-hidden="true" />
                  执行上下文：Main vs Scenario [Beta]
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenDoc('ontology/overview-ontology-scenario')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Scenarios 文档 →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExecContext('Scenario')}
                  aria-pressed={execContext === 'Scenario'}
                  className={`rounded-lg border px-3 py-2 text-start text-xs transition ${
                    execContext === 'Scenario'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                    <span>Scenario #scn-402</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">隔离沙盒推演</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExecContext('Main')}
                  aria-pressed={execContext === 'Main'}
                  className={`rounded-lg border px-3 py-2 text-start text-xs transition ${
                    execContext === 'Main'
                      ? 'border-[var(--warning)] bg-[var(--warning-soft)] font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div>Main Ontology</div>
                  <span className="text-[11px] text-[var(--text-muted)]">生产主分支</span>
                </button>
              </div>

              <div>
                <label htmlFor="aircraft-select" className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  为 {primaryFlight.flightId} 选择目标执飞飞机：
                </label>
                <select
                  id="aircraft-select"
                  value={selectedAircraftTail}
                  onChange={(e) => setSelectedAircraftTail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs"
                >
                  {INITIAL_AIRCRAFT.map((a) => (
                    <option key={a.tailNumber} value={a.tailNumber}>
                      {a.tailNumber} — {a.model} ({a.operatingStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRunReassignFunction}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-text)]"
                >
                  <Terminal className="size-3.5" aria-hidden="true" />
                  在 {execContext} 中运行函数
                </button>
                <button
                  type="button"
                  onClick={handleMergeScenario}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]"
                >
                  Merge Scenario → Main
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <div>
                  <span className="text-[11px] text-[var(--text-muted)]">Main 当前飞机</span>
                  <div className="font-mono font-semibold">{flightsMain[0].assignedTail}</div>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-muted)]">Scenario 推演飞机</span>
                  <div className="font-mono font-semibold text-[var(--accent)]">
                    {flightsScenario[0].assignedTail}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="sandbox-heading"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            交互式数字孪生实验室
          </span>
          <h2 id="sandbox-heading" className="mt-1.5 text-xl font-bold tracking-tight">
            亲手体验 Palantir Ontology 四层运作机制
          </h2>
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          重置沙盘
        </button>
      </div>

      <AccessibleTabs
        ariaLabel="Ontology 交互实验室"
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Live Action Log */}
      <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
          <span>Action Log（决策审计流）</span>
          <button
            type="button"
            onClick={() => onOpenDoc('action-types/action-log')}
            className="text-[var(--accent)] hover:underline"
          >
            了解 Action Log →
          </button>
        </div>
        <ul className="space-y-1.5 font-mono text-xs">
          {actionLogs.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md bg-[var(--bg-surface)] px-2.5 py-1.5 border border-[var(--border-subtle)]"
            >
              <span className="text-[var(--text-muted)]">[{log.time}]</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  log.result === 'Success'
                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                    : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                }`}
              >
                {log.result}
              </span>
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px]">
                {log.context}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{log.actionName}</span>
              <span className="text-[var(--text-secondary)]">({log.target})</span>
              <span className="text-[var(--text-muted)]">— {log.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
