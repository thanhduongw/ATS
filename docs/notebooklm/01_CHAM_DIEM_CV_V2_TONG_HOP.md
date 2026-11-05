# Chấm điểm CV v2 trong hệ thống ATS — tài liệu tổng hợp

> Tài liệu nguồn cho video ôn tập. Mô tả **trạng thái hiện tại** của chức năng chấm điểm CV (nhánh `feat/cham-diem-v2`, prompt chấm v2.3, trích xuất JD v1.1, trích xuất CV v1.3). Mọi con số trong tài liệu này là con số đang dùng trong code.

## 1. Chức năng làm gì

Khi ứng viên nộp hồ sơ vào một tin tuyển dụng, AI service (Python, FastAPI) tự chấm **mức độ phù hợp giữa CV và JD** (mô tả công việc) và đưa ra **gợi ý** một trong 3 trạng thái:

- **Phù hợp** (FIT)
- **Không phù hợp** (NOT_FIT)
- **Chưa phân loại** (UNCLASSIFIED) — AI không đủ chắc chắn hoặc CV thiếu thông tin, để HR xem tay.

AI không tự loại hay tự duyệt ứng viên. HR là người quyết định. Mỗi kết quả kèm điểm 0–100, lý do xếp loại, mức và dẫn chứng của từng tiêu chí, danh sách yêu cầu bắt buộc kèm trạng thái.

## 2. Nguyên tắc chia việc giữa AI và code

**Nguyên tắc:** AI (mô hình Gemini) chỉ làm việc cần **đọc hiểu ngôn ngữ**. Việc gì tính được bằng quy tắc rõ ràng thì **code** làm, để kết quả **lặp lại được** và **giải thích được**.

| Việc | Ai làm | Vì sao |
| --- | --- | --- |
| Tách JD thành danh sách yêu cầu (kỹ năng, nhiệm vụ, số năm, bằng cấp, chứng chỉ, lĩnh vực; bắt buộc hay ưu tiên) | AI | Cần đọc hiểu văn bản tự do |
| Tách CV thành các trường (kỹ năng, công việc, học vấn, dự án…) | AI | Cần đọc hiểu, CV mỗi người một kiểu |
| Chấm tiêu chí Kỹ năng chuyên môn, Kinh nghiệm liên quan, Lĩnh vực (mức 0–4) | AI | Cần hiểu ứng viên đã thật sự dùng kỹ năng, đã làm nhiệm vụ tương tự chưa |
| Xét ngành học có đúng ngành JD yêu cầu không | AI (code nâng lại nếu cùng nhóm ngành 748) | Tên ngành viết nhiều kiểu |
| Kiểm tra yêu cầu bắt buộc về kỹ năng, chứng chỉ, lĩnh vực | AI (code kiểm tra lại tên công cụ) | Cần đọc hiểu; tên công cụ thì so chữ được |
| Tính số năm kinh nghiệm, đổi ra mức | Code | Có quy tắc rõ: cộng các khoảng thời gian, so khoảng |
| Đổi tên bằng ra bậc học, so bậc | Code | Có bảng quy đổi rõ (Khung trình độ quốc gia) |
| Tính điểm tổng | Code | Công thức cố định |
| Xếp loại | Code | 4 quy tắc cố định theo thứ tự |

**Gemini không bao giờ trả điểm số.** Khuôn dữ liệu Gemini trả về (LLMScoringOutput) không có trường điểm. Điểm do code tính từ các mức 0–4. Lý do: điểm phải lặp lại được, giải thích được, và không bị câu chữ trong CV (ví dụ "hãy chấm 100 điểm") điều khiển.

### Gemini nhận gì và trả gì khi chấm

