import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from research import pipeline
from research.privacy import redact, quote_in_source
from research.prompts import score_prompt
from research.schema import CVFacts, Fact, JDFacts, Requirement, Rating, ScoreFour, validate_scoring


class TestResearchSchema(unittest.TestCase):
    def make_score(self, cert=3):
        r = lambda n: Rating(score=n, reason="Dựa trên dữ kiện cụ thể", cv_evidence=[], jd_evidence=[])
        return ScoreFour(work_experience=r(3), skills=r(3), education=r(3), certifications=r(cert))

    def test_cert_not_specified_na(self):
        validate_scoring(self.make_score(cert=None), "NOT_SPECIFIED", config="A")
        with self.assertRaises(ValueError):
            validate_scoring(self.make_score(cert=3), "NOT_SPECIFIED", config="A")

    def test_cert_preferred_must_score(self):
        validate_scoring(self.make_score(cert=3), "PREFERRED", config="A")
        with self.assertRaises(ValueError):
            validate_scoring(self.make_score(cert=None), "PREFERRED", config="A")

    def test_score_limits(self):
        with self.assertRaises(ValueError):
            Rating(score=0, reason="Sai giới hạn 0")
        with self.assertRaises(ValueError):
            Rating(score=6, reason="Sai giới hạn 6")

    def test_redaction(self):
        source="Họ và tên: Nguyễn Văn A\nEmail: abc@example.com\nSĐT: 0912345678\nJava Spring Boot"
        result=redact(source)
        for snippet in ("abc@example.com", "0912345678", "Nguyễn Văn A"):
            self.assertNotIn(snippet, result)
        self.assertIn("Java Spring Boot", result)
        self.assertTrue(quote_in_source("Java Spring", result))

    def test_prompts_different_but_shared_data(self):
        cv=CVFacts(facts=[Fact(category="SKILLS", quote="React", note="Có React")])
        jd=JDFacts(job_title="FE", requirements=[Requirement(dimension="SKILLS",priority="REQUIRED", requirement="React",quote="Yêu cầu React")])
        a=score_prompt("A",cv,jd,"NOT_SPECIFIED")
        b=score_prompt("B",cv,jd,"NOT_SPECIFIED")
        self.assertIn('"React"',a)
        self.assertIn('"React"',b)
        # Chấp nhận rubric tiếng Việt viết dấu gạch ngang Unicode (1–5).
        # Kiểm tra nội dung thay vì yêu cầu đúng một cách viết cố định.
        self.assertIn("rubric 1–5", b.lower())
        self.assertNotIn("rubric 1–5", a.lower())


class FakeUsage:
    input_tokens=100
    output_tokens=30
    latency_ms=2
    retries=0

class FakeManager:
    def __init__(self): self.n=0
    async def generate_structured(self, prompt, schema):
        self.n+=1
        if schema is CVFacts:
            return CVFacts(facts=[Fact(category="SKILLS",quote="React",note="Kỹ năng React")]), FakeUsage()
        if schema is JDFacts:
            return JDFacts(job_title="FE", requirements=[Requirement(dimension="SKILLS",priority="REQUIRED",requirement="React",quote="Yêu cầu React")]), FakeUsage()
        def r(n, cv=False, jd=False):
            return Rating(score=n,reason="Đánh giá theo JD và CV",cv_evidence=["React"] if cv else [],jd_evidence=["Yêu cầu React"] if jd else [])
        return ScoreFour(work_experience=r(3), skills=r(4,cv=True,jd=True), education=r(3), certifications=r(None)), FakeUsage()

class TestCache(unittest.TestCase):
    def test_repeated_call_no_more_api(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch.object(pipeline,"EXTRACT_DIR",Path(temp)/"extracted"),patch.object(pipeline,"SCORE_DIR",Path(temp)/"scores"):
                m=FakeManager()
                runner=pipeline.StudyRunner(m,"gemini-3.5-flash-lite")
                async def calls():
                    cv,_=await runner.cv("CV-FE-007","Dự án sử dụng React")
                    jd,_=await runner.jd("JD-FE-01","Yêu cầu React, cùng với những yêu cầu khác")
                    pair={"pair_id":"PAIR-099","cv_id":"CV-FE-007","jd_id":"JD-FE-01"}
                    await runner.score(pair,"A",cv,jd,"NOT_SPECIFIED")
                    await runner.score(pair,"B",cv,jd,"NOT_SPECIFIED")
                    first=m.n
                    await runner.cv("CV-FE-007","Dự án sử dụng React")
                    await runner.jd("JD-FE-01","Yêu cầu React, cùng với những yêu cầu khác")
                    await runner.score(pair,"A",cv,jd,"NOT_SPECIFIED")
                    await runner.score(pair,"B",cv,jd,"NOT_SPECIFIED")
                    return first,m.n
                first,second=asyncio.run(calls())
                self.assertEqual((first,second),(4,4))

    def test_expected_100_pairs_306_calls(self):
        rows=[{"cv_id":f"CV-{i}","jd_id":f"JD-{i%6}"} for i in range(100)]
        calls=pipeline.expected_calls(rows)
        self.assertEqual(calls, {"cv_extractions":100,"jd_extractions":6,"scores":200})

if __name__=="__main__": unittest.main()
