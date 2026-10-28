import json
import tempfile
import unittest
from pathlib import Path
from package_site import mapped_url, package


class MigrationTests(unittest.TestCase):
    def test_mapping(self):
        for value, page, expected in [
            ('./?page=report', 'pandas-data-lab/index.html', '/sw/?page=report'),
            ('./step-by-step.html?lesson=8#lessonVideo', 'pandas-data-lab/index.html', '/sw/step-by-step.html?lesson=8#lessonVideo'),
            ('../learning-videos/hls.min.js', 'pandas-data-lab/video-player.html', '/sw/learning-videos/hls.min.js'),
            ('../', 'software-life-2026/index.html', '/sw/pico.html'),
            ('./assets/logo.png', 'pandas-data-lab/index.html', '/sw/assets/logo.png'),
            ('./', 'index.html', '/sw/pico.html'),
            ('https://example.com/', 'index.html', 'https://example.com/'),
            ('#prepare', 'pandas-data-lab/first-analysis.html', '#prepare'),
        ]:
            with self.subTest(value=value): self.assertEqual(mapped_url(value, page), expected)

    def test_moves_merge_and_redirect(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            files = {
                'index.html': '<html><head></head><div id="root"></div><script src="/sw/assets/vite.js"></script></html>',
                'assets/vite.js': 'app',
                'downloads/original.csv': 'original',
                'pandas-data-lab/index.html': '<html><head></head><a href="./?page=report">report</a></html>',
                'pandas-data-lab/assets/logo.png': 'logo',
                'pandas-data-lab/downloads/course.csv': 'course',
                'pandas-data-lab/step-by-step.html': '<html><a href="./">home</a></html>',
            }
            for path, text in files.items():
                p = root / path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text)
            package(root, 'test-sha')
            self.assertIn('id="root"', (root / 'pico.html').read_text())
            self.assertIn('/sw/?page=report', (root / 'index.html').read_text())
            self.assertIn('location.search+location.hash', (root / 'pandas-data-lab/step-by-step.html').read_text())
            for path in ('assets/logo.png', 'assets/vite.js', 'downloads/original.csv', 'downloads/course.csv'):
                self.assertTrue((root / path).is_file())
            self.assertEqual(json.loads((root/'site-version.json').read_text())['source_sha'], 'test-sha')


if __name__ == '__main__': unittest.main()