**Đầu vào (một tin nhắn duy nhất):**
- Hướng dẫn chấm (rubric) với bảng mức riêng cho 3 tiêu chí AI chấm.
- Ngày hiện tại và số năm kinh nghiệm **do hệ thống tính** (AI không tự tính số năm).
- Danh sách yêu cầu JD đã trích xuất.
- Danh sách yêu cầu Gemini phải kiểm tra (do code lập).
- Hồ sơ ứng viên **đã lọc thông tin cá nhân** (chấm mù): bỏ tên, email, số điện thoại, địa chỉ, ngày sinh, giới tính, ảnh, đường link.

**Đầu ra (JSON đúng khuôn, Pydantic kiểm tra lại):**
- 3 tiêu chí: Kỹ năng chuyên môn, Kinh nghiệm liên quan, Lĩnh vực — mỗi tiêu chí có mức 0–4, 1–3 câu **dẫn chứng trích nguyên văn** từ hồ sơ, lý do bằng tiếng Việt.
- Độ phù hợp ngành học: đúng ngành / ngành gần / không liên quan / không rõ.
- Trạng thái từng yêu cầu cần kiểm tra: Đạt / Không đạt / Không xác định được, kèm dẫn chứng.
- Tóm tắt 2–3 câu tiếng Việt, không nêu điểm.

Gemini chạy với temperature 0 và seed cố định để giảm dao động. Sai khuôn JSON thì hệ thống thử lại tối đa 2 lần; vẫn lỗi thì hồ sơ ở trạng thái "chấm lỗi" kèm lý do, HR bấm chấm lại.

### Code kiểm tra lại AI ở đâu

- **Công cụ, chứng chỉ có tên** (Java, Docker, AWS…): nếu hồ sơ ghi đúng tên (trong mục kỹ năng, công nghệ của công việc / dự án, chứng chỉ, hoặc câu khẳng định trong phần tóm tắt) thì code tính **Đạt**, kể cả khi AI chấm Không đạt, và ghi dẫn chứng "Hồ sơ ghi: …". Code **chỉ nâng lên Đạt, không bao giờ hạ** kết quả của AI. Câu chỉ mong muốn ("mong muốn học Kubernetes") không được tính.
- **Ngành học cùng nhóm 748**: AI chấm "ngành gần" mà hai ngành cùng nhóm 748 thì code nâng thành đúng ngành.
- **Tiêu chí nào áp dụng** do code quyết định từ JD, không theo AI.

## 3. Sáu bước chấm

| Bước | Việc | Ai làm |
| --- | --- | --- |
| 1 | Phân tích JD thành danh sách yêu cầu (bắt buộc / ưu tiên) | AI |
| 2 | Chọn 5 tiêu chí theo O*NET | Cố định |
| 3 | Chấm từng tiêu chí mức 0–4 theo mô tả mức riêng | Code (số năm, bậc học) + AI (3 tiêu chí còn lại) |
| 4 | Kiểm tra yêu cầu bắt buộc: Đạt / Không đạt / Không xác định được | Code + AI |
| 5 | Tính điểm tổng, trọng số bằng nhau | Code |
| 6 | Xếp loại Phù hợp / Không phù hợp / Chưa phân loại | Code |

### Bước 1 — Phân tích JD

JD (tiêu đề, kinh nghiệm yêu cầu, mô tả, yêu cầu, và **các kỹ năng HR chọn trong form tin**) được AI tách một lần thành danh sách yêu cầu. Mọi CV ứng tuyển cùng tin đều so với cùng danh sách này. Kết quả lưu lại theo mã băm nội dung JD; HR sửa JD thì hệ thống tự tách lại.

Quy tắc khi tách:
- "bắt buộc", "tối thiểu", "required", "must" → **bắt buộc**; "ưu tiên", "là lợi thế", "preferred", "nice to have" → **ưu tiên**.
- Mỗi kỹ năng HR chọn trong form tin là một yêu cầu **bắt buộc**.
- Lựa chọn thay thế như "MySQL/PostgreSQL" là **một** yêu cầu "MySQL hoặc PostgreSQL" — ứng viên có một trong hai là Đạt.
- Bằng cấp giữ nguyên chữ JD ghi; code mới đổi ra bậc.
- Không lấy kỹ năng mềm, lương, quyền lợi.

