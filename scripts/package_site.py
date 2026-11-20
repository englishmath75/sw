"""Publish the existing classroom at sw.englishmath.kr/ without duplicating its source history."""
import argparse
import hashlib
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ORIGIN = 'https://englishmath75.github.io'
BASE = '/sw/'
OLD = '/pico-lab-classroom/'
COURSE = 'pandas-data-lab/'
TEXT = {'.html', '.js', '.css', '.json', '.txt', '.md', '.py', '.vtt', '.svg', '.xml'}


MATERIALS_PAGE = '''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="창원 기온 데이터 분석 영상과 KOSIS 통계 자료를 모은 수업 자료실">
<title>03. 실습 자료 | 영수쌤의 파이썬 교실</title>
<style>
:root{color-scheme:light;--ink:#17384a;--muted:#607889;--teal:#087c81;--line:#dce7ed}
*{box-sizing:border-box}body{margin:0;background:#f3f7fb;color:var(--ink);font:16px/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif}
.materials{width:100%;max-width:1220px;margin:0 auto;padding:24px clamp(16px,3.6vw,48px) 36px}
.materials-header{margin-bottom:24px}.eyebrow{display:block;color:var(--teal);font-size:13px;font-weight:800;letter-spacing:.04em}
h1{margin:6px 0 8px;font-size:clamp(27px,3.6vw,36px);line-height:1.35;letter-spacing:-.04em}
.materials-header p{margin:0;color:var(--muted)}
.resources{display:grid;gap:20px}.resource{display:grid;text-decoration:none;color:inherit;border-radius:24px;overflow:hidden;transition:box-shadow .18s ease,transform .18s ease}
.resource:focus-visible{outline:3px solid #d89521;outline-offset:5px}.resource:hover{transform:translateY(-2px);box-shadow:0 12px 28px #17384a16}
.weather{grid-template-columns:minmax(0,1.4fr) minmax(220px,.8fr);background:linear-gradient(120deg,#14394d 0%,#155565 64%,#137c80 100%);color:#fff;border:1px solid #1b6570;padding:clamp(26px,3.3vw,40px);gap:32px;align-items:center}
.resource-tag{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:750;padding:5px 12px;border-radius:100px;background:#ffffff18;color:#d5f6f4;border:1px solid #ffffff24}
.weather h2{margin:17px 0 13px;font-size:clamp(25px,3vw,33px);line-height:1.4;letter-spacing:-.035em;word-break:keep-all}
.weather p{margin:0;max-width:630px;color:#dfedef;word-break:keep-all}
.topics{display:flex;flex-wrap:wrap;gap:7px;margin:20px 0 25px;padding:0;list-style:none}.topics li{padding:4px 10px;border:1px solid #ffffff26;border-radius:8px;font-size:13px;color:#e6f6f5}
.action{display:inline-flex;align-items:center;justify-content:center;gap:13px;min-height:48px;padding:11px 18px;border-radius:11px;background:#fff;color:#145361;font-weight:800;line-height:1.5}
.video-art{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;min-height:220px;border:1px solid #ffffff2b;border-radius:19px;background:#ffffff0c;padding:24px;text-align:center}
.play{display:grid;place-items:center;width:78px;height:78px;border:1px solid #ffffff62;border-radius:50%;background:#ffffff14}.play svg{width:28px;height:28px;margin-left:4px;fill:#fff}
.video-art strong{font-size:18px;letter-spacing:.02em}.video-art small{color:#d4ecee;font-size:13px}
.portal{grid-template-columns:70px minmax(0,1fr) auto;align-items:center;gap:23px;padding:clamp(24px,3vw,34px);background:#fff;border:1px solid var(--line);box-shadow:0 3px 15px #17384a05}
.csv-icon{display:grid;place-items:center;width:70px;height:78px;background:#eaf5f4;color:#137b7d;border:1px solid #d1e9e5;border-radius:14px;font-size:18px;font-weight:850;letter-spacing:.04em}
.portal .eyebrow{font-size:12px}.portal h2{margin:3px 0 8px;font-size:23px;line-height:1.45;letter-spacing:-.03em}.portal p{margin:0;color:var(--muted);font-size:15px;word-break:keep-all}
.portal .action{background:#eaf5f4;color:#126a70;white-space:nowrap}.new-tab{display:block;margin-top:8px;color:#718692;font-size:12px}
@media(max-width:850px){.weather{grid-template-columns:minmax(0,1fr)}.video-art{display:none}.portal{grid-template-columns:58px minmax(0,1fr);gap:17px}.csv-icon{width:58px;height:66px;font-size:16px}.portal-cta{grid-column:2}.portal .action{white-space:normal}}
@media(max-width:520px){.materials{padding:18px 12px 28px}.materials-header{margin-bottom:19px}.materials-header p{font-size:15px}.resources{gap:16px}.resource{border-radius:18px}.weather{padding:24px 20px;gap:0}.weather h2{font-size:26px}.weather p{font-size:15px}.topics{margin:18px 0 22px;gap:6px}.weather .action{width:100%;font-size:15px;padding:12px}.portal{padding:23px 20px;grid-template-columns:minmax(0,1fr);gap:13px}.csv-icon{width:52px;height:55px;border-radius:11px;font-size:14px}.portal h2{font-size:22px}.portal-cta{grid-column:1}.portal .action{width:100%;font-size:15px}.new-tab{text-align:center}}
@media(prefers-reduced-motion:reduce){.resource{transition:none}.resource:hover{transform:none}}
</style>
<script src="__BRIDGE_SRC__"></script></head>
<body><main class="materials" id="main" data-materials-version="20261121-two-resources">
<header class="materials-header"><span class="eyebrow">소프트웨어와 생활 · 데이터 분석</span>
<h1>03. 실습 자료</h1><p>분석 과정을 영상으로 익히고, 실습에 필요한 통계 자료를 찾아보세요.</p></header>
<div class="resources">
<a class="resource weather" href="/changwon-weather.html" target="_top" aria-labelledby="weather-title" aria-describedby="weather-description">
<div><span class="resource-tag">수업 영상 · 단계별 실습</span><h2 id="weather-title">창원 기온 데이터 분석</h2>
<p id="weather-description">2024년 6월, 창원은 얼마나 더웠을까요?<br>CSV 자료를 내려받는 과정부터 VS Code로 분석하고 그래프를 완성하는 과정을 따라갑니다.</p>
<ul class="topics" aria-label="실습 내용"><li>CSV 내려받기</li><li>결측치 처리</li><li>기간 선택</li><li>그래프 그리기</li></ul>
<span class="action">영상과 단계별 실습 보기 <span aria-hidden="true">→</span></span></div>
<div class="video-art" aria-hidden="true"><span class="play"><svg viewBox="0 0 24 24"><path d="M7 3.8v16.4L20 12z"/></svg></span><strong>2024. 06 · 창원</strong><small>자료 수집부터 그래프 완성까지</small></div></a>
<a class="resource portal" href="https://kosis.kr/" target="_blank" rel="noopener noreferrer" aria-labelledby="kosis-title" aria-describedby="kosis-description kosis-new-tab">
<div class="csv-icon" aria-hidden="true">CSV</div><div><span class="eyebrow">통계 자료 다운로드</span><h2 id="kosis-title">KOSIS 국가통계포털</h2>
<p id="kosis-description">분석에 필요한 통계표를 찾고, 지역과 기간을 선택하여 CSV 자료로 내려받으세요.</p></div>
<div class="portal-cta"><span class="action">국가통계포털 열기 <span aria-hidden="true">↗</span></span><span class="new-tab" id="kosis-new-tab">새 창에서 열립니다</span></div></a>
</div></main></body></html>'''


