"""Finalize the SW-only sidebar label and verify the public deployment."""
import argparse
import html
import json
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen

LABEL = '고2 | 소프트웨어와 생활'
UNIT = re.compile(r'(<span\s+class=[\"\']classroom-unit[\"\']>)(.*?)(</span>)', re.S)
CSS_LINK = re.compile(r'(classroom-brand\.css)(?:\?[^\"\'\s<>]*)?')
CSS_RULE = re.compile(r'\.classroom-page\s+\.side\s+\.brand\.brand-mk-aligned\s+\.classroom-unit\s*\{([^}]*)\}')
PUBLIC = 'https://sw.englishmath.kr/'
PAGES = ('', '?page=home', 'step-by-step.html?lesson=1', '?page=data', '?page=exam', '?page=report', 'ai-avatar.html')


def verify_css(css):
    # The first rule is the desktop/default rule, not the mobile override.
    match = CSS_RULE.search(css.split('@media', 1)[0])
    if not match or not re.search(r'(?:^|;)\s*font-size\s*:\s*16px\s*(?:;|$)', match[1]):
        raise ValueError('Desktop course label must be 16px, outside @media')
    if 'white-space:nowrap' not in match[1].replace(' ', ''):
        raise ValueError('Course label must remain on one line')


def verify_avatar(text):
    sidebar = re.search(r'<aside\b[^>]*>(.*?)</aside>', text, re.S)
    if not sidebar:
        raise ValueError('Avatar sidebar is missing')
    sidebar = sidebar[1]
    links = re.findall(r'<a\b[^>]*href=[\"\'][^\"\']*ai-avatar\.html[^\"\']*[\"\'][^>]*>.*?</a>', sidebar, re.S)
    if len(links) != 1:
        raise ValueError('Expected exactly one avatar navigation card')
    card = links[0]
    if not all(token in card for token in ('avatar-nav', 'avatar-extra', '추가 체험', 'aria-current="page"')):
        raise ValueError('Avatar must use the current pink extra-activity card')
    if sidebar.index(card) > sidebar.index('00. Python 핵심 복습'):
        raise ValueError('Extra activity must precede the numbered lessons')
    if 'brand-mk-aligned' not in sidebar or LABEL not in sidebar:
        raise ValueError('Avatar must reuse the current classroom identity')
    if 'data-sw-integrated="2"' in text:
        if 'data-route="data-lab"' not in sidebar:
            raise ValueError('Internal data-lab shortcut is missing')
        if 'englishmath-python.vercel.app' in sidebar or 'sw-external' in sidebar:
            raise ValueError('Retired external classroom link remains')
    elif 'https://englishmath-python.vercel.app/data-lab' not in sidebar:
        raise ValueError('Preserved baseline data-lab shortcut is missing')


def finalize(dist, source_sha):
    dist = Path(dist)
    verify_css((dist / 'classroom-brand.css').read_text(encoding='utf-8'))
    for name in ('index.html', 'step-by-step.html', 'ai-avatar.html'):
        path = dist / name
        text = path.read_text(encoding='utf-8')
        matches = list(UNIT.finditer(text))
        if len(matches) != 1 or 'brand-mk-aligned' not in text:
            raise ValueError(f'{name}: expected exactly one existing SW sidebar label')
        text = UNIT.sub(lambda m: m[1] + LABEL + m[3], text)
        text, count = CSS_LINK.subn(lambda m: m[1] + '?v=' + source_sha[:12], text)
        if count != 1:
            raise ValueError(f'{name}: expected one shared brand stylesheet')
        if name == 'ai-avatar.html':
            verify_avatar(text)
        path.write_text(text, encoding='utf-8')
        print(f'PACKAGED {name}: {LABEL}; desktop=16px; css={source_sha[:12]}', flush=True)


def fetch(path, source_sha):
    separator = '&' if '?' in path else '?'
    request = Request(PUBLIC + path + separator + 'verify=' + source_sha[:12],
                      headers={'Cache-Control': 'no-cache', 'User-Agent': 'SW-Publish-Verification/1.0'})
    with urlopen(request, timeout=20) as response:
        return response.read().decode('utf-8-sig')


def verify_live(source_sha):
    deadline = time.monotonic() + 180
    while True:
        try:
            version = json.loads(fetch('site-version.json', source_sha))
            if version.get('source_sha') != source_sha:
                raise ValueError('New source version has not reached the public domain yet')
            verify_css(fetch('classroom-brand.css?v=' + source_sha[:12], source_sha))
            evidence = []
            for route in PAGES:
                text = fetch(route, source_sha)
                match = UNIT.search(text)
                if not match or html.unescape(match[2]).strip() != LABEL:
                    raise ValueError(f'{route}: new sidebar label is not publicly available')
                if 'classroom-brand.css?v=' + source_sha[:12] not in text:
                    raise ValueError(f'{route}: outdated stylesheet link')
                entry = {'url': PUBLIC + route, 'label': LABEL, 'desktop_font_px': 16}
                if route == 'ai-avatar.html':
                    verify_avatar(text)
                    entry.update(pink_extra_activity=True, duplicate_avatar_links=0, lesson_order='extra before 00')
                evidence.append(entry)
            print(json.dumps({'result': 'PASS', 'source_sha': source_sha, 'pages': evidence}, ensure_ascii=False, indent=2), flush=True)
            return
        except Exception as error:
            if time.monotonic() >= deadline:
                raise
            print(f'Waiting for Pages propagation: {error}', flush=True)
            time.sleep(10)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-sha', required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dist')
    mode.add_argument('--live', action='store_true')
    args = parser.parse_args()
    if args.live:
        verify_live(args.source_sha)
    else:
        finalize(args.dist, args.source_sha)