### Bước 2 — 5 tiêu chí theo O*NET Content Model

| Tiêu chí | Nhóm O*NET | Câu hỏi khi đọc CV |
| --- | --- | --- |
| Kỹ năng chuyên môn | Worker Requirements: Skills | Có các kỹ năng JD cần không, đã thật sự dùng chưa? |
| Kinh nghiệm liên quan | Occupation-Specific Information: Tasks | Đã làm những nhiệm vụ giống JD chưa? |
| Số năm kinh nghiệm | Experience Requirements | Đủ số năm JD yêu cầu chưa? |
| Học vấn và chứng chỉ | Worker Requirements: Education; Licensing | Đủ bậc học, đúng ngành, có chứng chỉ JD cần không? |
| Lĩnh vực, ngành | Worker Requirements: Knowledge | Có kiến thức về ngành JD nêu không? |

Không chấm tính cách, năng lực bẩm sinh từ CV (dễ gây thiên vị, để dành cho phỏng vấn).

### Bước 3 — Chấm từng tiêu chí mức 0–4

**Kỹ năng chuyên môn (AI):**
- 0: không có kỹ năng bắt buộc nào.
- 1: chỉ có kỹ năng gần / thay thế, hoặc chỉ liệt kê tên mà không có công việc hay dự án nào dùng.
- 2: có bằng chứng dùng một phần kỹ năng bắt buộc, còn thiếu kỹ năng cốt lõi.
- 3: có bằng chứng dùng tất cả hoặc gần như tất cả kỹ năng bắt buộc.
- 4: đạt mức 3 và có thêm phần lớn kỹ năng ưu tiên, hoặc dùng ở phạm vi lớn hơn yêu cầu.

**Kinh nghiệm liên quan (AI):** 0 chưa có gì liên quan; 1 làm nghề khác, trùng vài nhiệm vụ lẻ; 2 vai trò gần hoặc đúng vai trò nhưng chỉ thực tập / dự án cá nhân; 3 đã làm chính thức vai trò tương tự; 4 đạt mức 3 và đảm nhận trách nhiệm cao hơn.

**Lĩnh vực (AI):** 0 không có dấu hiệu; 1 chỉ làm ngành khác; 2 ngành gần hoặc tiếp xúc ngắn; 3 đã làm đúng ngành; 4 làm lâu và có kiến thức chuyên sâu.

**Số năm kinh nghiệm (code)** — theo 11 khoảng kinh nghiệm của O*NET: không có; đến 1 tháng; 1–3 tháng; 3–6 tháng; 6 tháng–1 năm; 1–2 năm; 2–4 năm; 4–6 năm; 6–8 năm; 8–10 năm; trên 10 năm. Code cộng các khoảng làm việc (gộp khoảng chồng nhau), đổi ra khoảng, so với khoảng của N (số năm JD yêu cầu):
- 0: không có kinh nghiệm trong khi JD yêu cầu có.
- 1: ít hơn N và thấp hơn khoảng của N từ 2 khoảng trở lên.
- 2: ít hơn N, cùng khoảng hoặc thấp hơn 1 khoảng.
- 3: từ N trở lên, chưa cao hơn quá 1 khoảng.
- 4: cao hơn khoảng của N từ 2 khoảng trở lên.

Ví dụ JD yêu cầu 3 năm (khoảng 2–4 năm): 2,5 năm → mức 2; 1 năm → mức 1; 5 năm → mức 3; 7 năm → mức 4. JD không ghi số năm thì tiêu chí không áp dụng.

