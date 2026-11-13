import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Compass, FileText, Search } from 'lucide-react';
import { NativeDialog } from './NativeDialog';
import { GLOSSARY_TERMS } from '../data/curriculum';
import type { DocsIndex } from '../types/docs';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  docsIndex: DocsIndex;
  onSelectDoc: (docId: string) => void;
  onJumpToGlossary: () => void;
}

export function GlobalSearchModal({
  open,
  onClose,
  docsIndex,
  onSelectDoc,
  onJumpToGlossary,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [open]);

  const sectionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of docsIndex.sections) {
      map.set(sec.id, sec.zhName);
    }
    return map;
  }, [docsIndex.sections]);

  const { matchedGlossary, matchedDocs } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const quickIds = [
        'ontology/why-ontology',
        'ontology/core-concepts',
        'object-link-types/object-types-overview',
        'action-types/overview',
        'functions/overview',
        'interfaces/interface-overview',
        'object-backend/overview',
        'ontology/ontology-anti-patterns',
      ];
      return {
        matchedGlossary: GLOSSARY_TERMS.slice(0, 4),
        matchedDocs: docsIndex.docs.filter((d) => quickIds.includes(d.id)),
      };
    }

    const terms = q.split(/\s+/).filter(Boolean);
    const glossary = GLOSSARY_TERMS.filter((g) => {
      const hay = `${g.term} ${g.zhName} ${g.summary} ${g.example} ${g.category}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    }).slice(0, 6);

    const scored = docsIndex.docs
      .map((doc) => {
        const titleLower = `${doc.navTitle} ${doc.h1}`.toLowerCase();
        const headingsLower = doc.headings.join(' ').toLowerCase();
        const searchLower = doc.searchText;
        let score = 0;
        for (const term of terms) {
          if (titleLower.includes(term)) score += 12;
          else if (headingsLower.includes(term)) score += 5;
          else if (searchLower.includes(term)) score += 2;
          else return { doc, score: 0 };
        }
        if (doc.id.endsWith('/overview') || doc.id.includes('-overview')) score += 3;
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map((x) => x.doc);

    return { matchedGlossary: glossary, matchedDocs: scored };
  }, [query, docsIndex.docs]);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="全局速查：搜索 390 篇官方文档与中英术语"
      subtitle="支持英文术语（如 Action Type, OSv2, Search Around）或中文概念（如 权限、反模式、场景）"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <search aria-label="全局文档与术语搜索">
          <label className="relative block">
            <span className="visually-hidden">输入关键词搜索</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，如 Interface, Submission Criteria, OSv2, Branching..."
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] py-2.5 pr-4 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
        </search>

        {!query.trim() && (
          <p className="text-xs text-[var(--text-muted)]">
            新手高频必读推荐（共收录 {docsIndex.totalDocs} 篇本地文档）：
          </p>
        )}

        {matchedGlossary.length > 0 && (
          <section aria-label="匹配术语">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                <Compass className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>核心双语术语 ({matchedGlossary.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToGlossary();
                }}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                前往完整术语表
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {matchedGlossary.map((g) => (
                <button
                  key={g.term}
                  type="button"
                  onClick={() => {
                    onSelectDoc(g.docId);
                    onClose();
                  }}
                  className="flex flex-col items-start rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-start transition-colors hover:border-[var(--accent)]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {g.term} · {g.zhName}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {g.summary}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section aria-label="匹配本地文档">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
            <BookOpen className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
            <span>官方文档 ({matchedDocs.length})</span>
          </h3>
          {matchedDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-secondary)]">
              未找到匹配「{query}」的文档，可尝试缩短英文关键词（如 function, link, vertex）。
            </div>
          ) : (
            <ul className="space-y-1.5">
              {matchedDocs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDoc(doc.id);
                      onClose();
                    }}
                    className="group flex w-full items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-start transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/35"
                  >
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {doc.h1}
                        </span>
                        <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                          {sectionNameMap.get(doc.sectionId) || doc.sectionId}
                        </span>
                        {doc.badges.map((b) => (
                          <span
                            key={b}
                            className="rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--warning)]"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                        {doc.excerpt}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </NativeDialog>
  );
}
