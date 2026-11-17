"""Công ty, người dùng nội bộ, yêu cầu tuyển dụng và tin tuyển dụng của bộ dữ liệu demo (chỉ lĩnh vực IT).

Tên công ty là hư cấu. Mọi email dùng miền example.com (auth-service không gửi thư thật tới miền này).
"""

COMPANY = {
    "name": "Mộc Lam Software",
    "legalName": "Công ty Cổ phần Phần mềm Mộc Lam",
    "taxCode": "0318765432",
    "foundedDate": "2016-08-18",
    "address": "Tầng 8, 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh",
    "phone": "028 7300 1808",
    "website": "https://moclam.example.com",
    "sizeRange": "201-500",
    "recruitingEmail": "tuyendung@example.com",
    "brandColor": "#0F6E66",
    "dataRetentionMonths": 24,
    "tagline": "Làm phần mềm tử tế cho doanh nghiệp Việt",
    "description": (
        "Mộc Lam Software làm phần mềm quản trị cho doanh nghiệp bán lẻ và logistics tại Việt Nam từ năm 2016. "
        "Hơn 240 kỹ sư ở ba văn phòng TP. Hồ Chí Minh, Hà Nội và Đà Nẵng cùng vận hành nền tảng xử lý trên "
        "3 triệu đơn hàng mỗi ngày. Chúng tôi chia thành các nhóm sản phẩm nhỏ, tự quyết định kỹ thuật và tự "
        "chịu trách nhiệm với thứ mình đưa lên production."
    ),
    "privacyPolicy": (
        "1. Dữ liệu chúng tôi thu thập\n"
        "Họ tên, email, số điện thoại, hồ sơ xin việc (CV) và những thông tin bạn tự cung cấp khi ứng tuyển.\n\n"
        "2. Mục đích sử dụng\n"
        "Chỉ dùng để đánh giá mức độ phù hợp với vị trí ứng tuyển, liên hệ trong quá trình tuyển dụng và lập hồ sơ "
        "nhân sự nếu bạn nhận việc. Hồ sơ có thể được công cụ AI hỗ trợ chấm sơ bộ; quyết định cuối cùng luôn do "
        "con người đưa ra.\n\n"
        "3. Thời gian lưu trữ\n"
        "Hồ sơ được lưu tối đa 24 tháng kể từ lần ứng tuyển gần nhất, sau đó tự động xoá.\n\n"
        "4. Quyền của bạn\n"
        "Bạn có thể xem, sửa hoặc yêu cầu xoá toàn bộ dữ liệu cá nhân bất kỳ lúc nào trong trang Hồ sơ, hoặc gửi "
        "yêu cầu tới tuyendung@example.com.\n\n"
        "5. Chia sẻ dữ liệu\n"
        "Chúng tôi không bán và không chia sẻ dữ liệu của bạn cho bên thứ ba ngoài mục đích tuyển dụng."
    ),
}

BENEFITS = [
    {"icon": "money", "title": "Lương tháng 13 và thưởng theo quý", "description": "Xét tăng lương hai lần mỗi năm, vào tháng 1 và tháng 7"},
    {"icon": "health", "title": "Bảo hiểm sức khoẻ cho bạn và người thân", "description": "Gói nội trú, ngoại trú và nha khoa; khám tổng quát hằng năm"},
    {"icon": "home", "title": "Làm việc kết hợp", "description": "Ba ngày ở văn phòng, hai ngày từ xa, giờ bắt đầu linh hoạt từ 8h đến 10h"},
    {"icon": "book", "title": "Ngân sách học tập 12 triệu mỗi năm", "description": "Sách, khoá học, lệ phí thi chứng chỉ AWS, ISTQB, Kubernetes"},
    {"icon": "laptop", "title": "MacBook Pro và màn hình rời", "description": "Đổi máy sau ba năm, hỗ trợ mua lại máy cũ"},
    {"icon": "calendar", "title": "15 ngày phép và nghỉ sinh nhật", "description": "Thêm một ngày phép sau mỗi hai năm gắn bó"},
]