**Học vấn và chứng chỉ (code so bậc + AI xét ngành)** — bậc theo Khung trình độ quốc gia Việt Nam: sơ cấp bậc 2, trung cấp 4, cao đẳng 5, đại học / kỹ sư / cử nhân 6, thạc sĩ 7, tiến sĩ 8 (bằng nước ngoài quy đổi tương ứng: bachelor 6, master 7, PhD 8).
- 0: thấp hơn bậc JD yêu cầu từ 2 bậc trở lên.
- 1: thấp hơn 1 bậc; hoặc đủ bậc nhưng ngành không liên quan.
- 2: đủ bậc, ngành gần; hoặc thiếu chứng chỉ bắt buộc.
- 3: đủ bậc, đúng ngành (hoặc JD không giới hạn ngành), đủ chứng chỉ bắt buộc.
- 4: cao hơn bậc **cao nhất** JD nêu với ngành phù hợp; hoặc đạt mức 3 và có thêm chứng chỉ ưu tiên.

Chi tiết:
- JD ghi "Cao đẳng/Đại học": bậc **tối thiểu** để Đạt là Cao đẳng (bậc 5); ứng viên có bằng đại học là đúng yêu cầu (mức 3), có thạc sĩ mới là cao hơn (mức 4).
- CV chỉ ghi tên trường ("Đại học Bách Khoa", 2016–2020) mà không ghi bằng: nếu đã học xong thì suy bậc từ tên trường (Đại học / Học viện / University → bậc 6; Cao đẳng / College → bậc 5).
- **Ứng viên đang học** (đến nay / năm kết thúc ở tương lai): chưa có văn bằng. Đang học đúng bậc và đúng ngành → mức 2; các trường hợp đang học khác → mức 1.
- **Nhóm ngành 748** "Máy tính và công nghệ thông tin" theo Thông tư 09/2022/TT-BGDĐT: Khoa học máy tính, Mạng máy tính và truyền thông dữ liệu, Kỹ thuật phần mềm, Hệ thống thông tin, Kỹ thuật máy tính, Trí tuệ nhân tạo, Công nghệ kỹ thuật máy tính, Công nghệ thông tin, An toàn thông tin. Hai ngành cùng nhóm được tính là **đúng ngành**.

### Bước 4 — Yêu cầu bắt buộc

Yêu cầu bắt buộc được kiểm tra riêng như một "cửa" phải qua, **không gộp vào điểm tổng**. Mỗi yêu cầu có một trong 3 trạng thái: **Đạt**, **Không đạt**, **Không xác định được** (CV thiếu hẳn phần liên quan).

| Loại yêu cầu | Kiểm tra bằng | Tên hiển thị |
| --- | --- | --- |
| Số năm tối thiểu (chỉ khi JD đòi hơn 0 năm) | Code | "Tối thiểu N năm kinh nghiệm" |
| Bậc học tối thiểu | Code | "Tốt nghiệp từ Cao đẳng (bậc 5) trở lên" |
| Kỹ năng, chứng chỉ, lĩnh vực bắt buộc | AI, code kiểm tra lại tên công cụ | tên kỹ năng |

Quy ước:
- Hồ sơ đầy đủ mà **không nhắc tới** một yêu cầu → **Không đạt**, không phải Không xác định được (CV là nơi ứng viên tự trình bày).
- Kiến thức nền (OOP, cấu trúc dữ liệu và giải thuật) được tính Đạt khi CV có công việc hoặc ngành học **chắc chắn** dùng đến nó (ví dụ lập trình Java thể hiện OOP); dẫn chứng phải là việc đã làm / đã học, không phải câu định hướng.
- Đang học mà JD đòi đã tốt nghiệp → yêu cầu bậc học **Không đạt** (thông tin đã đủ), dẫn chứng "Chưa tốt nghiệp: đang học …".

### Bước 5 — Điểm tổng

```
Điểm = trung bình của (mức_i / 4 × 100), chỉ tính các tiêu chí áp dụng và có mức
```

