import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const foundryDir = path.join(repoRoot, 'foundry');
const indexMdPath = path.join(repoRoot, 'INDEX.md');
const outPath = path.join(__dirname, '../src/data/docs-index.json');

const SECTION_META = {
  'ontology': {
    zhName: 'Ontology 核心与设计',
    category: 'foundation',
    order: 1,
    description: 'Ontology 的价值定位、核心概念、设计最佳实践、反模式、场景模拟与语义搜索。',
  },
  'ontology-manager': {
    zhName: 'Ontology Manager',
    category: 'foundation',
    order: 2,
    description: '创建、维护与发布 Ontology 资源的核心管理工作台（OMA）。',
  },
  'object-link-types': {
    zhName: '对象、属性与链接类型',
    category: 'semantic',
    order: 3,
    description: '构建语义层的基石：Object Types、Properties、Shared Properties、Structs、Value Types 与 Link Types。',
  },
  'interfaces': {
    zhName: '接口 (Interfaces)',
    category: 'semantic',
    order: 4,
    description: '实现对象多态与抽象复用的核心机制，让不同对象类型共享同一工作流。',
  },
  'action-types': {
    zhName: '动作类型 (Actions)',
    category: 'kinetic',
    order: 5,
    description: '企业的“动词”：结构化写入、提交校验（Submission Criteria）、参数与副作用（Notifications/Webhooks）。',
  },
  'functions': {
    zhName: '函数 (Functions)',
    category: 'kinetic',
    order: 6,
    description: '用 TypeScript v2 或 Python 编写服务端业务逻辑，支持读写对象、调用大模型与单元测试。',
  },
  'object-explorer': {
    zhName: 'Object Explorer',
    category: 'apps',
    order: 7,
    description: '零配置自助搜索、过滤、关联跳转（Search Around）与对象集合对比分析工具。',
  },
  'object-views': {
    zhName: 'Object Views',
    category: 'apps',
    order: 8,
    description: '单个对象的 360° 全景信息中心，分为标准视图与 Workshop 定制视图（Full / Panel）。',
  },
  'vertex': {
    zhName: 'Vertex 系统图谱',
    category: 'apps',
    order: 9,
    description: '可视化因果网络、时序事件与“What-If”系统级模拟推演。',
  },
  'map': {
    zhName: 'Map 地理空间分析',
    category: 'apps',
    order: 10,
    description: '在地图与时间轴上可视化点、轨迹、区域与时空事件并直接执行地理动作。',
  },
  'machinery': {
    zhName: 'Machinery 流程编排',
    category: 'apps',
    order: 11,
    description: '基于事件日志的流程挖掘（Process Mining）与人机协同多步骤 AIP 状态机编排。',
  },
  'dynamic-scheduling': {
    zhName: 'Dynamic Scheduling',
    category: 'apps',
    order: 12,
    description: '基于甘特图与日历组件的资源排程、拖拽调度与约束校验。',
  },
  'foundry-rules': {
    zhName: 'Foundry Rules',
    category: 'apps',
    order: 13,
    description: '低代码业务规则引擎，用于风控告警、设备劣化监测与分群（Cohorting）。',
  },
  'object-backend': {
    zhName: '后端架构 (OSv2)',
    category: 'architecture',
    order: 14,
    description: 'OMS、OSS、Object Data Funnel 与 Object Storage v2 架构演进及迁移指南。',
  },
  'object-indexing': {
    zhName: '索引与 Funnel 管线',
    category: 'architecture',
    order: 15,
    description: '将批处理、流式数据与直连数据源高效索引到对象数据库。',
  },
  'object-edits': {
    zhName: '对象编辑与物化',
    category: 'architecture',
    order: 16,
    description: 'Action 事务如何写入索引并持久化回 Dataset，以及数据源冲突解决策略。',
  },
  'object-permissioning': {
    zhName: '权限与安全策略',
    category: 'governance',
    order: 17,
    description: '基于 Project 的权限模型、Restricted Views 与对象/属性级细粒度安全策略。',
  },
  'ontologies': {
    zhName: '多 Ontology 与分支',
    category: 'governance',
    order: 18,
    description: '私有与共享 Ontology、Global Branching 分支隔离开发与资源配额。',
  },
  'object-monitors': {
    zhName: 'Object Monitors [Sunset]',
    category: 'legacy',
    order: 19,
    description: '旧版对象监控告警模块（已进入 Sunset 生命周期，仅供查阅历史概念）。',
  },
  'object-databases': {
    zhName: 'Object Storage v1 [待弃用]',
    category: 'legacy',
    order: 20,
    description: '初代 Phonograph 对象数据库文档（计划弃用，新项目应使用 OSv2）。',
  },
};