def package_practice_materials(dist):
    """Give the read-only materials route its own page; keep legacy labs intact."""
    shell = (dist / 'index.html').read_text(encoding='utf-8')
    legacy = (dist / 'sw-content' / 'index.html').read_text(encoding='utf-8')
    app_sources = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']*/sw-assets/app(?:\.[^"\']+)?\.js(?:\?[^"\']*)?)["\']', shell)
    bridge_sources = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']*/sw-assets/legacy-bridge[^"\']+)["\']', legacy)
    if len(app_sources) != 1 or len(bridge_sources) != 1:
        raise ValueError('Expected one SW shell app and one existing frame bridge')
    old_name = Path(urlsplit(app_sources[0]).path).name
    app_path = dist / 'sw-assets' / old_name
    script = app_path.read_text(encoding='utf-8')
    # The approved bundle has one data route. Preserve its label, frame factory,
    # all other routes, authentication, and the free lab's existing storage IDs.
    route = r'\bdata:([\w$]+)\(("(?:[^"\\]|\\.)*"),"index\.html","mixed",\["sw2-free-code","sw2-free-state"\]\)'
    script, count = re.subn(route, lambda m: 'data:' + m[1] + '(' + m[2] + ',"materials.html")', script)
    if count != 1:
        raise ValueError(f'Expected one original materials route; found {count}')
    new_name = 'app.' + hashlib.sha256(script.encode('utf-8')).hexdigest()[:12] + '.js'
    (dist / 'sw-assets' / new_name).write_text(script, encoding='utf-8')
    for page in dist.rglob('*.html'):
        text = page.read_text(encoding='utf-8')
        updated = text.replace('/sw-assets/' + old_name, '/sw-assets/' + new_name)
        # Keep the homepage shortcut accurate after removing its CSV preview UI.
        updated = updated.replace('실습 자료<small>CSV · 예제 확인</small>',
                                  '실습 자료<small>수업 영상 · 통계 자료</small>')
        if updated != text:
            page.write_text(updated, encoding='utf-8')
    document = MATERIALS_PAGE.replace('__BRIDGE_SRC__', html.escape(bridge_sources[0], quote=True))
    (dist / 'sw-content' / 'materials.html').write_text(document, encoding='utf-8')
    (dist / 'materials.html').write_text((dist / 'index.html').read_text(encoding='utf-8'), encoding='utf-8')
    print('PACKAGED practice materials: weather lesson and KOSIS links only', flush=True)