Trọng số **bằng nhau**. Tiêu chí JD không nhắc tới bị bỏ, phần còn lại chia đều. Ví dụ mức 3, 2, 3, 3 (một tiêu chí không áp dụng): (75 + 50 + 75 + 75) / 4 = 68,75 → làm tròn 68,8.

### Bước 6 — Xếp loại

Ngưỡng T = 62,5 (giữa mức 2 và mức 3), vùng không chắc chắn ± δ = 5, tức 57,5 đến 67,5. Xét **theo thứ tự**, gặp điều kiện nào trước thì dừng:

1. **Chưa phân loại** nếu không tính được điểm, hoặc có yêu cầu bắt buộc "Không xác định được".
2. **Không phù hợp** nếu có yêu cầu bắt buộc "Không đạt", hoặc điểm dưới 57,5.
3. **Chưa phân loại** nếu điểm từ 57,5 đến dưới 67,5.
4. **Phù hợp** nếu đạt mọi yêu cầu bắt buộc và điểm từ 67,5 trở lên.

Quy tắc 1 đứng trước quy tắc 2: thiếu thông tin thì không kết luận. Một hồ sơ điểm cao vẫn Không phù hợp nếu thiếu một yêu cầu bắt buộc, vì yêu cầu bắt buộc là "cửa" phải qua trước. T và δ là giá trị khởi đầu, sẽ hiệu chỉnh trên tập dữ liệu hiệu chỉnh.

## 4. Cơ sở khoa học — mỗi quyết định dựa trên gì

| Quyết định | Cơ sở | Ý chính |
| --- | --- | --- |
| Tách JD thành yêu cầu trước khi chấm | Phân tích công việc (job analysis) — Brannick, Cadle & Levine (2012) | Xác định công việc cần kiến thức, kỹ năng gì là nền để đặt tiêu chí tuyển chọn |
| 5 tiêu chí | O*NET Content Model (Bộ Lao động Hoa Kỳ) | Khung chuẩn mô tả yêu cầu nghề nghiệp; tách Knowledge (nguyên lý) khỏi Technology Skills (công cụ có tên) |
| Mỗi mức có mô tả cụ thể | Thang có neo BARS — Smith & Kendall (1963); đánh giá có cấu trúc — Campion và cộng sự (1997) | Mô tả mức cụ thể giúp người (và AI) chấm hiểu giống nhau, tăng độ tin cậy |
| LLM chấm theo tiêu chí định sẵn | G-Eval — Liu và cộng sự (EMNLP 2023) | LLM chấm theo rubric gần với đánh giá của người hơn |
| Yêu cầu bắt buộc là "cửa" riêng | Mô hình sàng lọc nhiều vòng (multiple hurdle) — Ock & Oswald (2018) | Vòng 1 kiểm tra yêu cầu tối thiểu, qua mới xét điểm |
| Trọng số bằng nhau | Dawes (1979), "The robust beauty of improper linear models" | Trên dữ liệu mới, trọng số bằng nhau tốt ngang hoặc hơn trọng số "tối ưu" và hơn phán đoán chuyên gia |
| Có trạng thái Chưa phân loại | Tùy chọn từ chối phân loại — Chow (1970) | Cho hệ thống "không trả lời" khi không chắc thì tỉ lệ sai trên phần còn lại giảm |
| Bậc học | Khung trình độ quốc gia Việt Nam (Quyết định 39/2026/QĐ-TTg) | 8 bậc, quy đổi bằng thống nhất |
| Nhóm ngành 748 | Thông tư 09/2022/TT-BGDĐT | Danh mục thống kê ngành đào tạo giáo dục đại học |
| AI chỉ là gợi ý | Vaishampayan và cộng sự (Findings of NAACL 2025) | Điểm của LLM là gợi ý ban đầu cho HR, không thay người |