CAREERS_HERO = {
    "eyebrow": "Hơn 240 kỹ sư · {jobs} vị trí đang mở",
    "tagline": "Làm phần mềm tử tế\ncho doanh nghiệp Việt",
    "description": "Nhóm nhỏ, tự chủ về kỹ thuật, đưa tính năng lên production mỗi tuần.",
    "quote": "Tuần thứ hai mình đã tự tay đưa một thay đổi lên production, có người kèm sát từ đầu đến cuối.",
    "quoteAuthor": "Minh Khôi · Kỹ sư Backend, gia nhập năm 2024",
}

LIFE_PHOTOS = [
    ("tech-talk", "Tech Talk\nthứ Sáu", "Chia sẻ kỹ thuật chiều thứ Sáu hằng tuần"),
    ("hackathon", "Hackathon\nnội bộ", "Hackathon nội bộ 48 giờ, tháng 9"),
    ("da-lat", "Đà Lạt\n2026", "Chuyến đi công ty ở Đà Lạt"),
]

# (khoá, họ tên, email, vai trò, phòng ban — khớp theo từ khoá trong tên phòng, điện thoại)
STAFF = [
    ("hr1", "Trần Thị Thu Hà", "tran.ha@example.com", "RECRUITER", "Nhân sự", "0903 218 406"),
    ("hr2", "Phạm Ngọc Ánh", "pham.anh@example.com", "RECRUITER", "Nhân sự", "0938 552 917"),
    ("hm_be", "Nguyễn Hoàng Long", "nguyen.long@example.com", "HIRING_MANAGER", "Backend", "0912 640 385"),
    ("hm_fe", "Võ Thị Mai Phương", "vo.phuong@example.com", "HIRING_MANAGER", "Frontend", "0977 301 264"),
    ("hm_mb", "Đặng Quốc Bảo", "dang.bao@example.com", "HIRING_MANAGER", "Mobile", "0909 874 132"),
    ("hm_qa", "Bùi Thị Thanh Tâm", "bui.tam@example.com", "HIRING_MANAGER", "Kiểm thử", "0986 415 703"),
    ("hm_do", "Hoàng Đức Thịnh", "hoang.thinh@example.com", "HIRING_MANAGER", "DevOps", "0918 266 549"),
    ("hm_de", "Đỗ Khánh Vy", "do.vy@example.com", "HIRING_MANAGER", "Dữ liệu", "0935 708 921"),
]

COMMON_BENEFITS = (
    "Lương tháng 13 và thưởng theo quý\n"
    "Bảo hiểm sức khoẻ cho bạn và một người thân\n"
    "Làm việc kết hợp: ba ngày ở văn phòng, hai ngày từ xa\n"
    "Ngân sách học tập 12 triệu đồng mỗi năm\n"
    "MacBook Pro và màn hình rời\n"
    "15 ngày phép mỗi năm"
)

