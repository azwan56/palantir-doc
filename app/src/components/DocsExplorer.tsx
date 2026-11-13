import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  ListTree,
  RefreshCw,
  Search,
} from 'lucide-react';
import { CURRICULUM_STAGES } from '../data/curriculum';
import type { DocEntry, DocsIndex, SectionEntry } from '../types/docs';
import { MarkdownRenderer, slugifyHeading } from './MarkdownRenderer';
import { NativeDialog } from './NativeDialog';

interface DocsExplorerProps {
  docsIndex: DocsIndex;
  selectedDocId: string;
  onSelectDoc: (docId: string) => void;
  readDocs: string[];
  onToggleReadDoc: (docId: string) => void;
  onInspectImage: (src: string, alt: string) => void;
}

const CATEGORY_ORDER: { id: SectionEntry['category']; label: string }[] = [
  { id: 'foundation', label: '第一梯队 · 全局入门与核心理念' },
  { id: 'semantic', label: '第二梯队 · 语义建模（数据实体与关系）' },
  { id: 'kinetic', label: '第三梯队 · 动态逻辑（Action 与 Function）' },
  { id: 'apps', label: '第四梯队 · 上层无代码/低代码应用' },
  { id: 'architecture', label: '第五梯队 · 底层引擎与架构演进' },
  { id: 'governance', label: '第六梯队 · 权限、治理与版本协作' },
  { id: 'legacy', label: '补充参考 · 历史版本（新手可跳过）' },
  { id: 'other', label: '其他章节' },
];

interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

function extractTocHeadings(rawMarkdown: string): TocItem[] {
  const withoutFront = rawMarkdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const lines = withoutFront.split(/\r?\n/);
  const headings: TocItem[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length as 2 | 3;
      const text = match[2].replace(/\\\[/g, '[').replace(/\\\]/g, ']').trim();
      const id = slugifyHeading(text);
      if (id) headings.push({ level, text, id });
    }
  }
  return headings;
}