function parseFrontmatter(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fmMatch) {
    return { meta: {}, body: raw };
  }
  const meta = {};
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = val;
    }
  }
  return { meta, body: raw.slice(fmMatch[0].length) };
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/:::callout[^\n]*\n?/g, ' ')
    .replace(/:::/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`~|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectBadges(title, body) {
  const badges = [];
  if (/\[Sunset\]/i.test(title)) badges.push('Sunset');
  if (/\[Legacy\]/i.test(title)) badges.push('Legacy');
  if (/\[Beta\]/i.test(title) || /^#\s+.*\\?\[Beta\]/m.test(body)) badges.push('Beta');
  if (/\[Planned deprecation\]/i.test(title) || /Planned deprecation/i.test(body.slice(0, 600))) {
    badges.push('Planned deprecation');
  }
  return badges;
}

// Parse INDEX.md to preserve official sidebar order and titles
const indexMd = fs.readFileSync(indexMdPath, 'utf8');
const orderedEntries = [];
const seenPaths = new Set();

for (const line of indexMd.split(/\r?\n/)) {
  const m = line.match(/^- \[(.+?)\]\((foundry\/[^)]+\.md)\)$/);
  if (m) {
    orderedEntries.push({
      navTitle: m[1],
      relPath: m[2],
    });
    seenPaths.add(m[2]);
  }
}

// Ensure any file not listed in INDEX.md is still discovered
function walkMd(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMd(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

for (const fullPath of walkMd(foundryDir).sort()) {
  const relPath = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
  if (!seenPaths.has(relPath)) {
    orderedEntries.push({ navTitle: relPath, relPath });
    seenPaths.add(relPath);
  }
}

const docs = [];
const sectionsMap = new Map();

for (const entry of orderedEntries) {
  const fullPath = path.join(repoRoot, entry.relPath);
  if (!fs.existsSync(fullPath)) continue;

  const raw = fs.readFileSync(fullPath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const parts = entry.relPath.split('/');
  const sectionId = parts[1] || 'ontology';
  const slug = parts.slice(1).join('/').replace(/\.md$/, '');

  const h1Match = body.match(/^#\s+(.+)$/m);
  const h1 = h1Match ? h1Match[1].replace(/\\\[/g, '[').replace(/\\\]/g, ']').trim() : entry.navTitle;
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((m) => m[1].replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim())
    .slice(0, 16);

  const plain = stripMarkdown(body);
  const excerpt = plain.slice(0, 180) + (plain.length > 180 ? '…' : '');
  const searchText = `${entry.navTitle} ${h1} ${headings.join(' ')} ${plain.slice(0, 1100)}`.toLowerCase();

  const imgMatches = (body.match(/!\[[^\]]*\]\(/g) || []).length + (body.match(/<img\s/gi) || []).length;
  const codeMatches = Math.floor((body.match(/^```/gm) || []).length / 2);
  const badges = detectBadges(entry.navTitle, body);

  const doc = {
    id: slug,
    relPath: entry.relPath,
    sectionId,
    navTitle: entry.navTitle,
    h1,
    sourceUrl: meta.source || '',
    headings,
    excerpt,
    searchText,
    imageCount: imgMatches,
    codeCount: codeMatches,
    badges,
    wordEstimate: Math.max(30, plain.split(/\s+/).length),
  };

  docs.push(doc);

  if (!sectionsMap.has(sectionId)) {
    const sMeta = SECTION_META[sectionId] || {
      zhName: sectionId,
      category: 'other',
      order: 99,
      description: '',
    };
    sectionsMap.set(sectionId, {
      id: sectionId,
      ...sMeta,
      docCount: 0,
    });
  }
  sectionsMap.get(sectionId).docCount += 1;
}

const sections = [...sectionsMap.values()].sort((a, b) => a.order - b.order);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalDocs: docs.length,
    totalSections: sections.length,
    sections,
    docs,
  }),
  'utf8'
);

console.log(`Generated ${outPath}: ${docs.length} docs across ${sections.length} sections.`);
