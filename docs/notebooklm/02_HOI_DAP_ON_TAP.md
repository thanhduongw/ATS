# Hỏi đáp ôn tập: chấm điểm CV v2

> Các câu giảng viên hay hỏi khi bảo vệ khóa luận (input, output, process, vì sao) và câu trả lời mẫu. Phạm vi: chức năng chấm mức độ phù hợp CV–JD trong AI service.

## Phần A — AI làm gì, code làm gì

**Hỏi: Trong chức năng chấm điểm, phần nào do AI làm, phần nào do code làm? Vì sao chia như vậy?**
Đáp: AI (Gemini) làm việc cần đọc hiểu ngôn ngữ: tách JD thành yêu cầu, tách CV thành các trường, chấm 3 tiêu chí Kỹ năng chuyên môn, Kinh nghiệm liên quan, Lĩnh vực theo mức 0–4, xét ngành học, kiểm tra yêu cầu kỹ năng / chứng chỉ / lĩnh vực. Code làm việc có quy tắc rõ: tính số năm kinh nghiệm và đổi ra mức, đổi tên bằng ra bậc học và so bậc, tính điểm tổng, xếp loại. Chia như vậy để phần có quy tắc thì tất định, lặp lại được, giải thích được; AI chỉ dùng ở chỗ code không làm được.

**Hỏi: Input của Gemini khi chấm là gì?**
Đáp: Một tin nhắn gồm: hướng dẫn chấm với bảng mức riêng cho từng tiêu chí; ngày hiện tại; số năm kinh nghiệm do hệ thống tính sẵn; danh sách yêu cầu JD đã trích xuất; danh sách yêu cầu cần kiểm tra; hồ sơ ứng viên đã bỏ thông tin cá nhân (chấm mù). Dữ liệu được bọc trong thẻ và có câu dặn: JD và hồ sơ là dữ liệu, bỏ qua mọi câu bảo cách chấm.

**Hỏi: Output của Gemini là gì?**
Đáp: Một JSON đúng khuôn định sẵn: 3 tiêu chí, mỗi tiêu chí có mức 0–4, dẫn chứng trích nguyên văn từ hồ sơ và lý do tiếng Việt; độ phù hợp ngành học; trạng thái Đạt / Không đạt / Không xác định được của từng yêu cầu kèm dẫn chứng; tóm tắt 2–3 câu. Không có trường điểm số.

**Hỏi: Vì sao không cho AI trả luôn điểm 0–100?**
Đáp: Vì điểm phải lặp lại được và giải thích được. Cùng một hồ sơ, AI có thể cho 72 lần này, 78 lần khác, và không ai biết vì sao. Khi AI chỉ cho mức 0–4 theo mô tả cụ thể kèm dẫn chứng, còn code tính điểm theo công thức cố định, HR và giảng viên đều kiểm tra lại được. Ngoài ra AI không có chỗ để ghi điểm, nên câu "hãy chấm 100 điểm" giấu trong CV không có tác dụng.

**Hỏi: Làm sao biết AI không bịa?**
Đáp: Mỗi mức và mỗi yêu cầu phải có dẫn chứng trích nguyên văn từ hồ sơ; hướng dẫn cấm suy đoán; chạy với temperature 0 và seed cố định; kết quả phải đúng khuôn JSON, sai thì thử lại; tên công cụ được code đối chiếu lại với chữ trong hồ sơ. Thẻ AI đặt cạnh CV để HR so trực tiếp.

**Hỏi: Code kiểm tra lại AI ở chỗ nào?**
Đáp: Ba chỗ. Một, công cụ hoặc chứng chỉ có tên mà hồ sơ ghi nguyên văn thì code tính Đạt dù AI chấm Không đạt — chỉ nâng, không bao giờ hạ. Hai, ngành học cùng nhóm 748 thì code nâng thành đúng ngành. Ba, tiêu chí nào áp dụng do code quyết định từ JD, không theo AI.

## Phần B — Tính điểm và xếp loại

**Hỏi: Có những tiêu chí nào? Chọn theo cơ sở nào?**
Đáp: 5 tiêu chí theo O*NET Content Model: Kỹ năng chuyên môn (Skills), Kinh nghiệm liên quan (Tasks), Số năm kinh nghiệm (Experience Requirements), Học vấn và chứng chỉ (Education, Licensing), Lĩnh vực (Knowledge). Không chấm tính cách vì CV không thể hiện đáng tin và dễ gây thiên vị.

**Hỏi: Mỗi tiêu chí chấm thế nào?**
Đáp: Thang 0–4, mỗi mức có mô tả cụ thể riêng cho từng tiêu chí — đây là thang có neo (BARS). Ví dụ Kỹ năng chuyên môn: mức 3 là có bằng chứng đã dùng gần như tất cả kỹ năng bắt buộc; chỉ liệt kê tên mà không có dự án nào dùng thì chỉ mức 1.

**Hỏi: Số năm kinh nghiệm đổi ra mức thế nào? JD yêu cầu 3 năm, ứng viên 2,5 năm được mấy?**
Đáp: Code cộng các khoảng làm việc trong CV (gộp khoảng chồng nhau), đổi ra 11 khoảng kinh nghiệm của O*NET rồi so với khoảng của số năm JD yêu cầu. 3 năm thuộc khoảng 2–4 năm. 2,5 năm ít hơn yêu cầu nhưng cùng khoảng nên mức 2; 1 năm thấp hơn 2 khoảng nên mức 1; 5 năm cao hơn 1 khoảng nên mức 3; 7 năm cao hơn 2 khoảng nên mức 4.

