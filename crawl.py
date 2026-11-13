#!/usr/bin/env python3
"""抓 Palantir Foundry 的 Ontology 板块:BFS 闭包 + 原始 markdown 落盘。"""
import json, re, sys, os, time, urllib.request, collections
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.palantir.com/docs"
OUT  = "/Users/guzq/palantir-docs"
UA   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
NEXT = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
DIRS = set("""functions object-link-types action-types map foundry-rules vertex object-views ontology
ontologies dynamic-scheduling object-explorer object-monitors interfaces ontology-manager
object-permissioning machinery object-edits object-indexing object-backend object-databases""".split())

class _R(urllib.request.HTTPRedirectHandler):
    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_301(req, fp, 301, msg, headers)
_OPENER = urllib.request.build_opener(_R)

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with _OPENER.open(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace"), r.geturl()
        except Exception:
            if i == tries - 1: raise
            time.sleep(1.5 * (i + 1))

def in_scope(u):
    p = u.split('/')
    return len(p) > 2 and p[1] == 'foundry' and p[2] in DIRS

def fetch(slug):
    try:
        html, final = get(BASE + slug.rstrip('/'))
        m = NEXT.search(html)
        if not m: return dict(slug=slug, ok=False, err="no __NEXT_DATA__")
        pp = json.loads(m.group(1))["props"]["pageProps"]
        md = pp.get("markdown")
        if md is None: return dict(slug=slug, ok=False, err="no markdown")
        meta = (pp.get("metadata", {}) or {}).get("data", {}) or {}
        # 规范 slug 用页面自报的 slug(目录首页会重定向到 overview)
        canon = (meta.get("slug") or slug).rstrip('/')
        nav = []
        def rec(n):
            if isinstance(n, dict):
                l = n.get('link')
                if isinstance(l, dict) and l.get('url'): nav.append(l['url'].rstrip('/'))
                for k, v in n.items():
                    if k != 'link': rec(v)
            elif isinstance(n, list):
                for x in n: rec(x)
        rec(pp.get('sidebarNavProps', {}))
        return dict(slug=slug, canon=canon, ok=True, md=md,
                    title=meta.get("pageTitle", ""), url=final,
                    imgs=set(pp.get("docAssetMetadata", {}) or {}),
                    nav=[u for u in nav if in_scope(u)])
    except Exception as e:
        return dict(slug=slug, ok=False, err=f"{type(e).__name__}: {e}")

def save(r):
    rel = r['canon'].strip('/')
    path = os.path.join(OUT, rel + ".md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    front = (f"---\ntitle: {json.dumps(r['title'], ensure_ascii=False)}\n"
             f"source: {r['url']}\nfetched: {time.strftime('%Y-%m-%d')}\n---\n\n")
    open(path, "w", encoding="utf-8").write(front + r['md'])
    return path

if __name__ == "__main__":
    todo = {l.strip().rstrip('/') for l in open(sys.argv[1]) if l.strip()}
    done, failed, imgs = {}, {}, set()
    rnd = 0
    while todo:
        rnd += 1
        batch = sorted(todo); todo = set()
        print(f"[第 {rnd} 轮] 抓 {len(batch)} 页 ...", flush=True)
        with ThreadPoolExecutor(max_workers=8) as ex:
            for r in ex.map(fetch, batch):
                if not r['ok']:
                    failed[r['slug']] = r['err']; continue
                c = r['canon']
                if c not in done:
                    done[c] = save(r); imgs |= r['imgs']
                for u in r['nav']:
                    if u not in done and u not in failed: todo.add(u)
        todo -= set(done) | set(failed)
        print(f"  累计 {len(done)} 页,新发现待抓 {len(todo)}", flush=True)
    print(f"\n完成:{len(done)} 页,失败 {len(failed)}")
    for k, v in failed.items(): print("  FAIL", k, v)
    open(os.path.join(OUT, ".images.txt"), "w").write("\n".join(sorted(imgs)))
    open(os.path.join(OUT, ".pages.txt"), "w").write("\n".join(sorted(done)))
    print("引用到的图片资源:", len(imgs))
