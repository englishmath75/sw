"""Verify existing video origin against the pinned Git blob identities, without changing it."""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import PurePosixPath, Path
from urllib.request import urlopen

parser = argparse.ArgumentParser()
parser.add_argument('source_repository')
parser.add_argument('output')
args = parser.parse_args()
repo = Path(args.source_repository)
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
entries = subprocess.check_output(['git', 'ls-tree', '-r', 'HEAD', 'public/learning-videos', 'public/pandas-data-lab/videos'], cwd=repo, text=True).splitlines()
blobs = {line.split('\t', 1)[1]: line.split()[2] for line in entries}
origin = 'https://englishmath75.github.io/pico-lab-classroom/'


def verify(path):
    url = origin + path.removeprefix('public/')
    with urlopen(url, timeout=45) as r:
        assert r.status == 200 and r.headers.get('Access-Control-Allow-Origin') == '*', url
        data = r.read(16 * 1024 * 1024 + 1)
    blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    assert blob == blobs[path], 'Source mismatch: ' + path
    print('PASS', path, flush=True)
    return data, {'path': path, 'url': url, 'gitBlob': blob, 'bytes': len(data), 'status': 'PASS'}


playlists = sorted(p for p in blobs if p.endswith('.m3u8'))
results, samples = [], set()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for path, (data, result) in zip(playlists, pool.map(verify, playlists)):
        results.append(result)
        segments = [x.strip() for x in data.decode().splitlines() if x.strip() and not x.startswith('#')]
        for item in (segments[0], segments[-1]):
            sample = str(PurePosixPath(path).parent / item)
            assert sample in blobs, sample
            samples.add(sample)
    for _, result in pool.map(verify, sorted(samples)):
        results.append(result)
Path(args.output).write_text(json.dumps({'sourceSha': source, 'originalOrigin': origin, 'checks': results, 'status': 'PASS'}, ensure_ascii=False, indent=2) + '\n')
print('Verified', len(results), 'original media assets against pinned source')
