# Prompt cho NotebookLM — Video Overview

## Cách làm
1. Tạo notebook mới trong NotebookLM, tải lên 3 nguồn:
   - `docs/notebooklm/01_CHAM_DIEM_CV_V2_TONG_HOP.md`
   - `docs/notebooklm/02_HOI_DAP_ON_TAP.md`
   - `docs/DE_XUAT_CHAM_DIEM_CV.md`
   Không tải `docs/KE_HOACH_TRIEN_KHAI_CHAM_DIEM_CV.md`: file này còn ghi trọng số 35/25/15/10/15 và xếp loại cũ (Phù hợp tốt / Tiềm năng), dễ làm video nói sai.
2. Cài đặt (biểu tượng bánh răng) → Ngôn ngữ đầu ra: **Tiếng Việt**.
3. Studio → Video Overview → bút chì (Tùy chỉnh) → định dạng **Giải thích (Explainer)** → dán đoạn prompt bên dưới vào ô "Bạn muốn video tập trung vào điều gì?".

## Prompt (copy từ đây)

Tạo video tiếng Việt khoảng 6–8 phút giúp một sinh viên ôn tập để trả lời giảng viên khi bảo vệ khóa luận về chức năng chấm điểm CV v2 trong hệ thống ATS. Người xem đã biết hệ thống làm gì, cần hiểu sâu để trả lời câu hỏi về input, output, cách xử lý và lý do.

Trình bày theo lối giảng viên hỏi — sinh viên đáp: mỗi phần mở bằng một câu hỏi giảng viên hay hỏi (ví dụ "Input của Gemini là gì?", "Vì sao không cho AI trả điểm?", "Vì sao hồ sơ 62,5 điểm lại Không phù hợp?"), dừng một nhịp, rồi giải thích ngắn gọn, rõ ràng như một câu trả lời mẫu.

Tập trung kỹ vào 3 phần, theo thứ tự:
1. Phần AI làm và phần code làm: AI (Gemini) chỉ làm việc cần đọc hiểu; code làm việc có quy tắc. Nêu rõ Gemini nhận gì (một tin nhắn: rubric, số năm hệ thống tính, yêu cầu JD, hồ sơ đã lọc thông tin cá nhân) và trả gì (mức 0–4 cho 3 tiêu chí kèm dẫn chứng nguyên văn, trạng thái từng yêu cầu, tóm tắt — không có điểm số). Giải thích vì sao không cho AI trả điểm và code kiểm tra lại AI ở đâu (chỉ nâng lên Đạt, không bao giờ hạ).
2. Cách tính điểm và xếp loại: 5 tiêu chí, thang 0–4 có mô tả mức; số năm theo 11 khoảng O*NET (ví dụ JD 3 năm: 2,5 năm mức 2, 1 năm mức 1, 5 năm mức 3, 7 năm mức 4); bậc học theo Khung trình độ quốc gia; yêu cầu bắt buộc là "cửa" riêng với 3 trạng thái; điểm = trung bình mức/4×100, trọng số bằng nhau; 4 quy tắc xếp loại theo đúng thứ tự với T = 62,5 ± 5 (57,5 và 67,5). Minh họa bằng bảng và các con số.
3. Cơ sở khoa học: gắn mỗi quyết định với nguồn của nó — O*NET Content Model (5 tiêu chí), BARS (mô tả mức), multiple hurdle của Ock & Oswald (yêu cầu bắt buộc), Dawes 1979 (trọng số bằng nhau), Chow 1970 (Chưa phân loại), Khung trình độ quốc gia và Thông tư 09/2022/TT-BGDĐT (bậc học, nhóm ngành 748). Mỗi nguồn chỉ cần một câu "nói gì và dùng vào đâu".

Kết bằng hai ví dụ thật, chỉ nêu kết quả cuối: hồ sơ đã tốt nghiệp đại học CNTT được 68,8 điểm, Phù hợp; hồ sơ sinh viên đang học được 62,5 điểm nhưng Không phù hợp vì chưa đạt yêu cầu tốt nghiệp — giải thích vì sao quy tắc "có yêu cầu bắt buộc Không đạt" được xét trước vùng điểm. Cuối video tóm tắt 5 câu hỏi quan trọng nhất kèm câu trả lời một dòng.

Lưu ý:
- Chỉ dùng thông tin hiện tại trong nguồn. Không nhắc trọng số 35/25/15/10/15 hay các xếp loại cũ "Phù hợp tốt", "Tiềm năng".
- Không kể quá trình sửa lỗi; đoạn "Phát hiện từ lần chạy thử" trong nguồn chỉ dùng để hiểu lý do của quy tắc.
- Nhấn mạnh AI chỉ gợi ý, HR là người quyết định.
- Đọc số theo kiểu Việt Nam (62,5; 68,8), giữ nguyên các thuật ngữ O*NET, BARS, multiple hurdle, Gemini, JSON.
- Nhắc tên vài module chủ chốt khi phù hợp (tách JD, tách CV, chấm mù, quy tắc code, gộp điểm và xếp loại) nhưng không đọc đường dẫn file dài.
