"""Danh mục kỹ năng IT dùng riêng cho Talent Pool: chuẩn hoá tên gọi và dò kỹ năng trong văn bản CV.

Vì sao có: CV viết cùng một công nghệ nhiều kiểu ("Spring Boot", "SpringBoot", "Spring-Boot", "Java Spring") và
nhiều CV chỉ nêu công nghệ trong mô tả công việc chứ không liệt kê ở mục Kỹ năng. Dò theo danh mục bằng mã (không
gọi AI) cho kết quả xác định, rẻ và kiểm chứng được; AI chỉ bổ sung phần ngoài danh mục (xem `talent_profile`).

Danh mục lấy theo danh mục kỹ năng của masterdata-service, mở rộng thêm công nghệ hay gặp trong CV.
Khớp theo ranh giới "từ" (không khớp 'Java' trong 'JavaScript', 'C' trong 'CSS'); bỏ qua dấu và hoa thường.
"""

from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

# canonical → các cách viết khác (không cần lặp lại chính canonical).
_CATALOG: dict[str, list[str]] = {
    # Ngôn ngữ
    "Java": ["core java", "java 8", "java 11", "java 17", "java 21", "java se", "java ee", "j2ee", "jdk"],
    "JavaScript": ["js", "es6", "ecmascript", "javascript es6"],
    "TypeScript": ["ts"],
    "Python": ["python3", "python 3"],
    "C#": ["c sharp", "csharp"],
    "C++": ["cpp", "c plus plus"],
    "Go": ["golang"],
    "Kotlin": [],
    "Swift": [],
    "PHP": ["php7", "php 7", "php8"],
    "Ruby": ["ruby on rails", "rails"],
    "Rust": [],
    "Scala": [],
    "SQL": ["t-sql", "tsql", "pl/sql", "plsql"],
    "Dart": [],
    "Bash": ["shell script", "shell scripting", "shell"],
    # Backend / framework
    "Spring Boot": ["springboot", "spring-boot", "spring boot 2", "spring boot 3"],
    "Spring": ["spring framework", "spring mvc", "spring cloud", "spring data", "spring security", "spring jpa"],
    "Hibernate": ["jpa", "spring data jpa", "hibernate orm"],
    "Node.js": ["nodejs", "node js", "node"],
    "Express.js": ["expressjs", "express js", "express"],
    "NestJS": ["nest.js", "nest js"],
    ".NET": ["dotnet", "dot net", ".net core", "asp.net", "asp.net core", ".net framework", "c#/.net"],
    "Django": [],
    "Flask": [],
    "FastAPI": ["fast api"],
    "Laravel": [],
    "gRPC": [],
    "GraphQL": ["graph ql"],
    "REST API": ["restful", "restful api", "rest apis", "restful apis", "rest api design", "web api"],
    "Microservices": ["microservice", "micro-service", "micro services", "kiến trúc microservice"],
    # Frontend / mobile
    "React": ["reactjs", "react.js", "react js"],
    "React Native": ["react-native"],
    "Next.js": ["nextjs", "next js"],
    "Vue.js": ["vue", "vuejs", "vue js", "vue 3", "nuxt", "nuxt.js"],
    "Angular": ["angularjs", "angular js"],
    "HTML/CSS": ["html5", "css3", "html", "css", "sass", "scss"],
    "Redux": ["redux toolkit", "rtk"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],
    "Flutter": [],
    "Android": ["android sdk", "android studio"],
    "iOS": ["swiftui", "objective-c", "objective c"],
    # Dữ liệu
    "PostgreSQL": ["postgres", "postgresql", "psql", "pgsql"],
    "MySQL": ["mariadb"],
    "SQL Server": ["mssql", "ms sql", "microsoft sql server", "sql server"],
    "Oracle": ["oracle database", "oracle db"],
    "MongoDB": ["mongo", "mongo db", "mongoose"],
    "Redis": [],
    "Elasticsearch": ["elastic search", "elk", "opensearch", "kibana", "logstash"],
    "Cassandra": [],
    "DynamoDB": [],
    "Kafka": ["apache kafka", "kafka streams"],
    "RabbitMQ": ["rabbit mq", "amqp"],
    "Airflow": ["apache airflow"],
    "Spark": ["apache spark", "pyspark"],
    "Hadoop": [],
    "Pandas": [],
    "NumPy": [],
    "Machine Learning": ["ml", "học máy"],
    "Deep Learning": ["học sâu"],
    "PyTorch": [],
    "TensorFlow": [],
    "Power BI": ["powerbi"],
    # Hạ tầng / DevOps
    "Docker": ["docker compose", "docker-compose", "dockerfile", "containerization"],
    "Kubernetes": ["k8s", "kube", "helm"],
    "AWS": ["amazon web services", "ec2", "s3", "lambda", "aws cloud", "rds", "eks", "ecs"],
    "Azure": ["microsoft azure"],
    "GCP": ["google cloud", "google cloud platform"],
    "Terraform": [],
    "Ansible": [],
    "CI/CD": ["ci cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment", "pipeline ci"],
    "Jenkins": [],
    "GitLab CI": ["gitlab ci/cd", "gitlab-ci", "gitlab runner"],
    "GitHub Actions": ["github action"],
    "Git": ["github", "gitlab", "bitbucket", "git flow"],
    "Linux": ["ubuntu", "centos", "unix"],
    "Nginx": [],
    "Prometheus": ["grafana"],
    # Kiểm thử / quy trình
    "Kiểm thử phần mềm": ["software testing", "qa", "qc", "test case", "test plan", "manual testing", "kiểm thử"],
    "Kiểm thử API": ["api testing", "kiểm thử api"],
    "Unit Testing": ["unit test", "junit", "mockito", "pytest", "jest", "unittest", "kiểm thử đơn vị"],
    "Selenium": [],
    "Playwright": [],
    "Cypress": [],
    "Postman": [],
    "Jira": [],
    "Agile/Scrum": ["agile", "scrum", "kanban"],
    "UI/UX Design": ["ui/ux", "ux design", "ui design", "thiết kế ui"],
    "Figma": [],
    # Logistics (miền nghiệp vụ hay gặp trong CV của hệ thống)
    "Logistics": ["supply chain", "chuỗi cung ứng", "vận tải", "kho vận", "tms", "wms", "fulfillment", "last mile"],
    # Ngoại ngữ
    "Tiếng Anh": ["english", "ielts", "toeic"],
    "Tiếng Nhật": ["japanese", "jlpt", "n2", "n3"],
    "Tiếng Hàn": ["korean", "topik"],
    "Tiếng Trung": ["chinese", "hsk"],
}

