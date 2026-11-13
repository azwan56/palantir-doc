import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  ZoomIn,
} from 'lucide-react';
import { AccessibleTabs, type TabItem } from './AccessibleTabs';

interface MarkdownRendererProps {
  markdown: string;
  currentRelPath: string;
  availableDocIds: Set<string>;
  onNavigateDoc: (docId: string) => void;
  onInspectImage: (src: string, alt: string) => void;
}

interface ParsedCodeTab {
  lang: string;
  tabLabel: string;
  code: string;
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string; id: string }
  | { type: 'hr' }
  | { type: 'callout'; theme: string; title: string; blocks: Block[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'code-tabs'; tabs: ParsedCodeTab[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'image'; src: string; alt: string; width?: string }
  | { type: 'paragraph'; text: string };

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function slugifyHeading(text: string): string {
  return text
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .toLowerCase()
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function resolveImageSrc(src: string, currentRelPath: string): string {
  const cleaned = src.trim();
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  // Relative paths like ../../resources/foundry/... from foundry/<sec>/<file>.md
  if (cleaned.includes('resources/')) {
    const idx = cleaned.indexOf('resources/');
    return `./${cleaned.slice(idx)}`;
  }
  const dirParts = currentRelPath.split('/').slice(0, -1);
  const parts = cleaned.split('/');
  const resolved = [...dirParts];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') resolved.pop();
    else resolved.push(p);
  }
  return `./${resolved.join('/')}`;
}

function resolveDocHref(
  href: string,
  availableDocIds: Set<string>
): { kind: 'local'; docId: string } | { kind: 'external'; url: string } | { kind: 'anchor'; id: string } {
  const trimmed = href.trim();
  if (trimmed.startsWith('#')) {
    return { kind: 'anchor', id: trimmed.slice(1) };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: 'external', url: trimmed };
  }
  if (trimmed.startsWith('/docs/foundry/')) {
    const withoutQuery = trimmed.split('#')[0].split('?')[0];
    const sub = withoutQuery.replace(/^\/docs\/foundry\//, '').replace(/\/+$/, '');
    if (availableDocIds.has(sub)) {
      return { kind: 'local', docId: sub };
    }
    if (!sub.includes('/') && availableDocIds.has(`${sub}/overview`)) {
      return { kind: 'local', docId: `${sub}/overview` };
    }
    // Check common section overview mappings
    const parts = sub.split('/');
    if (parts.length === 1) {
      const candidate = [...availableDocIds].find((id) => id.startsWith(`${parts[0]}/`) && id.endsWith('overview'));
      if (candidate) return { kind: 'local', docId: candidate };
    }
    return { kind: 'external', url: `https://www.palantir.com${trimmed}` };
  }
  if (trimmed.startsWith('/')) {
    return { kind: 'external', url: `https://www.palantir.com${trimmed}` };
  }
  return { kind: 'external', url: trimmed };
}

function parseCodeFenceHeader(rawHeader: string): { lang: string; tabLabel: string | null } {
  const trimmed = rawHeader.trim();
  const tabMatch = trimmed.match(/tab=["']([^"']+)["']/);
  const lang = trimmed.replace(/tab=["'][^"']+["']/, '').trim() || 'text';
  return {
    lang,
    tabLabel: tabMatch ? tabMatch[1] : null,
  };
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cur = '';
  let escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '|') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function parseBlocks(body: string, currentRelPath: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Callout directive :::callout{...}
    if (trimmed.startsWith(':::callout')) {
      const attrStr = trimmed.slice(':::callout'.length);
      const themeMatch = attrStr.match(/theme=["']([^"']+)["']/);
      const titleMatch = attrStr.match(/title=["']([^"']+)["']/);
      const innerLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        innerLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      blocks.push({
        type: 'callout',
        theme: themeMatch?.[1] || 'neutral',
        title: titleMatch?.[1] || '',
        blocks: parseBlocks(innerLines.join('\n'), currentRelPath),
      });
      continue;
    }

    // Fenced code blocks (group consecutive tabbed blocks)
    if (trimmed.startsWith('```')) {
      const collectFence = (startIdx: number) => {
        const header = parseCodeFenceHeader(lines[startIdx].trim().slice(3));
        let j = startIdx + 1;
        const codeLines: string[] = [];
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j]);
          j++;
        }
        return { header, code: codeLines.join('\n'), nextIdx: j + 1 };
      };

      const first = collectFence(i);
      if (first.header.tabLabel) {
        const tabs: ParsedCodeTab[] = [
          { lang: first.header.lang, tabLabel: first.header.tabLabel, code: first.code },
        ];
        i = first.nextIdx;
        while (i < lines.length) {
          let probe = i;
          while (probe < lines.length && !lines[probe].trim()) probe++;
          if (probe < lines.length && lines[probe].trim().startsWith('```')) {
            const nextHeader = parseCodeFenceHeader(lines[probe].trim().slice(3));
            if (nextHeader.tabLabel) {
              const nextFence = collectFence(probe);
              tabs.push({
                lang: nextFence.header.lang,
                tabLabel: nextHeader.tabLabel,
                code: nextFence.code,
              });
              i = nextFence.nextIdx;
              continue;
            }
          }
          break;
        }
        blocks.push({ type: 'code-tabs', tabs });
      } else {
        blocks.push({ type: 'code', lang: first.header.lang, code: first.code });
        i = first.nextIdx;
      }
      continue;
    }

    // Horizontal rule
    if (/^(\*\*\*+|---+|___+)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      const text = headingMatch[2].replace(/\\\[/g, '[').replace(/\\\]/g, ']').trim();
      blocks.push({
        type: 'heading',
        level,
        text,
        id: slugifyHeading(text),
      });
      i++;
      continue;
    }

    // Standalone Markdown image ![alt](src)
    const mdImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (mdImgMatch) {
      blocks.push({
        type: 'image',
        alt: mdImgMatch[1],
        src: resolveImageSrc(mdImgMatch[2], currentRelPath),
      });
      i++;
      continue;
    }

    // Standalone HTML <img ...>
    if (/^<img\s/i.test(trimmed) && trimmed.endsWith('>')) {
      const srcM = trimmed.match(/src=["']([^"']+)["']/i);
      const altM = trimmed.match(/alt=["']([^"']*)["']/i);
      const widthM = trimmed.match(/width=["']?(\d+)["']?/i);
      if (srcM) {
        blocks.push({
          type: 'image',
          alt: altM?.[1] || 'Palantir Ontology diagram',
          src: resolveImageSrc(srcM[1], currentRelPath),
          width: widthM?.[1],
        });
        i++;
        continue;
      }
    }

    // Markdown table
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Unordered or ordered list
    if (/^([*-]|\d+\.)\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];
        const curTrim = cur.trim();
        if (!curTrim) {
          if (i + 1 < lines.length && /^(\s*[*-]|\s*\d+\.)\s+/.test(lines[i + 1])) {
            i++;
            continue;
          }
          break;
        }
        if (/^([*-]|\d+\.)\s+/.test(curTrim) && !cur.startsWith('  ')) {
          items.push(curTrim.replace(/^([*-]|\d+\.)\s+/, ''));
          i++;
        } else if (items.length > 0 && (cur.startsWith('  ') || cur.startsWith('\t'))) {
          items[items.length - 1] += `\n${curTrim}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph (stop before special blocks)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (
        !nextTrim ||
        nextTrim.startsWith('#') ||
        nextTrim.startsWith('```') ||
        nextTrim.startsWith(':::') ||
        nextTrim.startsWith('>') ||
        /^(\*\*\*+|---+|___+)$/.test(nextTrim) ||
        /^([*-]|\d+\.)\s+/.test(nextTrim) ||
        /^!\[[^\]]*\]\([^)]+\)$/.test(nextTrim) ||
        /^<img\s/i.test(nextTrim)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

function CodeBlock({
  lang,
  code,
  label,
}: {
  lang: string;
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard might be restricted in sandboxed contexts
    }
  };

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[#0b1120]">
      <figcaption className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
        <span className="font-mono font-medium uppercase tracking-wider text-sky-300">
          {label || lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制代码"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              <span>复制</span>
            </>
          )}
        </button>
      </figcaption>
      <pre
        role="region"
        aria-label={`${label || lang || 'code'} 代码示例`}
        tabIndex={0}
        className="code-surface overflow-x-auto p-4 text-[13px] leading-relaxed"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function CodeTabsBlock({ tabs }: { tabs: ParsedCodeTab[] }) {
  const [active, setActive] = useState(tabs[0]?.tabLabel || '0');
  const items: TabItem[] = tabs.map((t) => ({
    id: t.tabLabel,
    label: t.tabLabel,
    content: <CodeBlock lang={t.lang} code={t.code} label={t.tabLabel} />,
  }));

  return (
    <div className="my-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <AccessibleTabs
        ariaLabel="代码语言切换"
        tabs={items}
        activeId={active}
        onChange={setActive}
        panelBodyClassName="pt-1"
      />
    </div>
  );
}

export function MarkdownRenderer({
  markdown,
  currentRelPath,
  availableDocIds,
  onNavigateDoc,
  onInspectImage,
}: MarkdownRendererProps) {
  const body = useMemo(() => stripFrontmatter(markdown), [markdown]);
  const blocks = useMemo(() => parseBlocks(body, currentRelPath), [body, currentRelPath]);

  const renderInline = (text: string): ReactNode[] => {
    // Normalize escaped markdown characters & inline <br>
    const cleaned = text.replace(/\\([_*[\]()#`])/g, '$1');
    const nodes: ReactNode[] = [];
    // Tokenize: inline code, images, links, <img ...>, bold, italic, <br>
    const pattern =
      /(`[^`]+`|!\[[^\]]*\]\([^)]+\)|<img\s+[^>]+>|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*\n]+\*|<br\s*\/?>)/gi;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = pattern.exec(cleaned)) !== null) {
      if (match.index > lastIdx) {
        nodes.push(cleaned.slice(lastIdx, match.index));
      }
      const token = match[0];

      if (token.startsWith('`') && token.endsWith('`')) {
        nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
      } else if (/^<br\s*\/?>$/i.test(token)) {
        nodes.push(<br key={key++} />);
      } else if (token.startsWith('![')) {
        const m = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (m) {
          const src = resolveImageSrc(m[2], currentRelPath);
          const alt = m[1] || 'Documentation illustration';
          nodes.push(
            <button
              key={key++}
              type="button"
              onClick={() => onInspectImage(src, alt)}
              className="my-2 inline-block overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 transition hover:border-[var(--accent)]"
              aria-label={`放大查看图片: ${alt}`}
            >
              <img src={src} alt={alt} loading="lazy" className="max-h-72 w-auto rounded" />
            </button>
          );
        }
      } else if (/^<img\s/i.test(token)) {
        const srcM = token.match(/src=["']([^"']+)["']/i);
        const altM = token.match(/alt=["']([^"']*)["']/i);
        if (srcM) {
          const src = resolveImageSrc(srcM[1], currentRelPath);
          const alt = altM?.[1] || 'Documentation illustration';
          nodes.push(
            <button
              key={key++}
              type="button"
              onClick={() => onInspectImage(src, alt)}
              className="my-2 inline-block overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 transition hover:border-[var(--accent)]"
              aria-label={`放大查看图片: ${alt}`}
            >
              <img src={src} alt={alt} loading="lazy" className="max-h-72 w-auto rounded" />
            </button>
          );
        }
      } else if (token.startsWith('[')) {
        const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) {
          const linkText = m[1];
          const target = resolveDocHref(m[2], availableDocIds);
          if (target.kind === 'local') {
            nodes.push(
              <button
                key={key++}
                type="button"
                onClick={() => onNavigateDoc(target.docId)}
                className="inline font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
              >
                {renderInline(linkText)}
              </button>
            );
          } else if (target.kind === 'anchor') {
            nodes.push(
              <a
                key={key++}
                href={`#${target.id}`}
                className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
              >
                {renderInline(linkText)}
              </a>
            );
          } else {
            nodes.push(
              <a
                key={key++}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
              >
                <span>{renderInline(linkText)}</span>
                <ExternalLink className="inline size-3 shrink-0" aria-hidden="true" />
              </a>
            );
          }
        } else {
          nodes.push(token);
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        nodes.push(<strong key={key++}>{renderInline(token.slice(2, -2))}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        nodes.push(<em key={key++}>{renderInline(token.slice(1, -1))}</em>);
      } else {
        nodes.push(token);
      }

      lastIdx = pattern.lastIndex;
    }

    if (lastIdx < cleaned.length) {
      nodes.push(cleaned.slice(lastIdx));
    }
    return nodes;
  };

  const renderBlocks = (list: Block[], prefix = 'b'): ReactNode[] =>
    list.map((block, idx) => {
      const k = `${prefix}-${idx}`;
      switch (block.type) {
        case 'hr':
          return <hr key={k} />;
        case 'heading': {
          const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4';
          return (
            <Tag key={k} id={block.id}>
              {renderInline(block.text)}
            </Tag>
          );
        }
        case 'paragraph':
          return <p key={k}>{renderInline(block.text)}</p>;
        case 'blockquote':
          return (
            <blockquote key={k}>
              {block.lines.map((l, li) => (
                <p key={li}>{renderInline(l)}</p>
              ))}
            </blockquote>
          );
        case 'list': {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={k}>
              {block.items.map((item, ii) => {
                const subLines = item.split('\n');
                return (
                  <li key={ii}>
                    {subLines.map((sl, sli) => (
                      <span key={sli} className={sli > 0 ? 'mt-1.5 block' : ''}>
                        {renderInline(sl)}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ListTag>
          );
        }
        case 'image':
          return (
            <figure
              key={k}
              className="my-5 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
            >
              <button
                type="button"
                onClick={() => onInspectImage(block.src, block.alt)}
                className="group relative block w-full overflow-hidden rounded-lg text-start"
                aria-label={`点击放大查看：${block.alt || '官方文档配图'}`}
              >
                <img
                  src={block.src}
                  alt={block.alt || 'Palantir Ontology 官方文档配图'}
                  loading="lazy"
                  style={block.width ? { maxWidth: `min(100%, ${block.width}px)` } : undefined}
                  className="mx-auto max-h-[460px] w-auto rounded-lg object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                />
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] group-hover:text-[var(--accent)]">
                  <ZoomIn className="size-3.5" aria-hidden="true" />
                  <span>点击查看大图</span>
                </span>
              </button>
              {block.alt ? (
                <figcaption className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-secondary)]">
                  {block.alt}
                </figcaption>
              ) : null}
            </figure>
          );
        case 'code':
          return <CodeBlock key={k} lang={block.lang} code={block.code} />;
        case 'code-tabs':
          return <CodeTabsBlock key={k} tabs={block.tabs} />;
        case 'table':
          return (
            <div key={k} className="table-scroll-wrap my-5">
              <table className="doc-table">
                <thead>
                  <tr>
                    {block.headers.map((h, hi) => (
                      <th key={hi} scope="col">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri}>
                      {block.headers.map((_, ci) => (
                        <td key={ci}>{renderInline(row[ci] || '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case 'callout': {
          const themeStyles: Record<
            string,
            { wrap: string; icon: ReactNode; label: string }
          > = {
            warning: {
              wrap: 'border-[var(--warning)]/40 bg-[var(--warning-soft)]',
              icon: <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" aria-hidden="true" />,
              label: '注意 / 警告',
            },
            success: {
              wrap: 'border-[var(--success)]/40 bg-[var(--success-soft)]',
              icon: <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" aria-hidden="true" />,
              label: '推荐学习',
            },
            neutral: {
              wrap: 'border-[var(--border-strong)]/40 bg-[var(--bg-elevated)]',
              icon: <Info className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />,
              label: '补充说明',
            },
          };
          const style = themeStyles[block.theme] || themeStyles.neutral;
          return (
            <aside
              key={k}
              className={`my-5 rounded-xl border p-4 ${style.wrap}`}
              aria-label={block.title || style.label}
            >
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                {style.icon}
                <span>{block.title || style.label}</span>
              </div>
              <div className="text-sm text-[var(--text-secondary)] [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                {renderBlocks(block.blocks, `${k}-c`)}
              </div>
            </aside>
          );
        }
        default:
          return null;
      }
    });

  return <div className="md-prose">{renderBlocks(blocks)}</div>;
}
