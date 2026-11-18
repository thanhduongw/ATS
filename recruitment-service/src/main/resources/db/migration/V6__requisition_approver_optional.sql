-- Mọi Chuyên viên tuyển dụng đều duyệt được yêu cầu: không còn người duyệt cố định.
-- approver_id giờ là "người đã xử lý gần nhất" (duyệt / yêu cầu sửa / từ chối), trống khi chưa ai xử lý.
ALTER TABLE job_requisition ALTER COLUMN approver_id DROP NOT NULL;