# Viết tắt quá ngắn / dễ nhầm: chỉ khớp khi đứng thành một mục riêng trong danh sách kỹ năng, không dò trong câu văn.
_STANDALONE_ONLY = {"js", "ts", "ml", "qa", "qc", "n2", "n3", "node", "shell", "rails", "express", "html", "css",
                    "vue", "kube", "go", "elk", "rtk", "s3", "ecs", "eks", "rds", "ec2", "lambda", "nest", "spring"}

_WORD = r"[0-9a-z+#]"


def fold(text: str) -> str:
    """Chữ thường, bỏ dấu tiếng Việt (đ→d), gom khoảng trắng."""
    s = unicodedata.normalize("NFD", text.replace("đ", "d").replace("Đ", "D"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return " ".join(s.split())


@lru_cache(maxsize=1)
def _index() -> tuple[dict[str, str], list[tuple[re.Pattern, str]]]:
    """(bảng alias đã fold → canonical, các mẫu regex để dò trong văn bản)."""
    alias_to_canon: dict[str, str] = {}
    patterns: list[tuple[re.Pattern, str]] = []
    for canon, aliases in _CATALOG.items():
        for raw in [canon, *aliases]:
            a = fold(raw)
            alias_to_canon.setdefault(a, canon)
            if a in _STANDALONE_ONLY:
                continue
            body = re.escape(a).replace(r"\ ", r"[\s\-_]?" if "-" not in a else r"[\s\-_]")
            patterns.append((re.compile(rf"(?<!{_WORD}){body}(?!{_WORD})"), canon))
    return alias_to_canon, patterns


def canonical(name: str) -> str | None:
    """Tên chuẩn của một kỹ năng ('springboot' → 'Spring Boot'); không có trong danh mục thì None."""
    # Chỉ cắt dấu câu ở hai đầu, KHÔNG cắt dấu chấm đầu (".NET", ".net core" phải giữ nguyên).
    return _index()[0].get(fold(name).strip(" ,;:*-•").rstrip("."))


# Kỹ năng "bao gồm" công cụ cụ thể: hỏi CI/CD thì ứng viên dùng Jenkins/GitHub Actions/GitLab CI đều tính.
_IMPLIED_BY = {"CI/CD": ["Jenkins", "GitLab CI", "GitHub Actions"]}
_IMPLIES = {tool: parent for parent, tools in _IMPLIED_BY.items() for tool in tools}


def variants(name: str) -> list[str]:
    """Mọi cách viết đã biết của kỹ năng (kể cả chính nó) — để tìm trong văn bản. Ngoài danh mục: chỉ chính nó."""
    canon = canonical(name)
    if canon is None:
        return [name.strip()]
    out = [canon, *(a for a in _CATALOG[canon] if a.lower() not in _STANDALONE_ONLY)]
    for tool in _IMPLIED_BY.get(canon, []):
        out.extend(variants(tool))
    return out


def detect_skills(text: str) -> list[str]:
    """Các kỹ năng trong danh mục xuất hiện trong văn bản CV (theo thứ tự danh mục, không trùng)."""
    folded = fold(text)
    found: list[str] = []
    for pattern, canon in _index()[1]:
        if canon not in found and pattern.search(folded):
            found.append(canon)
    for tool, parent in _IMPLIES.items():  # dùng Jenkins/GitHub Actions/GitLab CI → có CI/CD
        if tool in found and parent not in found:
            found.append(parent)
    # Một mục riêng trong danh sách kỹ năng ("JS, TS, Node") cũng tính — dù là viết tắt dễ nhầm.
    alias_map = _index()[0]
    for token in re.split(r"[,;|•·\n/]+", folded):
        canon = alias_map.get(token.split(":")[-1].strip(" .*-"))  # bỏ nhãn "Kỹ năng:" đứng trước
        if canon and canon not in found:
            found.append(canon)
    return found


def mentioned(skill: str, text: str) -> bool:
    """Kỹ năng (kể cả tên gọi khác) có xuất hiện trong văn bản không — dùng kiểm tra AI không bịa kỹ năng."""
    folded = fold(text)
    for v in variants(skill):
        v = fold(v)
        if v and re.search(rf"(?<!{_WORD}){re.escape(v)}(?!{_WORD})", folded):
            return True
    return False
