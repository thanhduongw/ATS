"""Đợt chạy thêm: prompt C, đọc trích xuất cố định (phiên bản hiện hành), thư mục run-tag riêng, CSV kèm số liệu đo."""
import asyncio
import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from research import pipeline
from research.privacy import sha
from research.prompts import PROMPT_VERSIONS, score_prompt
from research.run import main as run_main
from research.schema import CVFacts, Fact, JDFacts, Requirement
from research.tests.test_study import FakeManager

CV_TEXT = "Dự án sử dụng React"
JD_TEXT = "Yêu cầu React, cùng với những yêu cầu khác"
CV = CVFacts(facts=[Fact(category="SKILLS", quote="React", note="Kỹ năng React")])
JD = JDFacts(job_title="FE", requirements=[Requirement(dimension="SKILLS", priority="REQUIRED",
                                                       requirement="React", quote="Yêu cầu React")])


def write_extraction(root: Path, kind: str, item_id: str, data, source: str, version: str,
                     model: str = "gemini-3.5-flash-lite", reference_date: str | None = None) -> None:
    path = root / kind / f"{item_id}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"meta": {"step_version": version, "model": model, "source_hash": sha(source),
                                         "reference_date": reference_date or pipeline.REFERENCE_DATE},
                                "data": data.model_dump()}, ensure_ascii=False), encoding="utf-8")


class TestPromptC(unittest.TestCase):
    def test_c_keeps_rubric_drops_evidence(self):
        b = score_prompt("B", CV, JD, "NOT_SPECIFIED")
        c = score_prompt("C", CV, JD, "NOT_SPECIFIED")
        a = score_prompt("A", CV, JD, "NOT_SPECIFIED")
        self.assertEqual(PROMPT_VERSIONS["C"], "ssrc-rubric-only-v1")
        self.assertIn("rubric 1–5", c.lower())
        self.assertIn("đặt cv_evidence=[] và jd_evidence=[]", c)
        self.assertIn("đặt cv_evidence=[] và jd_evidence=[]", a)
        self.assertNotIn("các đoạn trích nguyên văn từ CV_JSON", c)
        self.assertIn("các đoạn trích nguyên văn từ CV_JSON", b)
        with self.assertRaises(ValueError):
            score_prompt("D", CV, JD, "NOT_SPECIFIED")


class TestFrozenExtraction(unittest.TestCase):
    def test_loads_current_version_and_rejects_others(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            write_extraction(root, "cv", "CV-1", CV, CV_TEXT, "ssrc-cv-extract-v2")
            write_extraction(root, "cv", "CV-2", CV, CV_TEXT, "ssrc-cv-extract-v1")
            write_extraction(root, "cv", "CV-3", CV, CV_TEXT, "ssrc-cv-extract-v2", reference_date="01/01/2020")
            data, meta = pipeline.load_frozen_extraction(root, "cv", "CV-1", CV_TEXT, "gemini-3.5-flash-lite")
            self.assertEqual(data, CV)
            self.assertEqual(meta["step_version"], "ssrc-cv-extract-v2")
            with self.assertRaises(pipeline.StudyError):   # bản v1 cũ
                pipeline.load_frozen_extraction(root, "cv", "CV-2", CV_TEXT, "gemini-3.5-flash-lite")
            with self.assertRaises(pipeline.StudyError):   # ngày tham chiếu khác
                pipeline.load_frozen_extraction(root, "cv", "CV-3", CV_TEXT, "gemini-3.5-flash-lite")
            with self.assertRaises(pipeline.StudyError):   # nguồn CV đã đổi
                pipeline.load_frozen_extraction(root, "cv", "CV-1", CV_TEXT + " khác", "gemini-3.5-flash-lite")
            with self.assertRaises(pipeline.StudyError):   # model khác
                pipeline.load_frozen_extraction(root, "cv", "CV-1", CV_TEXT, "gemini-other")

    def test_run_study_scores_without_extraction_calls(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            write_extraction(root / "ex", "cv", "CV-FE-007", CV, CV_TEXT, "ssrc-cv-extract-v2")
            write_extraction(root / "ex", "jd", "JD-FE-01", JD, JD_TEXT, "ssrc-jd-extract-v1")
            pair = {"pair_id": "PAIR-099", "cv_id": "CV-FE-007", "jd_id": "JD-FE-01"}
            manager = FakeManager()
            with patch.object(pipeline, "read_policies", return_value={"JD-FE-01": "NOT_SPECIFIED"}), \
                 patch.object(pipeline, "approved_text", return_value=CV_TEXT), \
                 patch.object(pipeline, "jd_text", return_value=JD_TEXT), \
                 patch.object(pipeline, "EXTRACT_DIR", root / "must_not_exist"), \
                 patch.object(pipeline, "SCORE_DIR", root / "orig_scores"):
                summary = asyncio.run(pipeline.run_study(
                    [pair], manager=manager, configs=("C",), extraction_dir=root / "ex",
                    score_dir=root / "run" / "scores", run_tag="C_r1", keep_going=True))
            self.assertEqual(manager.n, 1)   # chỉ một lượt chấm, không trích xuất
            self.assertEqual(summary["ok"], 1)
            self.assertFalse((root / "must_not_exist").exists())
            self.assertFalse((root / "orig_scores").exists())
            meta = json.loads((root / "run" / "scores" / "PAIR-099__C.json").read_text(encoding="utf-8"))["meta"]
            self.assertEqual((meta["step_version"], meta["run_tag"]), ("ssrc-rubric-only-v1", "C_r1"))
            self.assertEqual(meta["extraction_cv"]["step_version"], "ssrc-cv-extract-v2")

            out = root / "run" / "results.csv"
            done, missing = pipeline.export_scores([pair], out, configs=("C",), score_dir=root / "run" / "scores",
                                                   extra_metrics=True)
            self.assertEqual((done, missing), (1, 0))
            with out.open(encoding="utf-8-sig") as f:
                row = next(csv.DictReader(f))
            self.assertEqual((row["config"], row["input_tokens"], row["output_tokens"]), ("C", "100", "30"))
            self.assertIn("validation_retries", row)


class TestRunGuards(unittest.TestCase):
    def test_refuses_original_output_and_missing_extraction_dir(self):
        self.assertEqual(run_main(["run", "--configs", "C", "--run-tag", "X", "--limit", "1"]), 2)
        self.assertEqual(run_main(["run", "--configs", "C", "--output-dir", str(pipeline.OUTPUT), "--run-tag", "X",
                                   "--extraction-dir", str(pipeline.EXTRACT_DIR), "--limit", "1", "--dry-run"]), 2)


if __name__ == "__main__":
    unittest.main()
