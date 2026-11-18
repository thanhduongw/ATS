"""Hồ sơ Talent Pool: danh mục kỹ năng, số năm từ các khoảng ngày, kiểm chứng kết quả AI, chia đoạn, tìm kết hợp.
Không DB, không gọi Gemini (AI được thay bằng bản giả)."""

from datetime import datetime

import pytest

from app.services import skill_catalog as sc
from app.services.cv_indexing import (
    EDUCATION, SKILLS, SUMMARY, WORK_EXPERIENCE, CVSource, build_index,
)
from app.services.talent_profile import (
    TalentJob, TalentProfileOut, apply_ai, build_profile, merge_skills, rules_profile, split_sections, years_from_jobs,
)
from app.services.talent_search import lexical_coverage, query_terms, skill_matches

NOW = datetime(2026, 11, 19)
NL = chr(10)

CV = NL.join([
    "KINH NGHIỆM LÀM VIỆC",
    "Backend Developer - FPT Software (logistics)",
    "03/2021 - nay",
    "- Xây dựng microservice bằng SpringBoot, Kafka, PostgreSQL cho hệ thống vận tải.",
    "Junior Developer - VNG",
    "06/2019 - 02/2021",
    "- Viết API REST bằng Node.js và JavaScript.",
    "HỌC VẤN",
    "Cử nhân Công nghệ thông tin - IUH, 2015 - 2019",
    "KỸ NĂNG",
    "Java, Docker, K8s, CI/CD",
])


# --- danh mục kỹ năng -------------------------------------------------------------------------

def test_catalog_normalizes_spelling_variants():
    assert sc.canonical("springboot") == "Spring Boot"
    assert sc.canonical("Spring-Boot") == "Spring Boot"
    assert sc.canonical("k8s") == "Kubernetes"
    assert sc.canonical("PostgreSQL") == sc.canonical("postgres") == "PostgreSQL"
    assert sc.canonical("không có trong danh mục xyz") is None


def test_detect_skills_finds_tech_inside_job_descriptions_not_only_skill_section():
    found = sc.detect_skills(CV)
    for expected in ("Spring Boot", "Kafka", "PostgreSQL", "Node.js", "JavaScript", "Java", "Docker", "Kubernetes", "CI/CD"):
        assert expected in found, expected
    assert "Logistics" in found  # "vận tải" là tên gọi khác


def test_detect_skills_respects_word_boundaries():
    assert "Java" not in sc.detect_skills("Thành thạo JavaScript và TypeScript")
    assert "Go" not in sc.detect_skills("Let's go to market, go-getter")
    assert "C++" in sc.detect_skills("Ngôn ngữ: C++, Python")
    assert "Go" in sc.detect_skills("Backend bằng Golang")


def test_standalone_abbreviation_only_counts_as_its_own_list_item():
    assert "JavaScript" in sc.detect_skills("Kỹ năng: JS, TS, React")
    assert "Kubernetes" not in sc.detect_skills("Anh ấy kube không phải công nghệ nào cả")  # viết tắt trong câu: bỏ


def test_mentioned_is_alias_aware():
    assert sc.mentioned("Spring Boot", "Dùng SpringBoot 3 cho backend")
    assert not sc.mentioned("Kafka", "Dùng RabbitMQ cho hàng đợi")


# --- số năm kinh nghiệm -----------------------------------------------------------------------

def test_years_from_jobs_merges_overlaps_and_skips_unreadable():
    jobs = [TalentJob(title="A", start="2020-01", end="2020-12"),
            TalentJob(title="B", start="2020-06", end="2021-06")]  # chồng lấn
    assert years_from_jobs(jobs, NOW) == 1.5
    assert years_from_jobs([TalentJob(title="C", start="2022-01", end="present")], NOW) == 4.9
    assert years_from_jobs([TalentJob(title="D", start=None, end="2020")], NOW) is None  # thiếu mốc: không đoán
    assert years_from_jobs([TalentJob(title="E", start="2030-01", end="2031-01")], NOW) is None  # tương lai
    assert years_from_jobs([TalentJob(title="F", start="2021-05", end="2021-01")], NOW) is None  # ngược


def test_rules_profile_works_without_ai():
    p = rules_profile(CV, NOW)
    assert p.source == "rules" and "Spring Boot" in p.skills
    assert p.total_years == pytest.approx(7.5, abs=0.05)  # 06/2019–02/2021 + 03/2021–nay, không cộng thời gian học


# --- kết quả AI được kiểm lại --------------------------------------------------------------------