Các phần là **quy ước của nhóm** (sẽ kiểm chứng ở phần thí nghiệm): ranh giới định tính trong mô tả mức, cách so khoảng kinh nghiệm, T = 62,5 và δ = 5, quy đổi bằng nước ngoài, suy bậc từ tên trường, kiến thức nền từ công việc / ngành học, nhóm ngành 748 tính đúng ngành.

## 5. Ví dụ thật (kết quả cuối)

Tin "Backend Developer (Fresher)". Yêu cầu bắt buộc sau khi trích xuất: OOP, Cấu trúc dữ liệu và giải thuật, MySQL hoặc PostgreSQL, SQL, Java, Spring Boot, PostgreSQL, Docker, CI/CD, REST API; tốt nghiệp từ Cao đẳng (bậc 5) trở lên; JD ghi 0 năm kinh nghiệm nên không có yêu cầu số năm. JD không nêu lĩnh vực nên tiêu chí Lĩnh vực không áp dụng.

**Hồ sơ A — đã tốt nghiệp đại học ngành CNTT:**

| Tiêu chí | Mức | Điểm tiêu chí |
| --- | --- | --- |
| Kỹ năng chuyên môn | 3 | 75 |
| Kinh nghiệm liên quan | 2 (dự án học tập) | 50 |
| Số năm kinh nghiệm | 3 (JD không yêu cầu số năm tối thiểu) | 75 |
| Học vấn và chứng chỉ | 3 (Đại học, đúng yêu cầu "Cao đẳng/Đại học") | 75 |
| Lĩnh vực | không áp dụng | — |

Điểm = (75 + 50 + 75 + 75) / 4 = 68,8. Đạt mọi yêu cầu bắt buộc, điểm ≥ 67,5 → **Phù hợp**. Lý do hiển thị: "Đạt mọi yêu cầu bắt buộc và điểm 68,8 từ 67,5 trở lên."

**Hồ sơ B — sinh viên đang học kỹ sư Kỹ thuật phần mềm (dự kiến tốt nghiệp 2027):**

| Tiêu chí | Mức | Điểm tiêu chí |
| --- | --- | --- |
| Kỹ năng chuyên môn | 3 | 75 |
| Kinh nghiệm liên quan | 2 | 50 |
| Số năm kinh nghiệm | 3 | 75 |
| Học vấn và chứng chỉ | 2 (đang học đúng bậc, đúng ngành, chưa tốt nghiệp) | 50 |
| Lĩnh vực | không áp dụng | — |

Điểm = (75 + 50 + 75 + 50) / 4 = 62,5 — nằm trong vùng chưa chắc chắn, nhưng quy tắc 2 xét trước: yêu cầu "Tốt nghiệp từ Cao đẳng (bậc 5) trở lên" **Không đạt** → **Không phù hợp**. Lý do hiển thị: "Không đạt yêu cầu bắt buộc: Tốt nghiệp từ Cao đẳng (bậc 5) trở lên." Dẫn chứng: "Chưa tốt nghiệp: đang học Kỹ sư (bậc 6) — Đại học Công nghiệp TP.HCM (IUH), 10/2022 – Hiện tại (dự kiến tốt nghiệp 2027)".

Hai hồ sơ có kỹ năng gần giống nhau; khác biệt quyết định nằm ở yêu cầu bắt buộc về tốt nghiệp — đúng tinh thần "cửa phải qua trước".

## 6. Kết quả được dùng thế nào

- Lưu ở bảng `ai_scores` (AI service), kèm phiên bản prompt, model, mã bản trích xuất CV và JD để truy vết.
- Gửi sự kiện cho application-service để lưu điểm và xếp loại lên hồ sơ — HR lọc theo 3 xếp loại, sắp theo điểm.
- Thẻ AI ở tab Hồ sơ của trang chi tiết: lý do xếp loại, 5 tiêu chí (mở ra xem dẫn chứng), yêu cầu bắt buộc gom vào tiêu chí tương ứng, dòng "AI chỉ gợi ý; HR là người quyết định".
