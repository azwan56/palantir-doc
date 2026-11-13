import { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  BookOpen,
  Compass,
  Layers,
  Search,
} from 'lucide-react';
import { AccessibleTabs, type TabItem } from './AccessibleTabs';
import { ANTI_PATTERNS, APP_PICKER_MATRIX, GLOSSARY_TERMS } from '../data/curriculum';

interface ReferenceToolsProps {
  onOpenDoc: (docId: string) => void;
  requestedTab?: 'apps' | 'antipatterns' | 'glossary';
}

const NEED_SCENARIOS = [
  {
    id: 'search',
    label: '我想查一批对象并临时出图探索',
    pick: 'Object Explorer',
    reason: '零配置即可输入关键词、叠加多维度过滤条件、使用 Search Around 跳向关联对象，并支持批量触发 Action。',
    docId: 'object-explorer/overview',
  },
  {
    id: 'profile',
    label: '我想看单个实体的 360° 全景详情页',
    pick: 'Object Views',
    reason: '默认提供 Standard Object View；如需自定义布局可借助 Workshop 打造 Configured Full View 或嵌入侧边栏的 Panel View。',
    docId: 'object-views/overview',
  },
  {
    id: 'workflow',
    label: '我想给一线运营团队搭一个带表单写回的操作应用',
    pick: 'Workshop',
    reason: 'Palantir 主力无代码高交互应用构建器：支持布局、事件流、变量联动及触发 Ontology Actions。',
    docId: 'ontology/applications',
  },
  {
    id: 'timeseries',
    label: '我想做复杂分叉统计或工业传感器时序曲线分析',
    pick: 'Quiver',
    reason: '专精多步钻取分析与时间序列图表，分析结果可一键发布为只读 Dashboard 或嵌入 Object View。',
    docId: 'ontology/applications',
  },
  {
    id: 'causal',
    label: '我想看供应链/生产网络因果传导并做仿真预测',
    pick: 'Vertex',
    reason: '把跨部门对象网络化，支持异常根因追溯、系统告警与多模型串联仿真推演。',
    docId: 'vertex/overview',
  },
  {
    id: 'geo',
    label: '我想在地图上看飞机/车队轨迹并做空间围栏操作',
    pick: 'Map',
    reason: '原生支持 WGS84 坐标、点线面与动态 Tracks 轨迹播放，可在地图上直接选中对象执行 Action。',
    docId: 'map/overview',
  },
  {
    id: 'process',
    label: '我想挖掘业务流程卡点或编排多步骤 AI Agent 审批流',
    pick: 'Machinery',
    reason: '既支持基于事件日志的 Process Mining，也可作为含人工审批的确定性多步 AIP 状态流框架。',
    docId: 'machinery/overview',
  },
  {
    id: 'schedule',
    label: '我想做拖拽式甘特图排班或产线资源排程',
    pick: 'Dynamic Scheduling',
    reason: '内置 Workshop 甘特图与日历组件，支持拖拽修改时间块并自动运行约束校验和推荐函数。',
    docId: 'dynamic-scheduling/scheduling-overview',
  },
];

