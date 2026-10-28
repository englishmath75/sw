"""Publish the existing classroom at /sw/ without duplicating its source history."""
import argparse
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
    root.write_text(text)
    (dist / '.nojekyll').touch()
    (dist / 'site-version.json').write_text(json.dumps({'source_repository': 'englishmath75/pico-lab-classroom', 'source_sha': source_sha}, indent=2))
    # A useful 404, without silently redirecting misspelled lesson paths to the homepage.
    (dist / '404.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>페이지를 찾을 수 없습니다</title><h1>페이지를 찾을 수 없습니다</h1><p><a href="/sw/">수업 안내로 돌아가기</a></p></html>')
    print(f'Packaged {len(original_paths)} files; moved {len(course_paths)} course files to /sw/')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('dist')
    parser.add_argument('--source-sha', required=True)
    args = parser.parse_args()
    package(args.dist, args.source_sha)