def test_ai_invented_skills_are_dropped_real_ones_are_normalized():
    out = TalentProfileOut(skills=["springboot", "Kubernetes", "Rust", "Terraform"])  # CV không có Rust, Terraform
    skills = merge_skills(CV, out.skills)
    assert "Spring Boot" in skills and "Kubernetes" in skills
    assert "Rust" not in skills and "Terraform" not in skills
    assert len(skills) == len({s.lower() for s in skills})


def test_apply_ai_computes_years_in_code_and_keeps_titles():
    out = TalentProfileOut(
        current_title="Backend Developer", titles=["Backend Developer", "Junior Developer"],
        jobs=[TalentJob(title="Backend Developer", company="FPT", start="2021-03", end="present"),
              TalentJob(title="Junior Developer", company="VNG", start="2019-06", end="2021-02")],
        domains=["logistics"], summary="Backend Java năm năm.")
    p = apply_ai(rules_profile(CV, NOW), out, CV, NOW)
    assert p.source == "llm" and p.total_years == pytest.approx(7.5, abs=0.05) and p.titles[0] == "Backend Developer"
    assert p.domains == ["logistics"] and len(p.jobs) == 2


def test_ai_without_readable_dates_falls_back_to_text_years():
    out = TalentProfileOut(jobs=[TalentJob(title="Dev")], summary="x")
    p = apply_ai(rules_profile(CV, NOW), out, CV, NOW)
    assert p.total_years == rules_profile(CV, NOW).total_years


class _FailingManager:
    async def generate_structured(self, *a, **k):
        from app.core.llm_client import LLMError
        raise LLMError("503 overloaded", "gemini")


class _OkManager:
    async def generate_structured(self, prompt, model):
        assert "<cv>" in prompt and "[" not in prompt.split("<cv>")[0]
        return TalentProfileOut(skills=["Kafka"], summary="ok"), None


@pytest.mark.anyio
async def test_ai_failure_still_yields_a_usable_rules_profile():
    p = await build_profile(CV, _FailingManager(), NOW)
    assert p.source == "rules" and "Kafka" in p.skills and p.total_years is not None


@pytest.mark.anyio
async def test_build_profile_uses_ai_when_available():
    p = await build_profile(CV, _OkManager(), NOW)
    assert p.source == "llm" and p.summary == "ok"


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- đoạn văn bản -------------------------------------------------------------------------------

def test_sections_become_typed_chunks_with_summary_first():
    idx = build_index(CVSource("h" * 64, CV, {}), rules_profile(CV, NOW))
    types = [c.chunk_type for c in idx.chunks]
    assert types[0] == SUMMARY and WORK_EXPERIENCE in types and EDUCATION in types and SKILLS in types
    work = " ".join(c.content for c in idx.chunks if c.chunk_type == WORK_EXPERIENCE)
    assert "SpringBoot" in work and "03/2021" in work  # nội dung thật của CV, không chỉ câu trích
    assert "kafka" in idx.search_text and "vận tải" not in idx.search_text  # văn bản tìm kiếm đã bỏ dấu


def test_long_sections_are_split_and_capped():
    big = NL.join(["KINH NGHIỆM", *["Làm việc với hệ thống lớn " * 20 for _ in range(60)]])
    idx = build_index(CVSource("h" * 64, big, {}), rules_profile(big, NOW))
    assert all(len(c.content) <= 1500 for c in idx.chunks) and len(idx.chunks) <= 30
    assert len(idx.doc_text) <= 4000


def test_split_sections_without_headings_is_one_general_block():
    assert split_sections("Chỉ có một đoạn văn thôi") == [("GENERAL", "Chỉ có một đoạn văn thôi")]


# --- tìm kết hợp ---------------------------------------------------------------------------------

def test_skill_filter_matches_spelling_variants_and_whole_words_only():
    assert skill_matches("Spring Boot", ["SpringBoot", "Java"])
    assert skill_matches("Kafka", ["Apache Kafka"])
    assert not skill_matches("Java", ["JavaScript"])
    assert skill_matches("k8s", ["Kubernetes"])


def test_lexical_coverage_rewards_exact_terms():
    terms = query_terms("kỹ sư backend logistics Kafka", ["Kafka"], ["logistics"])
    full = lexical_coverage(sc.fold(CV), terms)
    none = lexical_coverage(sc.fold("Thiết kế đồ hoạ Photoshop"), terms)
    assert full > none and none == 0.0
    assert lexical_coverage("", terms) == 0.0 and lexical_coverage("abc", []) == 0.0


# --- bằng chứng ---------------------------------------------------------------------------------

