import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  Cpu,
  Database,
  FolderTree,
  GraduationCap,
  Layers,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
  ZoomIn,
} from 'lucide-react';
import docsIndexRaw from './data/docs-index.json';
import { CURRICULUM_STAGES, GLOSSARY_TERMS } from './data/curriculum';
import type { DocsIndex } from './types/docs';
import { InteractiveSandbox } from './components/InteractiveSandbox';
import { LearningPath } from './components/LearningPath';
import { ReferenceTools } from './components/ReferenceTools';
import { MasteryQuiz } from './components/MasteryQuiz';
import { DocsExplorer } from './components/DocsExplorer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NativeDialog } from './components/NativeDialog';
import { ThemeToggle } from './components/ThemeToggle';

type ViewId = 'overview' | 'learn' | 'sandbox' | 'reference' | 'quiz' | 'docs';

const docsIndex = docsIndexRaw as DocsIndex;

const NAV_ITEMS: { id: ViewId; label: string; shortLabel: string; icon: typeof Compass }[] = [
  { id: 'overview', label: '全景概览 & 沙盒', shortLabel: '概览', icon: Compass },
  { id: 'learn', label: '6 阶段精通路线', shortLabel: '路线', icon: GraduationCap },
  { id: 'sandbox', label: '数字孪生实验室', shortLabel: '沙盒', icon: Play },
  { id: 'reference', label: '选型 / 反模式 / 术语', shortLabel: '速查', icon: Wrench },
  { id: 'quiz', label: '通关自测', shortLabel: '自测', icon: Award },
  { id: 'docs', label: '390 篇本地文档', shortLabel: '文档库', icon: BookOpen },
];

const FOUR_PILLARS = [
  {
    key: 'data',
    tag: 'Semantic · 名词',
    title: 'Data（语义数据层）',
    en: 'Objects · Properties · Links · Interfaces',
    desc: '把分散在 ERP、MES、IoT 的原始表映射为业务实体，用主键唯一标识，用 Link Type 与 Interface 编织可跨类型多态遍历的知识图谱。',
    docId: 'ontology/core-concepts',
    icon: Database,
    colorClass: 'text-[var(--accent)] bg-[var(--accent-soft)]',
  },
  {
    key: 'logic',
    tag: 'Kinetic · 推理',
    title: 'Logic（业务逻辑层）',
    en: 'TypeScript v2 · Python OSDK · Metrics',
    desc: '把预测、排程、约束检查或 AIP LLM Agent 封装成可复用的 Functions，直接读写强类型对象图并参与实时仿真推演（Scenarios）。',
    docId: 'functions/overview',
    icon: Cpu,
    colorClass: 'text-[var(--success)] bg-[var(--success-soft)]',
  },
  {
    key: 'action',
    tag: 'Kinetic · 动词',
    title: 'Action（决策执行层）',
    en: 'Parameters · Submission Criteria · Rules',
    desc: '任何状态变更都必须经过 Action Type：先检查提交条件（Submission Criteria），再执行原子写回（OSv2）与 Side Effects，自动记录决策血缘。',
    docId: 'action-types/overview',
    icon: Zap,
    colorClass: 'text-[var(--warning)] bg-[var(--warning-soft)]',
  },
  {
    key: 'security',
    tag: 'Governance · 护栏',
    title: 'Security（全链路安全）',
    en: 'Markings · Roles · Restricted Views · Branches',
    desc: '统一管控行级/列级密级隔离与操作授权，AI Agent 与人类操作员共用同一套最小权限边界，支持 Ontology Branches 安全隔离变更。',
    docId: 'object-permissioning/overview',
    icon: ShieldCheck,
    colorClass: 'text-[var(--danger)] bg-[var(--danger-soft)]',
  },
];