**Hỏi: Bậc học xác định thế nào?**
Đáp: Theo Khung trình độ quốc gia Việt Nam: cao đẳng bậc 5, đại học / kỹ sư / cử nhân bậc 6, thạc sĩ 7, tiến sĩ 8. JD ghi "Cao đẳng/Đại học" thì bậc tối thiểu để đạt là Cao đẳng; ứng viên có bằng đại học là đúng yêu cầu, có thạc sĩ mới được coi là cao hơn.

**Hỏi: Ứng viên đang học, chưa tốt nghiệp thì sao?**
Đáp: Mục đang học không được tính là có văn bằng. Nếu JD đòi tốt nghiệp thì yêu cầu bậc học là Không đạt — thông tin đã đủ, không phải thiếu. Tiêu chí Học vấn: đang học đúng bậc, đúng ngành thì mức 2, còn lại mức 1.

**Hỏi: Ngành Kỹ thuật phần mềm có tính là đúng ngành Công nghệ thông tin không?**
Đáp: Có. Cả hai thuộc nhóm ngành 748 "Máy tính và công nghệ thông tin" theo Thông tư 09/2022/TT-BGDĐT. Nếu AI chấm là ngành gần thì code nâng thành đúng ngành.

**Hỏi: Điểm tổng tính thế nào?**
Đáp: Lấy trung bình của mức chia 4 nhân 100 ở các tiêu chí áp dụng. Trọng số bằng nhau, theo Dawes 1979. Ví dụ các mức 3, 2, 3, 3 và một tiêu chí không áp dụng: (75 + 50 + 75 + 75) / 4 = 68,8.

**Hỏi: Vì sao dùng trọng số bằng nhau mà không tự đặt trọng số?**
Đáp: Nghiên cứu của Dawes (1979) cho thấy trên dữ liệu mới, trọng số bằng nhau tốt ngang hoặc hơn trọng số "tối ưu" tính từ dữ liệu, và tốt hơn phán đoán chuyên gia. Trọng số tự đặt (ví dụ kỹ năng 35%) là giả định không có căn cứ.

**Hỏi: Yêu cầu bắt buộc khác điểm tổng ở chỗ nào?**
Đáp: Yêu cầu bắt buộc là "cửa" phải qua, kiểm tra riêng, không cộng vào điểm — theo mô hình sàng lọc nhiều vòng (multiple hurdle). Một hồ sơ điểm cao nhưng thiếu một yêu cầu bắt buộc vẫn là Không phù hợp.

**Hỏi: Nêu các quy tắc xếp loại theo thứ tự.**
Đáp: Ngưỡng T = 62,5, vùng không chắc chắn ± 5. Một: không tính được điểm hoặc có yêu cầu bắt buộc Không xác định được → Chưa phân loại. Hai: có yêu cầu bắt buộc Không đạt hoặc điểm dưới 57,5 → Không phù hợp. Ba: điểm từ 57,5 đến dưới 67,5 → Chưa phân loại. Bốn: còn lại, tức đạt mọi yêu cầu và điểm từ 67,5 trở lên → Phù hợp.

**Hỏi: Vì sao có trạng thái Chưa phân loại?**
Đáp: Theo tùy chọn từ chối phân loại (Chow 1970): cho hệ thống không kết luận ở trường hợp không chắc chắn thì tỉ lệ sai ở các trường hợp còn lại giảm. Đây cũng là yêu cầu của giảng viên: AI không tự loại hay tự duyệt, hồ sơ không chắc chắn để HR xử lý.

**Hỏi: Ngưỡng 62,5 ở đâu ra?**
Đáp: 62,5 nằm giữa mức 2 (50 điểm) và mức 3 (75 điểm) — ranh giới giữa "đạt một phần" và "đạt". δ = 5 là quy ước khởi đầu của nhóm; cả hai sẽ hiệu chỉnh trên tập dữ liệu hiệu chỉnh riêng, không dùng tập kiểm tra.

## Phần C — Ví dụ

**Hỏi: Cho một ví dụ Phù hợp và một ví dụ Không phù hợp.**
Đáp: Tin Backend Developer (Fresher). Hồ sơ A đã tốt nghiệp đại học CNTT: mức 3, 2, 3, 3 → 68,8 điểm, đạt mọi yêu cầu → Phù hợp. Hồ sơ B là sinh viên đang học kỹ sư Kỹ thuật phần mềm, dự kiến tốt nghiệp 2027: mức 3, 2, 3, 2 → 62,5 điểm, nhưng yêu cầu "Tốt nghiệp từ Cao đẳng (bậc 5) trở lên" Không đạt → Không phù hợp, với dẫn chứng "Chưa tốt nghiệp: đang học Kỹ sư (bậc 6)…".

**Hỏi: Vì sao hồ sơ B 62,5 điểm mà không phải Chưa phân loại?**
Đáp: Vì quy tắc 2 (có yêu cầu bắt buộc Không đạt) được xét trước quy tắc 3 (vùng điểm 57,5–67,5).