def test_evidence_quotes_the_real_sentence_with_highlight_positions():
    from app.services.talent_search import build_evidence, find_snippet
    chunks = [("SUMMARY", "Kỹ năng chính: Kafka"),  # tóm tắt do hệ thống dựng: không được dùng làm bằng chứng
              ("EDUCATION", "Cử nhân IUH"),
              ("WORK_EXPERIENCE", "Backend Developer tại ATOM Solution 2/2025 - 9/2025. Xây dựng consumer Kafka xử lý đơn hàng "
                                  "và tối ưu truy vấn PostgreSQL cho hệ thống vận tải.")]
    snip = find_snippet(["Kafka", "apache kafka"], chunks)
    assert snip["section"] == "WORK_EXPERIENCE"
    (s, e), = snip["highlights"]
    assert snip["text"][s:e] == "Kafka"
    ev = build_evidence([["Kafka"], ["Rust"], ["solution"]], chunks, ["Kafka"])
    assert [(x["label"], x["found"]) for x in ev] == [("Kafka", True), ("solution", True), ("Rust", False)]  # tìm thấy trước
    assert ev[2]["text"] is None and ev[0]["inSkillList"] and not ev[2]["inSkillList"]


def test_evidence_matches_without_accents_and_cuts_on_word_boundaries():
    from app.services.talent_search import find_snippet
    text = "Mô tả " + "từ " * 80 + "làm việc tại công ty Giải Pháp Số, phụ trách hệ thống " + "dữ liệu " * 60
    snip = find_snippet(["giai phap so"], [("WORK_EXPERIENCE", text)])
    (s, e), = snip["highlights"]
    assert snip["text"][s:e] == "Giải Pháp Số" and snip["text"].startswith("… ") and snip["text"].endswith(" …")
    assert len(snip["text"]) < 300


def test_dot_net_keeps_its_leading_dot_and_ci_cd_covers_specific_tools():
    assert sc.canonical(".NET") == ".NET" and sc.canonical(".net core") == ".NET"
    assert ".NET" in merge_skills("Công nghệ: C#, ASP.NET Core 8", [".NET", "ASP.NET Core"])
    assert "NET" not in merge_skills("Công nghệ: C#, ASP.NET Core 8", [".NET"])
    assert "CI/CD" in sc.detect_skills("Thiết lập Docker và CI GitHub Actions chạy unit test")
    assert skill_matches("CI/CD", ["GitHub Actions", "Docker"])
    assert any(sc.fold(v) == "jenkins" for v in sc.variants("CI/CD"))


def test_placeholder_is_hidden_and_evidence_lists_found_first_with_tried_spellings():
    from app.services.talent_search import build_evidence, clean_display
    assert clean_display("[TÊN ỨNG VIÊN ĐÃ ẨN — XÁC MINH THỦ CÔNG] Backend Developer") == "Backend Developer"
    ev = build_evidence([["Rust"], ["Kafka", "apache kafka"]], [("WORK_EXPERIENCE", "[TÊN ỨNG VIÊN ĐÃ ẨN] dùng Kafka")], [])
    assert [e["label"] for e in ev] == ["Kafka", "Rust"] and ev[1]["tried"] == ["Rust"]
    assert "ẨN" not in ev[0]["text"]


def test_recruit_status_priority():
    from app.services.recruit_status import by_candidate
    apps = [
        {"candidateId": 1, "id": 10, "currentStageType": "APPLIED", "currentStageOrder": 1, "jobTitle": "A", "currentStageName": "Mới"},
        {"candidateId": 1, "id": 11, "currentStageType": "FINAL_INTERVIEW", "currentStageOrder": 4, "jobTitle": "B", "currentStageName": "PV cuối"},
        {"candidateId": 2, "id": 12, "currentStageType": "REJECTED", "jobTitle": "A"},
        {"candidateId": 3, "id": 13, "currentStageType": "HIRED", "jobTitle": "C", "currentStageName": "Đã tuyển"},
        {"candidateId": 3, "id": 14, "currentStageType": "APPLIED", "currentStageOrder": 1, "jobTitle": "D"},
        {"candidateId": 4, "id": 15, "currentStageType": "APPLIED", "closedReason": "WITHDRAWN", "jobTitle": "A"},
    ]
    s = by_candidate(apps)
    assert (s[1]["status"], s[1]["jobTitle"], s[1]["stageName"]) == ("IN_PROGRESS", "B", "PV cuối")
    assert s[2]["status"] == "REJECTED" and s[3]["status"] == "HIRED" and s[4]["status"] == "REJECTED"


