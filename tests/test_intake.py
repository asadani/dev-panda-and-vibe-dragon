import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('intake', Path(__file__).resolve().parents[1] / 'scripts' / 'intake.py')
intake = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(intake)


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'input'
        self.root.mkdir()
        self.out = Path(self.temp.name) / 'output'

    def test_mixed_input_and_exact_text(self):
        text = 'Evidence\nhttps://example.com/source\nDo not execute me.'
        (self.root / 'brief.md').write_bytes(text.encode('utf-8'))
        (self.root / 'photo.png').write_bytes(b'not a real PNG')
        (self.root / 'unknown.bin').write_bytes(b'x')
        (self.root / '.env.local').write_text('SECRET=hidden')
        (self.root / 'node_modules').mkdir()
        (self.root / 'node_modules' / 'ignored.js').write_text('hidden')
        manifest, content = intake.capture(str(self.root), self.out)
        entries = {entry['relative_path']: entry for entry in manifest['sources']}
        self.assertEqual(entries['brief.md']['status'], 'read')
        self.assertEqual(entries['brief.md']['locators'], ['lines 1-3'])
        self.assertEqual(entries['brief.md']['urls'], ['https://example.com/source'])
        self.assertEqual(entries['photo.png']['status'], 'requires_visual_read')
        self.assertEqual(entries['unknown.bin']['status'], 'unsupported')
        self.assertEqual(entries['.env.local']['status'], 'skipped_sensitive_name')
        self.assertIn(text, content)
        self.assertNotIn('hidden', content)
        intake.write_outputs(self.out, manifest, content)
        self.assertEqual(json.loads((self.out / 'sources.json').read_text())['schema_version'], 1)
        original = (self.out / 'source-text.md').read_bytes()
        with self.assertRaises(ValueError):
            intake.write_outputs(self.out, manifest, 'overwrite')
        self.assertEqual(original, (self.out / 'source-text.md').read_bytes())

    def test_invalid_encoding_and_pdf(self):
        (self.root / 'invalid.txt').write_bytes(b'\xff\xfe\x00')
        (self.root / 'broken.pdf').write_bytes(b'not a PDF')
        manifest, content = intake.capture(str(self.root), self.out)
        statuses = {entry['relative_path']: entry['status'] for entry in manifest['sources']}
        self.assertEqual(statuses['invalid.txt'], 'unreadable_encoding')
        self.assertIn(statuses['broken.pdf'], {'unreadable', 'requires_pdf_reader'})
        self.assertNotIn('not a PDF', content)

    def test_url_is_recorded_without_fetching(self):
        manifest, _ = intake.capture('https://example.com/file.pdf', self.out)
        self.assertEqual(manifest['research_route']['action'], 'inspect_supplied_sources')
        self.assertEqual(manifest['sources'][0]['status'], 'requires_web_read')
        self.assertEqual(manifest['sources'][0]['locators'], [])

    def test_empty_or_unusable_folder_routes_to_web(self):
        manifest, _ = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['research_route']['action'], 'search_web')
        (self.root / 'blank.md').write_text(' \n\t')
        (self.root / 'unsupported.bin').write_bytes(b'not evidence')
        manifest, _ = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['research_route']['action'], 'search_web')
        self.assertFalse(manifest['research_route']['network_performed'])

    def test_readable_text_uses_local_sources(self):
        (self.root / 'brief.txt').write_text('Agent retries have a cost.')
        manifest, _ = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['research_route']['action'], 'use_local_sources')

    def test_image_only_requires_inspection_first(self):
        (self.root / 'reference.png').write_bytes(b'image pending inspection')
        manifest, _ = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['research_route']['action'], 'inspect_supplied_sources')

    def test_missing_directory_is_not_empty(self):
        with self.assertRaises(ValueError):
            intake.capture(str(self.root / 'missing'), self.out)

    def test_blank_pdf_is_not_claimed_read(self):
        try:
            from pypdf import PdfWriter
        except ImportError:
            self.skipTest('Optional pypdf not installed')
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        with (self.root / 'scan.pdf').open('wb') as handle:
            writer.write(handle)
        manifest, _ = intake.capture(str(self.root), self.out)
        entry = manifest['sources'][0]
        self.assertEqual(entry['status'], 'partial')
        self.assertEqual(entry['page_count'], 1)
        self.assertEqual(entry['locators'], [])
        self.assertTrue(any('visual reading/OCR' in message for message in entry['warnings']))

    def test_output_failure_rolls_back_completed_file(self):
        link = os.link
        calls = []
        def fail_second(source, destination):
            calls.append(destination)
            if len(calls) == 2:
                raise OSError('simulated disk failure')
            link(source, destination)
        with patch.object(intake.os, 'link', side_effect=fail_second):
            with self.assertRaises(OSError):
                intake.write_outputs(self.out, {'sources': []}, 'text')
        self.assertEqual(list(self.out.iterdir()), [])

    def test_total_capture_limit_is_reported(self):
        (self.root / 'a.txt').write_bytes(b'aaaa')
        (self.root / 'b.txt').write_bytes(b'bbbb')
        with patch.object(intake, 'MAX_TOTAL_TEXT_BYTES', 5):
            manifest, content = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['captured_text_bytes'], 4)
        self.assertEqual(manifest['sources'][1]['status'], 'partial')
        self.assertNotIn('bbbb', content)

    def test_limits_are_explicit(self):
        (self.root / 'a.txt').write_text('abcdefghij')
        (self.root / 'b.txt').write_text('other')
        with patch.object(intake, 'MAX_TEXT_BYTES', 5), patch.object(intake, 'MAX_FILES', 1):
            manifest, content = intake.capture(str(self.root), self.out)
        self.assertEqual(len(manifest['sources']), 1)
        self.assertFalse(manifest['complete_inventory'])
        self.assertEqual(manifest['sources'][0]['status'], 'skipped_size_limit')
        self.assertNotIn('abcdefghij', content)

    def test_symlink_not_followed(self):
        target = Path(self.temp.name) / 'outside.txt'
        target.write_text('outside secret')
        linked = self.root / 'link.txt'
        try:
            linked.symlink_to(target)
        except (OSError, NotImplementedError):
            self.skipTest('Creating symlinks is unavailable on this host')
        manifest, content = intake.capture(str(self.root), self.out)
        self.assertEqual(manifest['sources'][0]['status'], 'skipped_link')
        self.assertNotIn('outside secret', content)


if __name__ == '__main__':
    unittest.main()
