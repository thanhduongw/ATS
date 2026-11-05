# SSRC-II 2026 — cập nhật 100 CV

- 100 CV duy nhất: 49 Backend, 8 Frontend, 43 Fullstack.
- 100 cặp trong `research/data/pairs.csv`: mỗi CV đúng một JD; bảo toàn nguyên 75 cặp cũ.
- 25 cặp thêm: 22 cùng nhóm và 3 ghép chéo do nội dung CV. Lý do ghép được cung cấp riêng cho người điều phối, KHÔNG để người chấm đọc trước.
- Chưa gán nhãn phù hợp/không phù hợp; không có điểm AI giả định.
- Bộ 100 PDF đã đổi tên được cung cấp dưới dạng TAR.ZST RIÊNG; đặt các thư mục Backend/Frontend/Fullstack vào `research/data/cvs/`.
- Sáu tệp `research/data/jds/JD-*.txt` trong mã nguồn là PLACEHOLDER; thay bằng nguyên văn JD đã kiểm chứng trước khi chấm/đưa Gemini. Việc gọi API cần xử lý riêng và ẩn danh cả text và JSON.

Chạy tại `ai-service`:

```powershell
.\.venv-research\Scripts\python.exe -m research.preflight
.\.venv-research\Scripts\python.exe -m research.preflight --require-jds
.\.venv-research\Scripts\python.exe -m unittest discover -s research\tests -v
```

`--require-jds` sẽ báo thiếu nếu JD còn là mẫu. Đây là kiểm tra hữu ích, không phải lỗi Python.

Quy tắc chứng chỉ: REQUIRED/PREFERRED đều đánh giá trên thang 1–5; N/A chỉ khi JD không đề cập. Trường hợp chứng chỉ ngoại ngữ hoặc năng lực tương đương cần được thống nhất với HR.