def test_evidence_keeps_other_mentions_for_see_more():
    from app.services.talent_search import build_evidence
    chunks = [("WORK_EXPERIENCE", "Dùng Kafka cho đơn hàng " + "x " * 200 + "sau đó tối ưu Kafka consumer"),
              ("PROJECT", "Dự án chat dùng Kafka"), ("SKILLS", "Kafka")]
    ev, = build_evidence([["Kafka"]], chunks, ["Kafka"])
    assert ev["found"] and len(ev["others"]) == 3 and ev["section"] == "WORK_EXPERIENCE"
    assert all(o["text"][o["highlights"][0][0]:o["highlights"][0][1]] == "Kafka" for o in ev["others"])


def test_descriptive_query_does_not_split_into_common_syllables():
    from app.services.talent_search import query_terms
    terms = query_terms("sinh viên mới ra trường, kinh nghiệm còn ít, gpa cao", [], ["GPA"])
    assert terms == [["GPA"]]   # "sinh", "moi", "truong", "cao" không phải điều kiện kiểm chứng được


def test_highlight_offsets_count_emoji_as_two_utf16_units():
    from app.services.talent_search import find_snippet
    snip = find_snippet(["sinh viên"], [("EDUCATION", "📞 ✉ Tôi là sinh viên năm 4")])
    s, e = snip["highlights"][0]
    units = snip["text"].encode("utf-16-le")
    assert units[s * 2:e * 2].decode("utf-16-le") == "sinh viên"


def test_years_evidence_for_fresher():
    from app.services.talent_search import SearchFilters, SearchHit, years_evidence
    h = SearchHit.__new__(SearchHit)
    h.total_years, h.jobs = 0.4, [{"title": "Intern", "start": "2025-07", "end": "2025-09"}]
    ev = years_evidence(h, SearchFilters(max_years=1))
    assert ev["label"] == "Dưới 1 năm" and "Intern" in ev["text"] and ev["found"]
    h.total_years = None
    assert "chưa có kinh nghiệm" in years_evidence(h, SearchFilters(max_years=1))["text"]
    assert years_evidence(h, SearchFilters()) is None


def test_query_without_keywords_still_points_at_jobs_and_nearest_passages():
    from app.services.talent_search import jobs_evidence, semantic_evidence
    je = jobs_evidence([{"title": "Backend Dev", "company": "ATOM Solution", "start": "2025-02", "end": "2025-09"}])
    assert "ATOM Solution" in je["text"] and je["kind"] == "jobs"
    sem = semantic_evidence([("WORK_EXPERIENCE", "Phát triển hệ thống POS cho khách hàng ngân hàng, tối ưu truy vấn", 0.74),
                             ("PROJECT", "ngắn", 0.7), ("SKILLS", "Java, Spring Boot, PostgreSQL, Docker, Kafka và nhiều hơn nữa", 0.6)])
    assert [e["section"] for e in sem] == ["WORK_EXPERIENCE"] and sem[0]["kind"] == "semantic"
    assert jobs_evidence([]) is None


def test_multi_aspect_query_is_cleaned_and_explanations_override_vector_guess():
    import asyncio
    from app.services.talent_explain import AspectJudgement, ExplainOut, explain
    from app.services.talent_search import ParsedQuery, SearchHit, _clean_parsed
    assert _clean_parsed(ParsedQuery(semantic_query="x", aspects=["chỉ một ý đủ dài"]), "q").aspects == []
    two = _clean_parsed(ParsedQuery(semantic_query="x", aspects=["làm ở công ty phần mềm", "làm kinh doanh", "a"]), "q")
    assert len(two.aspects) == 2

    def hit(found_a, found_b):
        h = SearchHit.__new__(SearchHit)
        h.jobs = [{"title": "Dev", "company": "FPT Software", "start": "2024-01", "end": "2025-01"}]
        h.evidence = [{"kind": "aspect", "aspect": 0, "found": found_a, "section": "EDUCATION", "text": "t"},
                      {"kind": "aspect", "aspect": 1, "found": found_b, "section": "OTHER", "text": "t"}]
        return h
    a, b = hit(True, False), hit(False, False)

    class FakeManager:
        async def generate_structured(self, prompt, schema):
            assert "FPT Software" in prompt and "<data>" in prompt
            return ExplainOut(items=[
                AspectJudgement(candidate=0, aspect=0, supports=False, reason="Chỉ là học vấn"),
                AspectJudgement(candidate=1, aspect=0, supports=True, reason="Làm Dev tại FPT Software")]), None
    hits = [a, b]
    asyncio.run(explain(FakeManager(), ["ý 1", "ý 2"], hits))
    assert hits[0] is b                     # b được ủng hộ, a bị AI hạ xuống dù vector gần
    assert a.evidence[0]["found"] is False and a.evidence[0]["judged"] and "học vấn" in a.evidence[0]["reason"]
    assert b.evidence[0]["found"] is True
