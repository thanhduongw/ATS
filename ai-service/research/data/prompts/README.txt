Hai prompt được đóng gói sẵn:
- prompt_A.txt: Baseline, không có rubric chi tiết.
- prompt_B.txt: Rubric + Evidence.

Có thể chỉnh trực tiếp file .txt để thống nhất với nhóm trước khi chạy nghiên cứu.
Chỉ để hướng dẫn trong prompt; tuyệt đối không ghi API key hoặc dữ liệu CV/JD thật vào file này.
Pipeline tự chèn cùng CV_JSON, JD_JSON, JSON schema và chính sách Certifications cho cả hai prompt.
Không sửa prompt trong một đợt chạy chính thức; thay đổi nội dung làm thay đổi prompt_hash và cache.
