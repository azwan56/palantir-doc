#!/usr/bin/env python3
"""给本地 Palantir Ontology 文档生成一张索引页。"""
import os, re, json, collections

OUT = "/Users/guzq/palantir-docs"
TITLE = re.compile(r'^title:\s*(.*)$', re.M)
SRC   = re.compile(r'^source:\s*(.*)$', re.M)

# 侧边栏原始顺序 = 官方阅读顺序
order = [l.strip().rstrip('/') for l in open('/private/tmp/claude-501/-Users-guzq-aip2-0/b07ad82f-dc33-4b21-8762-6478e6b1f843/scratchpad/nav-full.txt') if l.strip()]
rank = {s: i for i, s in enumerate(order)}

pages = []
for root, _, files in os.walk(OUT):
    if os.sep + "resources" in root + os.sep: continue
    for fn in sorted(files):
        if not fn.endswith(".md") or fn == "INDEX.md": continue
        p = os.path.join(root, fn)
        rel = os.path.relpath(p, OUT)
        head = open(p, encoding="utf-8").read(600)
        t = TITLE.search(head); s = SRC.search(head)
        title = (t.group(1).strip() if t else "").strip('"')
        title = title.replace("Documentation | ", "")
        pages.append(dict(rel=rel, title=title or rel,
                          slug="/" + rel[:-3], src=s.group(1).strip() if s else "",
                          dir=rel.split(os.sep)[1] if os.sep in rel else "(root)",
                          size=os.path.getsize(p)))

pages.sort(key=lambda x: (rank.get(x['slug'], 10**6), x['rel']))
bydir = collections.OrderedDict()
for p in pages: bydir.setdefault(p['dir'], []).append(p)

nimg = sum(len(f) for _, _, f in os.walk(os.path.join(OUT, "resources")))
lines = [
 "# Palantir Foundry — Ontology 文档本地副本", "",
 f"- 页数:**{len(pages)}**,横跨 {len(bydir)} 个目录",
 f"- 图片:**{nimg}** 个,存在 `resources/`,markdown 里已改成本地相对路径",
 "- 来源:<https://www.palantir.com/docs/foundry/ontology> 左侧「Ontology」板块全部页面",
 "- 正文取自各页 `__NEXT_DATA__` 里的原始 markdown,非 HTML 转换,格式与官方源一致",
 "- 每个文件头部 frontmatter 里有 `source:` 原始链接",
 "", "> 版权归 Palantir Technologies,此副本仅供本地查阅。", "", "---", ""]
for d, ps in bydir.items():
    lines.append(f"## `{d}/` — {len(ps)} 页\n")
    for p in ps:
        lines.append(f"- [{p['title']}]({p['rel'].replace(os.sep,'/')})")
    lines.append("")
open(os.path.join(OUT, "INDEX.md"), "w", encoding="utf-8").write("\n".join(lines))
print(f"INDEX.md: {len(pages)} 页 / {len(bydir)} 目录 / {nimg} 图")