def mapped_path(path):
    if path.startswith(OLD):
        path = BASE + path[len(OLD):]
    if not path.startswith(BASE):
        return path
    rest = path[len(BASE):]
    if rest.startswith(COURSE):
        return BASE + rest[len(COURSE):]
    if rest in ('', 'index.html'):
        return BASE + 'pico.html'
    return path


def mapped_url(value, original_path):
    value = html.unescape(value)
    if not value or value.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:')):
        return value
    resolved = urlsplit(urljoin(ORIGIN + BASE + original_path, html.unescape(value)))
    if resolved.netloc != 'englishmath75.github.io':
        return value
    new_path = mapped_path(resolved.path)
    if new_path == resolved.path and not resolved.path.startswith(BASE):
        return value
    return urlunsplit(('', '', new_path, resolved.query, resolved.fragment))


def redirect_page(target):
    # Never interpret a query parameter as a destination. Preserve existing lesson/page state.
    return ('<!doctype html><html lang="ko"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>새 수업 주소로 이동</title><script>'
            f'location.replace({json.dumps(target)}+location.search+location.hash);'
            '</script><body><p>수업 주소가 짧아졌습니다.</p>'
            f'<a href="{html.escape(target, quote=True)}">새 수업 페이지 열기</a></body></html>')


def package(dist, source_sha):
    dist = Path(dist)
    course = dist / COURSE
    if not (course / 'index.html').is_file() or not (dist / 'index.html').is_file():
        raise ValueError('Both the existing PICO app and Pandas homepage are required')
    original_paths = [p.relative_to(dist).as_posix() for p in dist.rglob('*') if p.is_file()]
    course_paths = [p for p in original_paths if p.startswith(COURSE)]
    # Convert HTML links using their OLD document location before moving files.
    for rel in original_paths:
        p = dist / rel
        if p.suffix not in TEXT:
            continue
        text = p.read_text(encoding='utf-8-sig')
        if p.suffix == '.html':
            text = re.sub(r'\b(href|src|poster)\s*=\s*([\"\'])(.*?)\2',
                          lambda m: m[1] + '=' + m[2] + html.escape(mapped_url(m[3], rel), quote=True) + m[2],
                          text, flags=re.I | re.S)
        # Literal public URLs in descriptions, generated links and downloadable examples.
        text = text.replace(ORIGIN + OLD + COURSE, ORIGIN + BASE)
        text = text.replace(OLD + COURSE, BASE)
        text = text.replace(ORIGIN + OLD, ORIGIN + BASE)
        text = text.replace(OLD, BASE)
        text = text.replace(BASE + COURSE, BASE)
        if rel.startswith(COURSE):
            text = text.replace('../learning-videos/', BASE + 'learning-videos/')
        p.write_text(text, encoding='utf-8')
    (dist / 'index.html').rename(dist / 'pico.html')
    for child in list(course.rglob('*')):
        if not child.is_file():
            continue
        target = dist / child.relative_to(course)
        if target.exists() and target.read_bytes() != child.read_bytes():
            raise ValueError(f'Flattening would overwrite an unrelated asset: {target}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(child), str(target))
    shutil.rmtree(course)
    # Keep every formerly published HTML path usable under the new repository too.
    for rel in course_paths:
        if not rel.endswith('.html'):
            continue
        alias = dist / rel
        alias.parent.mkdir(parents=True, exist_ok=True)
        alias.write_text(redirect_page(BASE + rel[len(COURSE):]), encoding='utf-8')
    root = dist / 'index.html'
    text = root.read_text()
    router = '<script>if(new URLSearchParams(location.search).has("view")){location.replace("/sw/pico.html"+location.search+location.hash);}</script>'
    text = text.replace('<head>', '<head>' + router, 1)
    integrated = 'data-sw-integrated="2"' in text
    if integrated:
        for expected in ('data-route="data-lab"', '데이터 시각화 실험실'):
            if expected not in text:
                raise ValueError('Integrated menu missing: ' + expected)
        if 'englishmath-python.vercel.app' in text or 'sw-external' in text:
            raise ValueError('Integrated menu must not include the retired external classroom link')
    else:
        # Add an independent, anonymous lab without changing school authentication or records.
        lab_url = 'https://englishmath-python.vercel.app/data-lab'
        lab_link = ('<a class="nav" href="' + lab_url + '" target="_blank" rel="noopener noreferrer">'
                    '새 데이터 분석 시각화 실험실 ↗</a>')
        lab_notice = ('<p class="notice">새 시각화 실험실은 로그인 없이 체험하는 별도 기능입니다. '
                      '코드는 이 브라우저에 임시 저장되며, 기존 Google 로그인·Firebase 클라우드 저장 및 학생 학습 기록과 연결되지 않습니다. '
                      '공용 PC에서는 사용 후 저장본을 지우고 필요한 코드는 파일로 내려받으세요.</p>')
        nav_start = '<nav aria-label="수업 메뉴">'
        if nav_start not in text:
            raise ValueError('Expected course navigation is missing; preserve existing homepage')
        text = text.replace(nav_start, nav_start + lab_link, 1)
        text = text.replace('<section class="page" id="home">', '<section class="page" id="home">' + lab_notice, 1)
    if integrated:
        weather_link = '<a class="nav" href="/changwon-weather.html">창원 기온 분석 · 실습 영상</a>'
        text = re.sub(r'(<a\\b[^>]*data-route="data"[^>]*>.*?</a>)', lambda m: m[0] + weather_link, text, count=1, flags=re.S)
        guide = Path(__file__).resolve().parents[1] / 'lessons' / 'changwon-weather.html'
        shutil.copyfile(guide, dist / 'changwon-weather.html')
        data_frame = dist / 'sw-content' / 'index.html'
        frame_html = data_frame.read_text(encoding='utf-8')
        snack_card = r'(<section[^>]*id="data"[^>]*>\s*)<div class="panel"><h3>처음부터 끝까지 · 축제 간식 분석</h3>.*?</div>'
        weather_card = ('<div class="panel"><h3>창원 기온 데이터 분석</h3>'
                        '<p>기상청에서 2024년 6월 창원 기온 CSV를 내려받고, VS Code에서 '
                        '결측치 처리부터 기간별 기온 그래프 그리기까지 실습합니다.</p>'
                        '<a class="btn primary" href="/changwon-weather.html" target="_top">'
                        '영상과 단계별 실습 보기 →</a></div>')
        frame_html, count = re.subn(snack_card, lambda match: match[1] + weather_card,
                                    frame_html, count=1, flags=re.S)
        if count != 1:
            raise ValueError('Expected first practice materials card in SW content')
        data_frame.write_text(frame_html, encoding='utf-8')
    root.write_text(text)
    (dist / '.nojekyll').touch()
    (dist / 'site-version.json').write_text(json.dumps({'source_repository': 'englishmath75/pico-lab-classroom', 'source_sha': source_sha}, indent=2))
    # A useful 404, without silently redirecting misspelled lesson paths to the homepage.
    (dist / '404.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>페이지를 찾을 수 없습니다</title><h1>페이지를 찾을 수 없습니다</h1><p><a href="/sw/">수업 안내로 돌아가기</a></p></html>')
    # The existing mapping first flattens the course; publish that result at
    # the custom-domain root, including Vite chunks and runtime-generated URLs.
    for p in dist.rglob('*'):
        if p.is_file() and p.suffix in TEXT:
            text = p.read_text(encoding='utf-8')
            text = text.replace(ORIGIN + BASE, 'https://sw.englishmath.kr/')
            text = text.replace(BASE, '/')
            if integrated and p.suffix == '.html':
                text = text.replace('CSV 내용 (편집 가능, 브라우저에만 보관)', 'CSV 내용 (교재 가상 자료는 계정 저장 · 직접 선택한 파일은 현재 탭에서만 사용)')
            p.write_text(text, encoding='utf-8')
    if integrated:
        package_practice_materials(dist)
    (dist / 'CNAME').write_text('sw.englishmath.kr\n')
    print(f'Packaged {len(original_paths)} files at https://sw.englishmath.kr/')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('dist')
    parser.add_argument('--source-sha', required=True)
    args = parser.parse_args()
    package(args.dist, args.source_sha)

