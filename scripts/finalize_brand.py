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
TRACE_STYLE = '<style id="sw-output-contrast">#sw-view .sw-trace pre{color:#17384a;background:#edf5f7;font-size:15px;line-height:1.6}</style>'


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



# Publisher-only hotfix. The validated SW source SHA and school data stay untouched.
SW_MOBILE_LAYOUT_FIX = "\n/* Mobile course menu fix, packaged on the pinned SW release only.\n   The open nav must be a single vertical flow: a two-column nav with\n   two-column group children caused four narrow text columns on phones. */\n@media (max-width: 900px) {\n  .sw-shell .side.sw-menu-open > nav {\n    display: block !important;\n    width: 100%;\n    min-width: 0;\n  }\n  .sw-shell .side .sw-menu-group {\n    display: block;\n    width: 100%;\n    min-width: 0;\n    margin: 12px 0 0;\n    padding: 12px 0 0;\n  }\n  .sw-shell .side .sw-menu-group h2 {\n    font-size: 15px;\n    line-height: 1.5;\n    margin: 0 0 8px;\n  }\n  .sw-shell .side .sw-menu-items {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    gap: 7px;\n    min-width: 0;\n  }\n  .sw-shell .side .sw-menu-items > .nav {\n    display: flex;\n    justify-content: flex-start;\n    align-items: center;\n    min-width: 0;\n    min-height: 44px;\n    width: 100%;\n    margin: 0;\n    padding: 10px 12px;\n    font-size: 15px;\n    line-height: 1.55;\n    text-align: left;\n    white-space: normal !important;\n    word-break: keep-all;\n    overflow-wrap: break-word;\n    border-radius: 10px;\n  }\n  .sw-shell .side .nav.avatar-nav {\n    display: flex;\n    flex-wrap: wrap;\n    width: 100%;\n    min-width: 0;\n    margin: 10px 0 6px;\n    padding: 12px;\n    line-height: 1.5;\n    white-space: normal !important;\n    word-break: keep-all;\n    text-align: center;\n  }\n  .sw-shell .side .brand.brand-mk-aligned .classroom-name,\n  .sw-shell .side .brand.brand-mk-aligned .classroom-unit,\n  .sw-shell .side .brand.brand-mk-aligned .classroom-subject {\n    max-width: 100%;\n    white-space: normal !important;\n    word-break: keep-all;\n    overflow-wrap: break-word;\n  }\n  .sw-shell .side .brand.brand-mk-aligned .classroom-subject {\n    font-size: 13px;\n    line-height: 1.55;\n    text-align: center;\n  }\n  .sw-shell .sw-main {\n    width: 100%;\n    min-width: 0;\n    padding: 14px !important;\n  }\n  .sw-shell .sw-account {\n    min-width: 0;\n    gap: 9px;\n  }\n  .sw-shell .sw-account > button,\n  .sw-shell .sw-account > .btn {\n    max-width: 100%;\n    min-height: 44px;\n    white-space: normal;\n  }\n}\n@media (max-width: 600px) {\n  .sw-shell .side {\n    padding: 14px 16px 16px;\n  }\n  .sw-shell .side .brand.brand-mk-aligned {\n    padding-bottom: 12px;\n    margin: 0 0 8px;\n  }\n  .sw-shell .side .brand.brand-mk-aligned img {\n    width: 88px;\n    max-width: 88px;\n    margin: 0 auto 6px;\n  }\n  .sw-shell .side .brand.brand-mk-aligned .classroom-name {\n    font-size: clamp(19px, 5.5vw, 23px);\n    line-height: 1.35;\n    margin: 2px 0;\n  }\n  .sw-shell .side .brand.brand-mk-aligned .classroom-unit {\n    font-size: 16px !important;\n    line-height: 1.45;\n    margin: 2px 0;\n  }\n  .sw-shell .side .brand.brand-mk-aligned .classroom-subject {\n    font-size: 12px;\n  }\n  .sw-shell .side #sw-mobile-menu {\n    width: 100%;\n    min-height: 48px;\n    margin: 12px 0 0;\n    font-size: 16px;\n  }\n  .sw-shell .side .sw-menu-items {\n    grid-template-columns: minmax(0, 1fr) !important;\n    gap: 6px;\n  }\n  .sw-shell .side .sw-menu-items > .nav {\n    font-size: 16px;\n    padding: 11px 14px;\n  }\n  .sw-shell .side .nav.avatar-nav {\n    justify-content: center;\n    gap: 8px;\n  }\n  .sw-shell .sw-main {\n    padding: 12px !important;\n  }\n  .sw-shell .sw-account {\n    padding: 12px;\n  }\n}\n"
MOBILE_STYLE_VERSION = '20261107-mobile-menu-fix1'


def apply_sw_mobile_layout(dist):
    """Repair the integrated SW mobile menu without changing the pinned source."""
    sheet = dist / 'sw-assets' / 'site.css'
    if not sheet.is_file():
        return  # Baseline releases have no integrated SW application.
    current = sheet.read_text(encoding='utf-8')
    if 'Mobile course menu fix, packaged on the pinned SW release only.' not in current:
        sheet.write_text(current + '\n' + SW_MOBILE_LAYOUT_FIX + '\n', encoding='utf-8')
    # Cache-bust the original CSS URL across all integrated classroom routes.
    count = 0
    for page in dist.rglob('*.html'):
        original = page.read_text(encoding='utf-8')
        revised = re.sub(
            r'(sw-assets/site\.css)(?:\?[^"\'<>\s]*)?',
            lambda m: m[1] + '?v=' + MOBILE_STYLE_VERSION,
            original,
        )
        if revised != original:
            page.write_text(revised, encoding='utf-8')
            count += 1
    if count < 3:
        raise ValueError('Integrated SW mobile styles must be linked by all classroom routes')
    print(f'PACKAGED SW mobile menu repair: {count} HTML routes', flush=True)



def finalize(dist, source_sha):
    dist = Path(dist)
    verify_css((dist / 'classroom-brand.css').read_text(encoding='utf-8'))
    apply_sw_mobile_layout(dist)
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
        if name == 'index.html' and 'data-sw-integrated="2"' in text:
            # Pair foreground/background: the data-lab theme otherwise leaves
            # pale console text on the shell's pale pre background.
            text = re.sub(r'<style id="sw-output-contrast">.*?</style>', '', text, flags=re.S)
            if text.count('</head>') != 1:
                raise ValueError('Expected one SW shell head for output contrast')
            text = text.replace('</head>', TRACE_STYLE + '</head>')
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
