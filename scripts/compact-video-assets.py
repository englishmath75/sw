"""Keep lesson/player URLs; reuse byte-verified existing HLS segments on original Pages.

Only generated SW distribution files are changed. Source videos, playlists,
captions, posters, player code and lesson bodies remain in their repositories.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ORIGIN = 'https://englishmath75.github.io/pico-lab-classroom/'
GROUPS = {'learning-videos': 'learning-videos/', 'videos': 'pandas-data-lab/videos/'}


def fetch(url):
    with urllib.request.urlopen(url, timeout=45) as response:
        if response.status != 200 or response.headers.get('Access-Control-Allow-Origin') != '*':
            raise ValueError('Existing media is unavailable to the SW player: ' + url)
        data = response.read(16 * 1024 * 1024 + 1)
        if len(data) > 16 * 1024 * 1024:
            raise ValueError('Unexpected media sample size: ' + url)
        return data


def compact(root, source_sha, download=fetch):
    root = Path(root).resolve()
    plans, segments, checks = [], {}, {}
    for group, original in GROUPS.items():
        directory = root / group
        for playlist in sorted(directory.rglob('*.m3u8')):
            raw = playlist.read_bytes()
            text = raw.decode('utf-8')
            if not text.startswith('#EXTM3U') or 'URI=' in text:
                raise ValueError('Unsupported HLS playlist: ' + str(playlist))
            url = ORIGIN + original + playlist.relative_to(directory).as_posix()
            checks[url] = raw
            lines, samples = [], []
            for line in text.splitlines(keepends=True):
                value = line.strip()
                if not value or value.startswith('#'):
                    lines.append(line)
                    continue
                parsed = urlsplit(value)
                if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or value.startswith('/'):
                    raise ValueError('Expected original relative HLS segment: ' + value)
                segment = (playlist.parent / value).resolve()
                if not segment.is_relative_to(directory) or segment.suffix != '.ts' or not segment.is_file():
                    raise ValueError('Missing or unsafe HLS segment: ' + value)
                target = urljoin(url, value)
                data = segment.read_bytes()
                segments[segment] = {'path': segment.relative_to(root).as_posix(), 'url': target,
                                     'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                samples.append((target, data))
                lines.append(target + ('\r\n' if line.endswith('\r\n') else '\n' if line.endswith('\n') else ''))
            if not samples:
                raise ValueError('Empty HLS playlist: ' + str(playlist))
            for target, data in (samples[0], samples[-1]):
                checks[target] = data
            plans.append((playlist, ''.join(lines), url))
    if not plans:
        raise ValueError('No existing lesson playlists found')

    # Verify every original playlist and each first/last segment before changing any build file.
    def check(item):
        url, expected = item
        actual = download(url)
        if actual != expected:
            raise ValueError('Original media differs from pinned source; distribution unchanged: ' + url)
        return {'url': url, 'bytes': len(actual), 'sha256': hashlib.sha256(actual).hexdigest(), 'status': 'PASS'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        verified = list(pool.map(check, checks.items()))
    for playlist, text, _ in plans:
        playlist.write_text(text, encoding='utf-8', newline='')
    for segment in segments:
        segment.unlink()  # Generated distribution only; original video remains on its existing Pages URL.
    proof = {'sourceSha': source_sha, 'method': 'existing GitHub Pages HLS segment reuse',
             'originalOrigin': ORIGIN, 'playlists': [p.relative_to(root).as_posix() for p, _, _ in plans],
             'segments': list(segments.values()), 'verified': verified,
             'bytesReused': sum(s['bytes'] for s in segments.values()),
             'lessonBodiesChanged': False, 'sourceVideosChanged': False}
    (root / 'video-delivery.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'playlists': len(plans), 'segments': len(segments), 'remoteChecks': len(verified),
                      'bytesReused': proof['bytesReused'], 'status': 'PASS'}))
    return proof


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dist')
    parser.add_argument('--source-sha', required=True)
    args = parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}', args.source_sha):
        raise ValueError('Exact source SHA required')
    compact(args.dist, args.source_sha)
