import tempfile
import unittest
from pathlib import Path

from research.preflight import check_pdf, read_pairs, validate_manifest


class TestPreflight(unittest.TestCase):
    def test_manifest_has_100_unique_pairs(self):
        path = Path(__file__).resolve().parents[1] / "data" / "pairs.csv"
        pairs = read_pairs(path)
        self.assertEqual(len(pairs), 100)
        self.assertEqual(len({x['cv_id'] for x in pairs}), 100)
        self.assertEqual(validate_manifest(pairs), [])

    def test_no_outside_path(self):
        path = Path(__file__).resolve().parents[1] / "data" / "pairs.csv"
        pairs = read_pairs(path)
        pairs[0]["cv_relative_path"] = "../private.pdf"
        self.assertTrue(validate_manifest(pairs))

    def test_missing_pdf(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(check_pdf(Path(d) / "no.pdf")["status"], "MISSING")


if __name__ == "__main__":
    unittest.main()
