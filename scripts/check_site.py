"""Check local HTML links and all lesson-video catalog files after URL migration."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

root = Path(sys.argv[1]).resolve()

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src', 'poster') and value:
                self.links.append(value)

errors = []
checked = 0
for page in root.rglob('*.html'):
    parser = Links(); parser.feed(page.read_text(encoding='utf-8-sig'))
    for link in parser.links:
        u = urlsplit(link)
        if u.scheme or u.netloc or not u.path or u.path.startswith('data:'):
            continue
        if u.path.startswith('/sw/'):
            target = root / unquote(u.path[len('/sw/'):])
        elif u.path.startswith('/'):
            continue  # Other sites on the same account are outside this deployment.
        else:
            target = page.parent / unquote(u.path)
        if target.is_dir():
            target /= 'index.html'
        if not target.exists():
            errors.append(f'{page.relative_to(root)} -> {link}')
        checked += 1

for name in ('index.html', 'step-by-step.html', 'first-analysis.html', 'pico.html', 'python-review.html', 'video-player.html', 'learning-videos/hls.min.js'):
    assert (root / name).is_file(), name
assert '전체체험' in (root / 'index.html').read_text()
assert 'experience-link' in (root / 'index.html').read_text()
catalog = json.loads((root / 'lesson-videos.json').read_text())

def check_media(value):
    if isinstance(value, dict):
        for item in value.values(): check_media(item)
    elif isinstance(value, list):
        for item in value: check_media(item)
    elif isinstance(value, str) and value.startswith('./'):
        assert (root / value[2:]).exists(), f'Missing catalog asset: {value}'

check_media(catalog)
if errors:
    print('\n'.join(errors))
    raise SystemExit(f'{len(errors)} broken HTML links')
print(f'PASS: {checked} internal links; course entry points; all video catalog assets')
