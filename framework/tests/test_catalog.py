import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location("catalog",Path(__file__).parents[1]/"scripts/catalog.py")
catalog=importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)

class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.directory=self.root/"2026/05/001-test"
        self.directory.mkdir(parents=True)
        (self.directory/"comic.png").write_bytes(b"test")
        (self.directory/"details.md").write_text("Details")
        self.meta={"schemaVersion":1,"issue":1,"slug":"test","title":"Test","summary":"Summary","author":{"name":"Anuj Sadani"},"status":"published","createdAt":None,"publishedAt":"2026-05-01","tags":[],"artwork":"comic.png","details":"details.md","publications":{"substack":"https://example.com/post"}}
    def check(self):
        (self.directory/"meta.json").write_text(json.dumps(self.meta))
        return catalog.validate_catalog(self.root)[0]
    def test_valid_published(self):
        self.assertEqual(self.check(),[])
    def test_wrong_month(self):
        self.meta["publishedAt"]="2026-04-01"
        self.assertIn("expected directory",self.check()[0])
    def test_draft_cannot_invent_issue(self):
        self.meta["status"]="draft"
        self.assertIn("null issue",self.check()[0])
    def test_asset_escape(self):
        self.meta["artwork"]="../secret.png"
        self.assertIn("escapes",self.check()[0])
    def test_missing_details(self):
        (self.directory/"details.md").unlink()
        self.assertIn("missing asset",self.check()[0])
    def test_malformed_metadata(self):
        (self.directory/"meta.json").write_text("[]")
        self.assertIn("must be an object",catalog.validate_catalog(self.root)[0][0])

if __name__=="__main__":
    unittest.main()