export function ReferenceTools({ onOpenDoc, requestedTab }: ReferenceToolsProps) {
  const [activeTab, setActiveTab] = useState<string>(requestedTab || 'apps');
  const [selectedNeed, setSelectedNeed] = useState(NEED_SCENARIOS[0].id);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [glossaryCategory, setGlossaryCategory] = useState<string>('全部');

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const activeScenario =
    NEED_SCENARIOS.find((s) => s.id === selectedNeed) || NEED_SCENARIOS[0];

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((item) => {
      const catMatch = glossaryCategory === '全部' || item.category === glossaryCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.zhName.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.example.toLowerCase().includes(q)
      );
    });
  }, [glossaryQuery, glossaryCategory]);

  const tabs: TabItem[] = [
    {
      id: 'apps',
      label: '应用选型决策指南',
      icon: <Compass className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-6">
          {/* Interactive Wizard */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              快速问诊：我当前的需求应该用哪个 Palantir 应用？
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {NEED_SCENARIOS.map((sc) => {
                const active = sc.id === selectedNeed;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedNeed(sc.id)}
                    aria-pressed={active}
                    className={`rounded-xl border p-3 text-start text-xs transition ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/35 bg-[var(--bg-surface)] p-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[var(--text-muted)]">推荐首选工具</div>
                <div className="mt-0.5 text-lg font-bold text-[var(--accent)]">
                  {activeScenario.pick}
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{activeScenario.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenDoc(activeScenario.docId)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-text)]"
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                打开对应官方文档
              </button>
            </div>
          </div>

          {/* Full Matrix Table */}
          <div className="table-scroll-wrap">
            <table className="doc-table">
              <caption>Palantir Foundry Ontology 上层应用全家桶对比矩阵</caption>
              <thead>
                <tr>
                  <th scope="col">应用名称</th>
                  <th scope="col">核心定位</th>
                  <th scope="col">工作流风格</th>
                  <th scope="col">配置门槛</th>
                  <th scope="col">最适用场景</th>
                  <th scope="col">文档</th>
                </tr>
              </thead>
              <tbody>
                {APP_PICKER_MATRIX.map((row) => (
                  <tr key={row.app}>
                    <th scope="row" className="font-mono font-semibold text-[var(--accent)]">
                      {row.app}
                    </th>
                    <td className="font-medium">{row.zhRole}</td>
                    <td>{row.style}</td>
                    <td>{row.configCost}</td>
                    <td className="text-[var(--text-secondary)]">{row.bestFor}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onOpenDoc(row.docId)}
                        className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        查阅 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'antipatterns',
      label: '8 大建模反模式避坑库',
      icon: <AlertOctagon className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            整理自官方 <code>Ontology design: Anti-patterns</code> 与 <code>Best practices</code>：照着下面对比自查，能避开 90% 的初学者架构返工。
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {ANTI_PATTERNS.map((ap) => (
              <article
                key={ap.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {ap.zhName}
                    </h3>
                    <span className="rounded bg-[var(--danger-soft)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--danger)]">
                      {ap.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{ap.symptom}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <pre className="code-surface overflow-x-auto rounded-lg border border-rose-500/30 p-2.5 text-[11px] leading-relaxed text-rose-200">
                      <code>{ap.avoidSnippet}</code>
                    </pre>
                    <pre className="code-surface overflow-x-auto rounded-lg border border-emerald-500/30 p-2.5 text-[11px] leading-relaxed text-emerald-200">
                      <code>{ap.preferSnippet}</code>
                    </pre>
                  </div>

                  <p className="mt-2.5 text-xs text-[var(--text-muted)]">
                    <strong>危害：</strong>
                    {ap.impact}
                  </p>
                </div>

                <div className="mt-3 border-t border-[var(--border-subtle)] pt-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenDoc(ap.docId)}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    阅读官方深度剖析与重构步骤 →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'glossary',
      label: '中英双语核心术语词典',
      badge: `${GLOSSARY_TERMS.length}`,
      icon: <Layers className="size-4" aria-hidden="true" />,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <search className="relative min-w-64 flex-1">
              <label htmlFor="glossary-search" className="visually-hidden">
                搜索 Ontology 术语
              </label>
              <Search
                className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <input
                id="glossary-search"
                type="search"
                value={glossaryQuery}
                onChange={(e) => setGlossaryQuery(e.target.value)}
                placeholder="输入英文或中文术语，如 OSDK、Funnel、Primary Key..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 ps-9 pe-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </search>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="按层级筛选术语">
              {['全部', '语义层', '动力层', '应用层', '架构与治理'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGlossaryCategory(cat)}
                  aria-pressed={glossaryCategory === cat}
                  className={`min-h-8 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    glossaryCategory === cat
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredGlossary.map((item) => (
              <article
                key={item.term}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-[var(--accent)]">
                        {item.term}
                      </h3>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.zhName}
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {item.summary}
                  </p>
                  <p className="mt-2 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)]">
                    <strong>示例：</strong>
                    {item.example}
                  </p>
                </div>

                <div className="mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenDoc(item.docId)}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    打开对应文档 →
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredGlossary.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              没有找到匹配的术语，试试清空关键词或在顶部打开「390 篇本地文档库」全文搜索。
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="reference-heading"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm"
    >
      <div className="mb-4">
        <h2 id="reference-heading" className="text-xl font-bold tracking-tight">
          速查手册与诊断工具箱
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          选型迷茫时看应用决策表，建模纠结时看 8 大反模式避坑卡，遇到黑话缩写随时查双语词典。
        </p>
      </div>
      <AccessibleTabs
        ariaLabel="速查工具标签页"
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />
    </section>
  );
}
