#!/usr/bin/env python3
"""下载 /docs/resources 下的图片,并把 markdown 里的绝对路径改成本地相对路径。"""
import os, re, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

OUT = "/Users/guzq/palantir-docs"
UA  = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

class _R(urllib.request.HTTPRedirectHandler):
    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_301(req, fp, 301, msg, headers)
_OPENER = urllib.request.build_opener(_R)

def local_of(ref):           # /docs/resources/a/b.png -> <OUT>/resources/a/b.png
    return os.path.join(OUT, ref[len("/docs/"):])

def dl(ref):
    path = local_of(ref)
    if os.path.exists(path) and os.path.getsize(path) > 0: return (ref, True, "cached")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    url = "https://www.palantir.com" + urllib.parse.quote(ref, safe="/@._-")
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with _OPENER.open(req, timeout=60) as r: data = r.read()
            open(path, "wb").write(data)
            return (ref, True, len(data))
        except Exception as e:
            if i == 2: return (ref, False, f"{type(e).__name__}: {e}")
            time.sleep(1.5 * (i + 1))

import urllib.parse
refs = [l.strip() for l in open(os.path.join(OUT, ".images.txt")) if l.strip().startswith("/docs/resources/")]
print(f"下载 {len(refs)} 个资源 ...", flush=True)
ok = bad = 0; missing = []
with ThreadPoolExecutor(max_workers=10) as ex:
    for ref, good, info in ex.map(dl, refs):
        if good: ok += 1
        else: bad += 1; missing.append((ref, info))
print(f"  成功 {ok},失败 {bad}")
for r, i in missing[:15]: print("   MISS", r, i)

# ---- 改写 markdown 里的路径 ----
# 两种形态:① markdown 图片写绝对路径 /docs/resources/...
#           ② HTML <img src="./media/X"> —— 站点按 assetRoot/productId/context 解析,
#              即 /docs/resources/foundry/<所在目录>/X。漏了它会让 437 处 <img> 全断。
ASSET = re.compile(r'(?<=[\(\s"\'])/docs/resources/([A-Za-z0-9_@./-]+)')
MEDIA = re.compile(r'(<img[^>]*?\ssrc\s*=\s*["\'])(?:\./media/|media/)([^"\']+)(["\'])')
changed = tot = 0
for root, _, files in os.walk(OUT):
    if os.sep + "resources" in root + os.sep: continue
    for fn in files:
        if not fn.endswith(".md"): continue
        p = os.path.join(root, fn)
        s = open(p, encoding="utf-8").read()
        depth = os.path.relpath(p, OUT).count(os.sep)
        prefix = "../" * depth if depth else "./"
        new, n = ASSET.subn(lambda m: prefix + "resources/" + m.group(1), s)
        ctx = os.path.basename(root)
        new, n2 = MEDIA.subn(
            lambda m: m.group(1) + prefix + "resources/foundry/" + ctx + "/" + m.group(2) + m.group(3), new)
        n += n2
        tot += n
        if n: open(p, "w", encoding="utf-8").write(new); changed += 1
print(f"改写 {changed} 个 md 文件里的 {tot} 处图片路径")
