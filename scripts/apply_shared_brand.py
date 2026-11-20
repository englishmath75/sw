"""Package the exact approved PY logo without changing the pinned SW lessons."""
from pathlib import Path
import hashlib
import re
import shutil

VERSION = '20261121-py-original'
ASSETS = Path(__file__).resolve().parent.parent / 'brand'
LOGO_URL = '/brand/englishmath-primary.svg'
LOGO_ALT = 'englishmath · AI · SW &amp; FUTURE EDUCATION · by EM'
IMG = re.compile(r'<img\b[^>]*\bsrc=[\"\'][^\"\']*englishmath-logo\.png(?:\?[^\"\']*)?[\"\'][^>]*>', re.I)
LINK = '<link rel="stylesheet" href="/brand/englishmath-brand.css?v=' + VERSION + '">'


def replace_logo(match):
    tag = match[0]
    tag = re.sub(r'\bsrc=([\"\']).*?\1', 'src="' + LOGO_URL + '"', tag)
    tag = re.sub(r'\balt=([\"\']).*?\1', '', tag)
    if re.search(r'\bclass=', tag):
        tag = re.sub(r'\bclass=([\"\'])(.*?)\1', lambda m: 'class="' + m[2] + ' englishmath-brand-logo"', tag)
    else:
        tag = tag.replace('<img', '<img class="englishmath-brand-logo"', 1)
    return tag.replace('<img', '<img alt="' + LOGO_ALT + '"', 1)


def apply_shared_brand(dist):
    dist = Path(dist)
    target = dist / 'brand'
    target.mkdir(exist_ok=True)
    for name in ('englishmath-primary.svg', 'englishmath-brand.css'):
        shutil.copyfile(ASSETS / name, target / name)
    changed = []
    for page in dist.rglob('*.html'):
        original = page.read_text(encoding='utf-8')
        text, count = IMG.subn(replace_logo, original)
        if not count:
            continue
        if '</head>' not in text:
            raise ValueError(f'Logo page missing head: {page}')
        if LINK not in text:
            text = text.replace('</head>', LINK + '</head>', 1)
        page.write_text(text, encoding='utf-8')
        changed.append(str(page.relative_to(dist)))
    if 'index.html' not in changed:
        raise ValueError('Expected the SW homepage logo to be replaced')
    print(f'PY original logo applied to {len(changed)} SW documents; sha256=' + hashlib.sha256((target / 'englishmath-primary.svg').read_bytes()).hexdigest(), flush=True)
    return changed