function readStringArrayStorage(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [selectedDocId, setSelectedDocId] = useState<string>('ontology/why-ontology');
  const [requestedRefTab, setRequestedRefTab] = useState<'apps' | 'antipatterns' | 'glossary' | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectedImage, setInspectedImage] = useState<{ src: string; alt: string } | null>(null);

  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    readStringArrayStorage('palantir-ontology-completed-lessons')
  );
  const [readDocs, setReadDocs] = useState<string[]>(() =>
    readStringArrayStorage('palantir-ontology-read-docs')
  );

  const totalLessons = useMemo(
    () => CURRICULUM_STAGES.reduce((acc, s) => acc + s.lessons.length, 0),
    []
  );

  const docTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of docsIndex.docs) map.set(d.id, d.h1);
    return map;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('palantir-ontology-completed-lessons', JSON.stringify(completedLessons));
    } catch {
      // Ignore storage quota errors
    }
  }, [completedLessons]);

  useEffect(() => {
    try {
      localStorage.setItem('palantir-ontology-read-docs', JSON.stringify(readDocs));
    } catch {
      // Ignore storage quota errors
    }
  }, [readDocs]);

  useEffect(() => {
    const currentNav = NAV_ITEMS.find((n) => n.id === activeView);
    if (activeView === 'docs') {
      const title = docTitleMap.get(selectedDocId) || selectedDocId;
      document.title = `${title} · Palantir Ontology 文档库`;
    } else {
      document.title = `${currentNav?.label || '概览'} · Palantir Ontology 新手精通工作台`;
    }
  }, [activeView, selectedDocId, docTitleMap]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleOpenDoc = useCallback((docId: string) => {
    setSelectedDocId(docId);
    setActiveView('docs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleLesson = useCallback((lessonId: string) => {
    setCompletedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }, []);

  const handleToggleReadDoc = useCallback((docId: string) => {
    setReadDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }, []);

  const handleInspectImage = useCallback((src: string, alt: string) => {
    setInspectedImage({ src, alt });
  }, []);

  const switchView = (view: ViewId) => {
    setActiveView(view);
    if (view !== 'reference') setRequestedRefTab(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <a href="#main-content" className="skip-link visually-hidden">
          跳转到正文内容
        </a>

        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => switchView('overview')}
                className="flex items-center gap-2.5 text-start"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-text)] shadow-xs">
                  <Layers className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                    Palantir Ontology 学习工作台
                  </div>
                  <div className="hidden font-mono text-[11px] text-[var(--text-muted)] sm:block">
                    {docsIndex.totalSections} 章节 · {docsIndex.totalDocs} 篇本地文档 · 15 节实战路线
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                aria-label="打开全局搜索（快捷键 Command+K 或 Ctrl+K）"
              >
                <Search className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>搜文档 / 术语</span>
                <kbd className="hidden rounded border border-[var(--border-strong)]/40 bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:inline-block">
                  ⌘K
                </kbd>
              </button>

              <div
                className="hidden items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs md:flex"
                title="课程完成进度"
              >
                <GraduationCap className="size-3.5 text-[var(--success)]" aria-hidden="true" />
                <span className="text-[var(--text-secondary)]">进度</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {completedLessons.length}/{totalLessons}
                </span>
              </div>

              <ThemeToggle />
            </div>
          </div>

          {/* Primary Navigation Bar */}
          <nav
            aria-label="主导航"
            className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto border-t border-[var(--border-subtle)] px-4 py-1.5 sm:px-6"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Main View */}
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-8"
            >
              {/* Hero Card */}
              <section className="blueprint-grid relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8 lg:p-10">
                <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      <Sparkles className="size-3.5" aria-hidden="true" />
                      <span>基于本地 390 篇官方 Foundry 文档精编</span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl sm:leading-tight">
                      用中文直观掌握 <span className="text-[var(--accent)]">Palantir Ontology</span>
                    </h1>

                    <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                      很多初学者看英文文档会被 <code>Object Type</code>、<code>OSv2</code>、<code>Submission Criteria</code>、<code>Search Around</code>、<code>Interface</code> 绕晕。
                      这个工作台用<strong>生活化类比 + 可交互数字孪生沙盒 + 官方真实架构图</strong>，带你从零看懂 Ontology 如何把企业数据和业务动作统一起来。
                    </p>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => switchView('learn')}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-text)] shadow-sm transition-transform hover:scale-[1.01]"
                      >
                        <GraduationCap className="size-4" aria-hidden="true" />
                        <span>按 6 阶段路线从零开始</span>
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => switchView('docs')}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]"
                      >
                        <FolderTree className="size-4 text-[var(--accent)]" aria-hidden="true" />
                        <span>直读 390 篇原文与配图</span>
                      </button>
                    </div>

                    {/* Quick KPI strip */}
                    <div className="grid grid-cols-3 gap-3 pt-3 sm:max-w-lg">
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/85 px-3 py-2.5">
                        <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                          {docsIndex.totalDocs}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">本地 Markdown 全文</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/85 px-3 py-2.5">
                        <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                          15 节
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">6 阶段新手精讲课</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/85 px-3 py-2.5">
                        <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                          {GLOSSARY_TERMS.length} 条
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">中英黑话速查表</div>
                      </div>
                    </div>
                  </div>

                  {/* Official Core Overview Visual */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 shadow-xs">
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectImage(
                          './resources/foundry/ontology/why-ontology-overview.png',
                          'Palantir Ontology 决策闭环：Data、Logic、Action 与 Security'
                        )
                      }
                      className="group block w-full text-start"
                      aria-label="放大查看官方 Ontology 核心决策架构图"
                    >
                      <img
                        src="./resources/foundry/ontology/why-ontology-overview.png"
                        alt="Palantir Ontology 决策闭环：Data、Logic、Action 与 Security"
                        className="w-full rounded-xl bg-white object-contain p-1 transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                      <div className="mt-2.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>官方原图：Data + Logic + Action + Security 闭环</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--accent)]">
                          <ZoomIn className="size-3.5" aria-hidden="true" />
                          <span>放大</span>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </section>

              {/* Four Pillars Grid */}
              <section aria-labelledby="pillars-heading" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id="pillars-heading" className="text-xl font-bold tracking-tight">
                      3 分钟建立正确心智模型：Ontology 的四大支柱
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      点击任意卡片，直接打开该支柱对应的官方文档精读。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchView('reference')}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    避坑指南：查看 8 大建模反模式 →
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {FOUR_PILLARS.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                      <button
                        key={pillar.key}
                        type="button"
                        onClick={() => handleOpenDoc(pillar.docId)}
                        className="group flex flex-col items-start justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-start transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex size-10 items-center justify-center rounded-xl ${pillar.colorClass}`}>
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            <span className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--text-muted)]">
                              {pillar.tag}
                            </span>
                          </div>
                          <h3 className="mt-4 text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                            {pillar.title}
                          </h3>
                          <div className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                            {pillar.en}
                          </div>
                          <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {pillar.desc}
                          </p>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                          <span>阅读官方文档</span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Embedded Interactive Sandbox */}
              <InteractiveSandbox onOpenDoc={handleOpenDoc} />

              {/* Suggested Quick Entry Footer Card */}
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">1. 跟着 6 阶段路线学</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    按「核心心智 → 实体属性 → 动作函数 → 接口反模式 → 应用生态 → OSv2 权限分支」顺序打通关，每节课附白话类比与防踩坑提示。
                  </p>
                  <button
                    type="button"
                    onClick={() => switchView('learn')}
                    className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    进入学习路线 ({completedLessons.length}/{totalLessons}) →
                  </button>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">2. 不知道选哪个工具？</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Object Explorer、Object Views、Workshop、Quiver、Vertex、Map、Machinery 怎么选？速查表 10 秒帮你选型并排查 8 类建模反模式。
                  </p>
                  <button
                    type="button"
                    onClick={() => switchView('reference')}
                    className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    打开速查工具箱 →
                  </button>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">3. 8 道场景题检验掌握度</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    「Submission Criteria 放在哪」「什么时候该用 Interface」「OSv2 编辑冲突怎么解决」——每题直接给出解析并跳转到对应官方文档。
                  </p>
                  <button
                    type="button"
                    onClick={() => switchView('quiz')}
                    className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    立即自测 →
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LearningPath
                completedLessons={completedLessons}
                onToggleLesson={handleToggleLesson}
                onOpenDoc={handleOpenDoc}
                onInspectImage={handleInspectImage}
              />
            </motion.div>
          )}

          {activeView === 'sandbox' && (
            <motion.div
              key="sandbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <InteractiveSandbox onOpenDoc={handleOpenDoc} />
            </motion.div>
          )}

          {activeView === 'reference' && (
            <motion.div
              key="reference"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ReferenceTools onOpenDoc={handleOpenDoc} requestedTab={requestedRefTab} />
            </motion.div>
          )}

          {activeView === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MasteryQuiz onOpenDoc={handleOpenDoc} />
            </motion.div>
          )}

          {activeView === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DocsExplorer
                docsIndex={docsIndex}
                selectedDocId={selectedDocId}
                onSelectDoc={setSelectedDocId}
                readDocs={readDocs}
                onToggleReadDoc={handleToggleReadDoc}
                onInspectImage={handleInspectImage}
              />
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 text-xs text-[var(--text-muted)]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
            <div>
              本地文档源：<code>/Users/Alex/palantir-docs/foundry/</code>（共 {docsIndex.totalDocs} 篇 · 已掌握 {readDocs.length} 篇）
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                全局搜索 (⌘K)
              </button>
              <button
                type="button"
                onClick={() => handleOpenDoc('ontology/why-ontology')}
                className="hover:text-[var(--text-primary)]"
              >
                Why Ontology
              </button>
              <button
                type="button"
                onClick={() => handleOpenDoc('ontology/ontology-anti-patterns')}
                className="hover:text-[var(--text-primary)]"
              >
                Anti-patterns
              </button>
            </div>
          </div>
        </footer>

        {/* Global Cmd+K Search Dialog */}
        <GlobalSearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          docsIndex={docsIndex}
          onSelectDoc={handleOpenDoc}
          onJumpToGlossary={() => {
            setRequestedRefTab('glossary');
            setActiveView('reference');
          }}
        />

        {/* Image Zoom Lightbox Dialog */}
        <NativeDialog
          open={Boolean(inspectedImage)}
          onClose={() => setInspectedImage(null)}
          title={inspectedImage?.alt || '官方架构配图放大预览'}
          subtitle="来自本地 resources/ 目录的高清原图"
          maxWidthClass="max-w-5xl"
        >
          {inspectedImage ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={inspectedImage.src}
                alt={inspectedImage.alt}
                className="max-h-[75dvh] w-auto rounded-xl border border-[var(--border-subtle)] bg-white object-contain p-2"
              />
              <p className="text-xs text-[var(--text-secondary)]">{inspectedImage.alt}</p>
            </div>
          ) : null}
        </NativeDialog>
      </div>
    </MotionConfig>
  );
}