export function DocsExplorer({
  docsIndex,
  selectedDocId,
  onSelectDoc,
  readDocs,
  onToggleReadDoc,
  onInspectImage,
}: DocsExplorerProps) {
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [fetchState, setFetchState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fetchError, setFetchError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const readSet = useMemo(() => new Set(readDocs), [readDocs]);
  const availableDocIds = useMemo(
    () => new Set(docsIndex.docs.map((d) => d.id)),
    [docsIndex.docs]
  );

  const docMap = useMemo(() => {
    const map = new Map<string, DocEntry>();
    for (const d of docsIndex.docs) map.set(d.id, d);
    return map;
  }, [docsIndex.docs]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, SectionEntry>();
    for (const s of docsIndex.sections) map.set(s.id, s);
    return map;
  }, [docsIndex.sections]);

  const selectedDoc = docMap.get(selectedDocId) || docsIndex.docs[0];
  const selectedSection = selectedDoc ? sectionMap.get(selectedDoc.sectionId) : undefined;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set([selectedDoc?.sectionId || 'ontology', 'ontology-manager'])
  );

  useEffect(() => {
    if (selectedDoc?.sectionId) {
      setExpandedSections((prev) => {
        if (prev.has(selectedDoc.sectionId)) return prev;
        const next = new Set(prev);
        next.add(selectedDoc.sectionId);
        return next;
      });
    }
  }, [selectedDoc?.sectionId]);

  const curriculumContextMap = useMemo(() => {
    const map = new Map<string, { stageTitle: string; lessonTitle: string; analogy: string }>();
    for (const stage of CURRICULUM_STAGES) {
      for (const lesson of stage.lessons) {
        for (const ref of lesson.sourceDocs) {
          if (!map.has(ref.docId)) {
            map.set(ref.docId, {
              stageTitle: stage.title,
              lessonTitle: lesson.title,
              analogy: lesson.analogy,
            });
          }
        }
      }
    }
    return map;
  }, []);

  useEffect(() => {
    if (!selectedDoc) return;
    const controller = new AbortController();
    setFetchState('loading');
    setFetchError('');

    fetch(`./${selectedDoc.relPath}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: 无法读取 ${selectedDoc.relPath}`);
        }
        return res.text();
      })
      .then((text) => {
        setRawMarkdown(text);
        setFetchState('ready');
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setFetchError((err as Error).message || '读取本地 Markdown 文档失败');
        setFetchState('error');
      });

    return () => controller.abort();
  }, [selectedDoc?.relPath, reloadTick]);

  const tocHeadings = useMemo(() => extractTocHeadings(rawMarkdown), [rawMarkdown]);

  const { prevDoc, nextDoc } = useMemo(() => {
    const idx = docsIndex.docs.findIndex((d) => d.id === selectedDoc?.id);
    return {
      prevDoc: idx > 0 ? docsIndex.docs[idx - 1] : null,
      nextDoc: idx >= 0 && idx < docsIndex.docs.length - 1 ? docsIndex.docs[idx + 1] : null,
    };
  }, [docsIndex.docs, selectedDoc?.id]);

  const filteredSectionsByCategory = useMemo(() => {
    const q = sidebarFilter.trim().toLowerCase();
    const docsBySec = new Map<string, DocEntry[]>();

    for (const doc of docsIndex.docs) {
      const isBeginnerDoc =
        doc.id.endsWith('/overview') ||
        doc.id.includes('-overview') ||
        doc.id.includes('getting-started') ||
        doc.id.includes('core-concepts') ||
        doc.id.includes('why-ontology') ||
        curriculumContextMap.has(doc.id);

      if (beginnerOnly && !isBeginnerDoc) continue;

      if (q) {
        const sec = sectionMap.get(doc.sectionId);
        const hay = `${doc.navTitle} ${doc.h1} ${doc.id} ${sec?.zhName || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      const list = docsBySec.get(doc.sectionId) || [];
      list.push(doc);
      docsBySec.set(doc.sectionId, list);
    }

    return CATEGORY_ORDER.map((cat) => {
      const secs = docsIndex.sections
        .filter((s) => s.category === cat.id && (docsBySec.get(s.id)?.length || 0) > 0)
        .map((s) => ({
          section: s,
          docs: docsBySec.get(s.id) || [],
        }));
      return { ...cat, sections: secs };
    }).filter((cat) => cat.sections.length > 0);
  }, [docsIndex, sidebarFilter, beginnerOnly, curriculumContextMap, sectionMap]);

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const handleSelectDocFromSidebar = (docId: string) => {
    onSelectDoc(docId);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col gap-3">
      <search aria-label="筛选文档章节与标题">
        <label className="relative block">
          <span className="visually-hidden">过滤章节或文档标题</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={sidebarFilter}
            onChange={(e) => setSidebarFilter(e.target.value)}
            placeholder="过滤标题或文件夹，如 action..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 pr-3 pl-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
      </search>

      <button
        type="button"
        onClick={() => setBeginnerOnly((v) => !v)}
        aria-pressed={beginnerOnly}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
          beginnerOnly
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Filter className="size-3.5" aria-hidden="true" />
          <span>{beginnerOnly ? '当前：仅看入门 / Overview 篇' : '筛选：仅看入门与概览文档'}</span>
        </span>
        <span className="font-mono text-[11px]">{beginnerOnly ? 'ON' : 'ALL'}</span>
      </button>

      <nav aria-label="20 个 Foundry 文档目录" className="space-y-4">
        {filteredSectionsByCategory.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
            没有符合条件的文档
          </p>
        ) : (
          filteredSectionsByCategory.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <div className="px-1 text-[11px] font-semibold tracking-wide text-[var(--text-muted)]">
                {group.label}
              </div>
              {group.sections.map(({ section, docs }) => {
                const isExpanded =
                  Boolean(sidebarFilter.trim()) ||
                  beginnerOnly ||
                  expandedSections.has(section.id);
                const readInSection = docs.filter((d) => readSet.has(d.id)).length;
                return (
                  <div
                    key={section.id}
                    className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start hover:bg-[var(--bg-elevated)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {section.zhName}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                          <span>{section.id}/</span>
                          <span>·</span>
                          <span>
                            {readInSection}/{docs.length} 篇
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="border-t border-[var(--border-subtle)] py-1">
                        {docs.map((doc) => {
                          const isCurrent = doc.id === selectedDoc?.id;
                          const isRead = readSet.has(doc.id);
                          return (
                            <li key={doc.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectDocFromSidebar(doc.id)}
                                aria-current={isCurrent ? 'page' : undefined}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-start text-xs transition-colors ${
                                  isCurrent
                                    ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="shrink-0">
                                  {isRead ? (
                                    <CheckCircle2
                                      className="size-3.5 text-[var(--success)]"
                                      aria-label="已读"
                                    />
                                  ) : (
                                    <span
                                      className={`inline-block size-2 rounded-full ${
                                        isCurrent ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                                      }`}
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{doc.navTitle}</span>
                                {doc.badges.includes('Legacy') || doc.badges.includes('Sunset') ? (
                                  <span className="shrink-0 rounded bg-[var(--warning-soft)] px-1 py-0.2 text-[9px] font-medium text-[var(--warning)]">
                                    旧
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </nav>
    </div>
  );

  if (!selectedDoc) return null;

  const isSelectedRead = readSet.has(selectedDoc.id);
  const beginnerContext = curriculumContextMap.get(selectedDoc.id);
  const hasLegacyWarning = selectedDoc.badges.some(
    (b) => b === 'Legacy' || b === 'Sunset' || b === 'Planned deprecation'
  );

  return (
    <div className="space-y-4">
      {/* Mobile drawer trigger bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold text-[var(--accent-text)]"
        >
          <FolderOpen className="size-4" aria-hidden="true" />
          <span>浏览全部 {docsIndex.totalDocs} 篇目录</span>
        </button>
        <div className="text-xs text-[var(--text-secondary)]">
          已掌握 <strong className="font-mono text-[var(--text-primary)]">{readDocs.length}</strong> /{' '}
          {docsIndex.totalDocs} 篇
        </div>
      </div>

      <NativeDialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="drawer"
        title={`全部 ${docsIndex.totalSections} 个章节 / ${docsIndex.totalDocs} 篇文档`}
        subtitle="按 Palantir Ontology 学习顺序整理"
      >
        {renderSidebarContent()}
      </NativeDialog>

      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_220px]">
        {/* Desktop Sidebar */}
        <aside
          aria-label="文档章节目录"
          className="hidden lg:block"
        >
          <div className="scroll-panel sticky top-20 max-h-[calc(100dvh-6rem)] pr-1">
            {renderSidebarContent()}
          </div>
        </aside>

        {/* Main Document Reader */}
        <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs sm:p-7">
          {/* Header metadata */}
          <header className="mb-6 border-b border-[var(--border-subtle)] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                  {selectedSection?.zhName || selectedDoc.sectionId}
                </span>
                <span>/</span>
                <code className="font-mono text-[11px]">{selectedDoc.relPath}</code>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleReadDoc(selectedDoc.id)}
                  aria-pressed={isSelectedRead}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    isSelectedRead
                      ? 'border-[var(--success)]/50 bg-[var(--success-soft)] text-[var(--success)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                  }`}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>{isSelectedRead ? '已标记为掌握' : '标记为已掌握'}</span>
                </button>

                {selectedDoc.sourceUrl ? (
                  <a
                    href={selectedDoc.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <span>官网原文</span>
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>

            {selectedSection?.description ? (
              <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">章节定位：</strong>
                {selectedSection.description}
              </p>
            ) : null}

            {/* Badges & Beginner guidance */}
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDoc.badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--warning)]"
                >
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  <span>{b}</span>
                </span>
              ))}
              {selectedDoc.imageCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                  <ImageIcon className="size-3 text-[var(--accent)]" aria-hidden="true" />
                  <span>含 {selectedDoc.imageCount} 张本地架构配图</span>
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 font-mono text-xs text-[var(--text-muted)]">
                约 {Math.max(1, Math.round(selectedDoc.wordEstimate / 220))} 分钟阅读
              </span>
            </div>

            {beginnerContext ? (
              <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                  <BookMarked className="size-4" aria-hidden="true" />
                  <span>
                    新手路线定位：{beginnerContext.stageTitle} → {beginnerContext.lessonTitle}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed text-[var(--text-primary)]">
                  <strong>一句话白话记忆：</strong>
                  {beginnerContext.analogy}
                </p>
              </div>
            ) : null}

            {hasLegacyWarning ? (
              <div className="mt-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-3 text-xs text-[var(--text-primary)]">
                <strong>新手提示：</strong>
                这篇官方文档带有 <code>{selectedDoc.badges.join(' / ')}</code> 标记，属于历史版本或即将淘汰的能力（例如 Object Views、Classic Object Explorer、TS v1 / Functions v1 等）。新项目请优先学习 Workshop + OSv2 + TypeScript v2 / Python。
              </div>
            ) : null}
          </header>

          {/* Body */}
          {fetchState === 'loading' ? (
            <div className="space-y-4 py-8" aria-busy="true">
              <div className="h-7 w-2/3 animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
            </div>
          ) : fetchState === 'error' ? (
            <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-6 text-center">
              <p className="text-sm font-semibold text-[var(--danger)]">加载文档失败</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{fetchError}</p>
              <button
                type="button"
                onClick={() => setReloadTick((n) => n + 1)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-text)]"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                <span>重新加载</span>
              </button>
            </div>
          ) : (
            <MarkdownRenderer
              markdown={rawMarkdown}
              currentRelPath={selectedDoc.relPath}
              availableDocIds={availableDocIds}
              onNavigateDoc={onSelectDoc}
              onInspectImage={onInspectImage}
            />
          )}

          {/* Previous / Next Navigation */}
          <footer className="mt-10 grid gap-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
            {prevDoc ? (
              <button
                type="button"
                onClick={() => {
                  onSelectDoc(prevDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-start rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-start transition-colors hover:border-[var(--accent)]"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  <span>上一篇</span>
                </span>
                <span className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">
                  {prevDoc.h1}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextDoc ? (
              <button
                type="button"
                onClick={() => {
                  onSelectDoc(nextDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-end rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-end transition-colors hover:border-[var(--accent)]"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                  <span>下一篇</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">
                  {nextDoc.h1}
                </span>
              </button>
            ) : null}
          </footer>
        </article>

        {/* Right TOC (xl+) */}
        <aside aria-label="本文小节目录" className="hidden xl:block">
          <div className="scroll-panel sticky top-20 max-h-[calc(100dvh-6rem)] space-y-4 pl-1">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                <ListTree className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>本页小节导航</span>
              </div>
              {tocHeadings.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">本篇无二级标题目录</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {tocHeadings.map((h, i) => (
                    <li key={`${h.id}-${i}`} className={h.level === 3 ? 'pl-3' : ''}>
                      <a
                        href={`#${h.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="block rounded py-0.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
