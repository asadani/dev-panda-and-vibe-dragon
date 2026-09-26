import asyncio
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, AsyncMock

spec = importlib.util.spec_from_file_location('web', Path(__file__).parents[1] / 'scripts/web_research.py')
web = importlib.util.module_from_spec(spec)
spec.loader.exec_module(web)


class WebResearchTests(unittest.TestCase):
    def test_url_validation(self):
        self.assertEqual(web.normalize_url('https://example.com/a#b'), 'https://example.com/a')
        for url in ['file:///etc/passwd', 'https://user:secret@example.com', 'not a URL']:
            with self.assertRaises(ValueError): web.normalize_url(url)

    def test_intake_routing(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'sources.json'
            for action in ['use_local_sources', 'inspect_supplied_sources', 'search_web']:
                p.write_text(json.dumps({'research_route': {'action': action}, 'sources': []}))
                expected = 'search' if action == 'search_web' else action
                self.assertEqual(web.plan(p, 'agents', [])[0], expected)
            p.write_text(json.dumps({'research_route': {'action': 'inspect_supplied_sources'},
                                    'sources': [{'uri': 'https://example.com', 'status': 'requires_web_read'}]}))
            self.assertEqual(web.plan(p, None, [])[0], 'fetch')
            with self.assertRaises(FileNotFoundError): web.plan(Path(tmp) / 'missing', 'agents', [])

    def test_cache_integrity_and_expiry(self):
        r = dict(status='captured', retrieved_at=datetime.now(timezone.utc).isoformat(),
                 sha256=web.digest('abc'), markdown='abc', extractor='crawl4ai-v1')
        self.assertTrue(web.valid_cache(r, 3600))
        self.assertFalse(web.valid_cache(dict(r, markdown='tampered'), 3600))
        self.assertFalse(web.valid_cache(dict(r, retrieved_at='2000-01-01T00:00:00+00:00'), 3600))

    def test_partial_evidence_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = SimpleNamespace(intake=None, topic='agents', url=[], out=Path(tmp)/'run', cache=Path(tmp)/'cache', refresh=False)
            results = [{'href': 'https://example.com/'+str(i)} for i in range(10)]
            records = [{'status': 'captured', 'markdown': 'Evidence', 'sha256': web.digest('Evidence')}, {'status': 'failed', 'error': 'timeout'}]
            with patch.object(web, 'search', return_value=results), patch.object(web, 'fetch_pages', new_callable=AsyncMock, return_value=records) as fetch:
                report = asyncio.run(web.run(args))
                self.assertEqual(len(fetch.call_args.args[0]), 5)
            self.assertEqual(report['status'], 'partial')
            self.assertEqual((args.out/'source-01.md').read_text(), 'Evidence')
            self.assertNotIn('markdown', report['sources'][0])
            with self.assertRaises(FileExistsError): asyncio.run(web.run(args))

    def test_search_failure_recorded(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = SimpleNamespace(intake=None, topic='agents', url=[], out=Path(tmp)/'run', cache=Path(tmp)/'cache', refresh=False)
            with patch.object(web, 'search', side_effect=RuntimeError('unavailable')):
                report = asyncio.run(web.run(args))
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(report['error'], 'unavailable')
            self.assertTrue((args.out/'web-sources.json').exists())


if __name__ == '__main__': unittest.main()
