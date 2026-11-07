import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('compact', Path(__file__).with_name('compact-video-assets.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DistributionMediaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.media = self.root / 'videos' / 'lesson10'
        self.media.mkdir(parents=True)
        (self.media / 'index.m3u8').write_text('#EXTM3U\n#EXTINF:2.0,\npart-000.ts\n#EXTINF:3.0,\npart-001.ts\n#EXT-X-ENDLIST\n')
        (self.media / 'part-000.ts').write_bytes(b'first video frame')
        (self.media / 'part-001.ts').write_bytes(b'last video frame')
        (self.media / 'captions.vtt').write_text('WEBVTT\n\n00:00.000 --> 00:02.000\n원래 수업\n')
        (self.root / 'lesson.html').write_text('<video src="videos/lesson10/index.m3u8"></video>')
        (self.root / 'application.ts').write_text('const unchanged = true;')

    def remote(self, url):
        expected = module.ORIGIN + 'pandas-data-lab/videos/lesson10/'
        self.assertTrue(url.startswith(expected))
        return (self.media / url.removeprefix(expected)).read_bytes()

    def test_same_playlist_url_body_captions_and_nonmedia_files(self):
        before = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        proof = module.compact(self.root, 'a' * 40, self.remote)
        self.assertEqual(len(proof['segments']), 2)
        self.assertEqual(len(proof['verified']), 3)
        self.assertEqual((self.media / 'index.m3u8').read_text().count(module.ORIGIN), 2)
        self.assertIn('#EXTINF:3.0,', (self.media / 'index.m3u8').read_text())
        for path in [Path('lesson.html'), Path('application.ts'), Path('videos/lesson10/captions.vtt')]:
            self.assertEqual((self.root / path).read_bytes(), before[path])
        self.assertFalse((self.media / 'part-000.ts').exists())
        self.assertTrue((self.root / 'video-delivery.json').exists())

    def test_hash_mismatch_does_not_mutate_distribution(self):
        before = {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        with self.assertRaisesRegex(ValueError, 'differs'):
            module.compact(self.root, 'a' * 40, lambda _: b'wrong source')
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()})

    def test_external_or_escaping_segments_are_rejected(self):
        for value in ['https://example.com/a.ts', '../../application.ts', '/a.ts', 'missing.ts']:
            (self.media / 'index.m3u8').write_text('#EXTM3U\n' + value + '\n')
            with self.assertRaises(ValueError):
                module.compact(self.root, 'a' * 40, self.remote)
        self.assertTrue((self.root / 'application.ts').exists())


if __name__ == '__main__':
    unittest.main()