# Mỗi yêu cầu: khoá, trưởng bộ phận, chức danh, cấp bậc, số lượng, lương đề xuất, lương duyệt, trạng thái cuối,
# số ngày trước hôm nay mà tin được đăng (None = không có tin), trạng thái tin, người phụ trách.
REQUISITIONS = [
    {
        "key": "BE", "hm": "hm_be", "hr": "hr1", "title": "Lập trình viên Backend Java (Spring Boot)",
        "jobTitle": "Backend", "level": "Senior", "quantity": 2, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 3 năm với Java", "reason": "EXPANSION", "priority": "HIGH",
        "salary": (30_000_000, 48_000_000), "approved": (30_000_000, 45_000_000),
        "skills": ["Java", "Spring Boot", "PostgreSQL", "Microservices", "Kafka", "Docker", "REST API"],
        "final": "APPROVED", "published": 80, "posting": "OPEN", "urgent": True,
        "note": "Nhóm Đơn hàng cần thêm hai người để tách dịch vụ thanh toán trước quý 1.",
        "description": (
            "Nhóm Đơn hàng vận hành các dịch vụ xử lý hơn ba triệu đơn mỗi ngày cho khách hàng bán lẻ. "
            "Bạn sẽ cùng sáu kỹ sư khác tách dần khối thanh toán ra khỏi hệ thống cũ.\n"
            "Thiết kế và phát triển dịch vụ bằng Java 21, Spring Boot 3\n"
            "Tối ưu truy vấn PostgreSQL cho các bảng trên 500 triệu dòng\n"
            "Xây luồng sự kiện bằng Kafka giữa các dịch vụ đơn hàng, kho và thanh toán\n"
            "Viết kiểm thử tự động và tham gia trực vận hành theo lịch của nhóm\n"
            "Xem xét mã nguồn và kèm cặp các bạn Junior"
        ),
        "requirements": (
            "Từ 3 năm kinh nghiệm phát triển backend với Java và Spring Boot\n"
            "Hiểu rõ giao dịch, chỉ mục và kế hoạch thực thi trên PostgreSQL hoặc MySQL\n"
            "Đã làm việc với hàng đợi thông điệp (Kafka hoặc RabbitMQ) trên môi trường production\n"
            "Quen với Docker, CI/CD và viết kiểm thử đơn vị, kiểm thử tích hợp\n"
            "Đọc hiểu tài liệu kỹ thuật tiếng Anh\n"
            "Ưu tiên: từng thiết kế hệ thống thanh toán hoặc xử lý giao dịch tài chính"
        ),
    },
    {
        "key": "FE", "hm": "hm_fe", "hr": "hr2", "title": "Lập trình viên Frontend React",
        "jobTitle": "Frontend", "level": "Middle", "quantity": 2, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 2 năm với React", "reason": "NEW_PROJECT", "priority": "NORMAL",
        "salary": (20_000_000, 34_000_000), "approved": (20_000_000, 32_000_000),
        "skills": ["React", "TypeScript", "JavaScript", "HTML/CSS", "Next.js", "Git"],
        "final": "APPROVED", "published": 75, "posting": "OPEN", "urgent": False,
        "note": "Dự án cổng đối tác mới bắt đầu tháng sau, cần hai người làm giao diện.",
        "description": (
            "Bạn sẽ xây cổng đối tác mới: nơi nhà bán hàng theo dõi đơn, tồn kho và đối soát công nợ.\n"
            "Phát triển giao diện bằng React 19 và TypeScript\n"
            "Phối hợp với nhóm thiết kế để hoàn thiện bộ thành phần dùng chung\n"
            "Tối ưu tốc độ tải trang và trải nghiệm trên điện thoại\n"
            "Viết kiểm thử giao diện bằng Vitest và Playwright\n"
            "Làm việc trực tiếp với nhóm Backend để chốt hợp đồng API"
        ),
        "requirements": (
            "Từ 2 năm kinh nghiệm làm sản phẩm với React và TypeScript\n"
            "Nắm chắc HTML, CSS, bố cục đáp ứng và khả năng truy cập\n"
            "Hiểu cách quản lý trạng thái và gọi API bất đồng bộ (React Query hoặc tương đương)\n"
            "Có thói quen viết kiểm thử cho thành phần giao diện\n"
            "Ưu tiên: từng làm với Next.js hoặc bảng dữ liệu lớn"
        ),
    },
    {
        "key": "MB", "hm": "hm_mb", "hr": "hr1", "title": "Lập trình viên Mobile React Native",
        "jobTitle": "Mobile", "level": "Middle", "quantity": 1, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 2 năm làm ứng dụng di động", "reason": "REPLACEMENT", "priority": "NORMAL",
        "salary": (20_000_000, 32_000_000), "approved": (20_000_000, 30_000_000),
        "skills": ["React Native", "TypeScript", "JavaScript", "REST API", "Git"],
        "final": "APPROVED", "published": 50, "posting": "OPEN", "urgent": False,
        "note": "Thay một bạn chuyển sang nhóm Frontend từ đầu tháng.",
        "description": (
            "Ứng dụng giao nhận của Mộc Lam được hơn 40.000 tài xế dùng mỗi ngày trên Android và iOS.\n"
            "Phát triển tính năng mới bằng React Native và TypeScript\n"
            "Xử lý chế độ ngoại tuyến và đồng bộ dữ liệu khi mạng yếu\n"
            "Tích hợp bản đồ, thông báo đẩy và quét mã vạch\n"
            "Theo dõi lỗi, tốc độ khởi động và dung lượng ứng dụng sau mỗi bản phát hành"
        ),
        "requirements": (
            "Từ 2 năm kinh nghiệm với React Native, đã đưa ít nhất một ứng dụng lên App Store hoặc Google Play\n"
            "Hiểu vòng đời ứng dụng, điều hướng và lưu trữ cục bộ trên thiết bị\n"
            "Biết gỡ lỗi hiệu năng trên thiết bị cấu hình thấp\n"
            "Ưu tiên: biết Kotlin hoặc Swift đủ để viết module gốc"
        ),
    },
    {
        "key": "QA", "hm": "hm_qa", "hr": "hr2", "title": "Kỹ sư Kiểm thử tự động",
        "jobTitle": "kiểm thử tự động", "level": "Middle", "quantity": 1, "office": "Hà Nội", "arrangement": "HYBRID",
        "experience": "Từ 2 năm kiểm thử, có kinh nghiệm tự động hoá", "reason": "EXPANSION", "priority": "NORMAL",
        "salary": (18_000_000, 30_000_000), "approved": (18_000_000, 28_000_000),
        "skills": ["Playwright", "Selenium", "Kiểm thử API", "JavaScript", "CI/CD", "Postman"],
        "final": "APPROVED", "published": 60, "posting": "OPEN", "urgent": False,
        "note": "Bộ kiểm thử hồi quy đang chạy tay mất ba ngày mỗi bản phát hành.",
        "description": (
            "Bạn sẽ xây bộ kiểm thử tự động cho cổng đối tác và ứng dụng giao nhận.\n"
            "Viết kịch bản kiểm thử giao diện bằng Playwright\n"
            "Xây bộ kiểm thử API chạy trong đường ống CI\n"
            "Phân tích lỗi cùng lập trình viên và theo dõi tới khi đóng\n"
            "Đề xuất chiến lược kiểm thử cho từng tính năng mới"
        ),
        "requirements": (
            "Từ 2 năm kinh nghiệm kiểm thử phần mềm, trong đó ít nhất 1 năm làm tự động hoá\n"
            "Thành thạo Playwright hoặc Selenium, viết được JavaScript hoặc TypeScript\n"
            "Hiểu kiểm thử API và đọc được truy vấn SQL cơ bản\n"
            "Ưu tiên: có chứng chỉ ISTQB Foundation"
        ),
    },
    {
        "key": "DO", "hm": "hm_do", "hr": "hr2", "title": "Kỹ sư DevOps (AWS, Kubernetes)",
        "jobTitle": "DevOps", "level": "Senior", "quantity": 1, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 3 năm vận hành hệ thống trên đám mây", "reason": "EXPANSION", "priority": "HIGH",
        "salary": (30_000_000, 48_000_000), "approved": (30_000_000, 45_000_000),
        "skills": ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "Linux"],
        "final": "APPROVED", "published": 45, "posting": "PAUSED", "urgent": False,
        "note": "Chuẩn bị chuyển toàn bộ dịch vụ sang EKS trong nửa đầu năm sau.",
        "description": (
            "Nhóm Hạ tầng gồm năm người, chịu trách nhiệm cho hơn 120 dịch vụ chạy trên AWS.\n"
            "Vận hành và nâng cấp các cụm Kubernetes (EKS)\n"
            "Viết hạ tầng dưới dạng mã bằng Terraform\n"
            "Cải thiện đường ống CI/CD để rút thời gian triển khai xuống dưới 10 phút\n"
            "Xây hệ thống giám sát, cảnh báo và tham gia trực sự cố"
        ),
        "requirements": (
            "Từ 3 năm kinh nghiệm DevOps hoặc SRE trên AWS\n"
            "Vận hành Kubernetes trên production, hiểu mạng và bảo mật trong cụm\n"
            "Thành thạo Terraform, Linux và một ngôn ngữ kịch bản (Bash hoặc Python)\n"
            "Ưu tiên: chứng chỉ AWS Solutions Architect hoặc CKA"
        ),
    },
    {
        "key": "DE", "hm": "hm_de", "hr": "hr1", "title": "Kỹ sư Dữ liệu",
        "jobTitle": "Kỹ sư dữ liệu", "level": "Middle", "quantity": 1, "office": "Đà Nẵng", "arrangement": "HYBRID",
        "experience": "Từ 2 năm xây đường ống dữ liệu", "reason": "NEW", "priority": "NORMAL",
        "salary": (25_000_000, 40_000_000), "approved": (25_000_000, 38_000_000),
        "skills": ["Python", "SQL", "Airflow", "Spark", "PostgreSQL", "AWS"],
        "final": "APPROVED", "published": 85, "posting": "CLOSED", "urgent": False,
        "note": "Vị trí đầu tiên của nhóm dữ liệu ở Đà Nẵng.",
        "description": (
            "Bạn sẽ xây kho dữ liệu phục vụ báo cáo vận hành cho hơn 300 khách hàng doanh nghiệp.\n"
            "Thiết kế và vận hành đường ống dữ liệu bằng Airflow và Spark\n"
            "Mô hình hoá dữ liệu cho báo cáo doanh thu, tồn kho, giao nhận\n"
            "Đặt kiểm tra chất lượng dữ liệu và cảnh báo khi số liệu lệch\n"
            "Làm việc với nhóm phân tích để hiểu nhu cầu báo cáo"
        ),
        "requirements": (
            "Từ 2 năm kinh nghiệm kỹ thuật dữ liệu\n"
            "Thành thạo SQL và Python, đã dùng Airflow hoặc công cụ điều phối tương đương\n"
            "Hiểu mô hình dữ liệu dạng sao và xử lý dữ liệu theo lô\n"
            "Ưu tiên: kinh nghiệm với Spark và kho dữ liệu trên AWS"
        ),
    },
    {
        "key": "ML", "hm": "hm_de", "hr": "hr1", "title": "Kỹ sư AI/Machine Learning",
        "jobTitle": "AI/ML", "level": "Senior", "quantity": 1, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 3 năm làm mô hình học máy", "reason": "NEW_PROJECT", "priority": "HIGH",
        "salary": (35_000_000, 55_000_000), "approved": None,
        "skills": ["Python", "Machine Learning", "PyTorch", "Pandas", "SQL"],
        "final": "PENDING_APPROVAL", "created": 4, "published": None, "posting": None,
        "note": "Dự án dự báo nhu cầu tồn kho cho khách hàng bán lẻ, bắt đầu quý sau.",
        "description": (
            "Xây mô hình dự báo nhu cầu hàng hoá theo cửa hàng và theo tuần.\n"
            "Phân tích dữ liệu bán hàng, chọn đặc trưng và huấn luyện mô hình\n"
            "Đưa mô hình lên production cùng nhóm Kỹ thuật dữ liệu\n"
            "Theo dõi sai số dự báo và huấn luyện lại định kỳ"
        ),
        "requirements": (
            "Từ 3 năm kinh nghiệm với các bài toán học máy trên dữ liệu bảng hoặc chuỗi thời gian\n"
            "Thành thạo Python, Pandas, PyTorch hoặc scikit-learn\n"
            "Đã triển khai mô hình phục vụ người dùng thật"
        ),
    },
    {
        "key": "INTERN", "hm": "hm_be", "hr": "hr1", "title": "Thực tập sinh Backend",
        "jobTitle": "Backend", "level": "Intern", "quantity": 3, "office": "Hồ Chí Minh", "arrangement": "ONSITE",
        "experience": "Sinh viên năm cuối", "reason": "NEW", "priority": "NORMAL", "employment": "Thực tập",
        "salary": (4_000_000, 6_000_000), "approved": None,
        "skills": ["Java", "SQL", "Git"],
        "final": "DRAFT", "created": 2, "published": None, "posting": None,
        "note": "Đợt thực tập mùa xuân, sáu tháng.",
        "description": (
            "Chương trình thực tập sáu tháng tại nhóm Đơn hàng, có người hướng dẫn riêng.\n"
            "Học và làm việc với Java, Spring Boot trên dự án thật\n"
            "Viết kiểm thử và sửa lỗi dưới sự hướng dẫn của kỹ sư chính"
        ),
        "requirements": (
            "Sinh viên năm cuối ngành Công nghệ thông tin hoặc tương đương\n"
            "Nắm vững lập trình hướng đối tượng và cơ sở dữ liệu quan hệ\n"
            "Có thể làm việc toàn thời gian trong sáu tháng"
        ),
    },
    {
        "key": "UIUX", "hm": "hm_fe", "hr": "hr2", "title": "Chuyên viên Thiết kế UI/UX",
        "jobTitle": "UI/UX", "level": "Middle", "quantity": 1, "office": "Hồ Chí Minh", "arrangement": "HYBRID",
        "experience": "Từ 2 năm thiết kế sản phẩm số", "reason": "NEW", "priority": "NORMAL",
        "salary": (18_000_000, 40_000_000), "approved": None,
        "skills": ["Figma", "HTML/CSS", "Giao tiếp"],
        "final": "CHANGES_REQUESTED", "created": 9, "published": None, "posting": None,
        "changeNote": "Khoảng lương 18–40 triệu quá rộng so với cấp Middle. Nhờ phòng thu hẹp lại và bổ sung mô tả công việc cụ thể hơn.",
        "note": "Hiện nhóm chỉ có một người thiết kế cho ba sản phẩm.",
        "description": (
            "Thiết kế trải nghiệm cho cổng đối tác và ứng dụng giao nhận.\n"
            "Nghiên cứu người dùng và vẽ luồng thao tác"
        ),
        "requirements": (
            "Từ 2 năm kinh nghiệm thiết kế sản phẩm số\n"
            "Thành thạo Figma và xây dựng hệ thống thiết kế"
        ),
    },
    {
        "key": "MANUAL", "hm": "hm_qa", "hr": "hr2", "title": "Nhân viên Kiểm thử thủ công",
        "jobTitle": "kiểm thử phần mềm", "level": "Junior", "quantity": 2, "office": "Hà Nội", "arrangement": "ONSITE",
        "experience": "Từ 1 năm kiểm thử", "reason": "EXPANSION", "priority": "NORMAL",
        "salary": (10_000_000, 16_000_000), "approved": None,
        "skills": ["Kiểm thử thủ công", "Jira", "Postman"],
        "final": "REJECTED", "created": 30, "published": None, "posting": None,
        "rejectReason": "Ngân sách quý này đã dành cho vị trí Kiểm thử tự động. Phòng đề xuất lại vào quý sau nếu vẫn cần.",
        "note": "Khối lượng kiểm thử hồi quy tăng theo số tính năng.",
        "description": (
            "Kiểm thử chức năng cho cổng đối tác trước mỗi bản phát hành.\n"
            "Viết và thực hiện ca kiểm thử, ghi nhận lỗi trên Jira"
        ),
        "requirements": (
            "Từ 1 năm kinh nghiệm kiểm thử thủ công\n"
            "Cẩn thận, viết báo cáo lỗi rõ ràng"
        ),
    },
]
