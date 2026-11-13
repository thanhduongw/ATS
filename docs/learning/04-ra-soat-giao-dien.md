# 04 · Rà soát giao diện web so với `docs/UI` (05/11/2026)

> Mục đích: liệt kê chỗ web **khác** HTML mẫu và chỗ **phải cuộn dọc**, để người dùng duyệt trước khi sửa.
> Quyết định nền (04/11/2026): web y như HTML mẫu · hạn chế cuộn, bảng dài **phân trang vừa 1 màn hình**
> và phải đúng ở **mọi kích thước màn hình** · lịch phỏng vấn chỉ 1 giờ cố định, ứng viên Đồng ý / Từ chối
> (thêm trạng thái `CANDIDATE_DECLINED` "Ứng viên xin dời").

## 1. Cách rà soát

1. **Đo tự động** từng màn web (dữ liệu thật trên máy dev) bằng script chạy trong trình duyệt:
   - phần phải cuộn = chiều cao nội dung − chiều cao vùng nhìn thấy (của trang và của khung cuộn bên trong);
   - nhãn của HTML mẫu (tiêu đề, nút, tab, tên cột) có xuất hiện trên trang không.
   Viewport lúc đo: **1046 × 768** (HR) và **1046 × 720** (các vai còn lại) — cửa sổ Chrome trên máy dev.
2. **Đo chiều cao HTML mẫu** ở khung 1440 × 900 (khổ thiết kế của bản mẫu).
3. **Kiểm tra trong code** những nhãn bị báo thiếu, để tách "thiếu thật" khỏi "chỉ do dữ liệu mẫu khác"
   (tên công ty Vexo, tên việc làm, tên người trong bản mẫu luôn khác dữ liệu thật → bỏ qua).

Script và số liệu thô: thư mục scratchpad `audit/` (không đưa vào repo).

## 2. Kết luận chính

- **Bản mẫu được thiết kế cho vừa 1 màn hình 1440 × 900**: gần hết màn danh sách và màn chính cao đúng 900.
  Chỉ các màn chi tiết/biểu mẫu dài hơn: R03 1481, R04/R05 1481, R07 1335, R11 1445, R24 1150, R16 1037,
  R01 1068, R46 997; trang công khai cho ứng viên dài theo kiểu trang giới thiệu (C01 2532, C03 1928, C02 1367).
- **Web hiện tại cuộn nhiều hơn mẫu** ở cùng khổ màn: lý do chung là khoảng cách, thẻ và bảng cao hơn mẫu,
  khung lề lớn, và các trang chi tiết xếp mọi khối theo chiều dọc thay vì chia cột/tab như mẫu.
- **Danh sách** hiện ít dữ liệu nên chưa cuộn (R02, R25, R40, H04, C11…), nhưng sẽ cuộn khi nhiều dòng → cần
  phân trang tự tính theo chiều cao (mục 5.1).

## 3. Màn phải cuộn (số đo thật)

Cột "Phải cuộn" = số px nội dung vượt vùng nhìn thấy. "Mẫu" = chiều cao HTML mẫu ở 1440 × 900 (900 = vừa 1 màn).

| Mã | Màn | Phải cuộn | Mẫu | Ghi chú |
|---|---|---|---|---|
| R24 | Soạn thư mời | **2232** | 1150 | biểu mẫu 4 khối xếp dọc; mẫu chia 2 cột (điều khoản + xem trước) |
| R46 / H14 | Viết đánh giá | **1325 / 1373** | 997 | 8 tiêu chí × (sao + ô nhận xét); mẫu gọn hơn: nhận xét "+ Thêm nhận xét" mở khi cần |
| A08 | Thông tin doanh nghiệp | **1386** | (đang đo) | 4 khối xếp dọc |
| H05 | Tạo yêu cầu tuyển dụng | **1101** | (đang đo) | 4 phần xếp dọc |
| A01 | Tổng quan (quản trị) | **1083** | (đang đo) | thẻ chỉ số + bảng + phễu + cần chú ý xếp dọc |
| R31 | Thông báo | **1058** | 900 | danh sách thông báo không phân trang |
| R03 | Chi tiết yêu cầu | **844** | 1481 | mẫu cũng dài |
| Nhật ký | Nhật ký hệ thống | **772** | — | bảng không phân trang theo màn |
| C03 / C29 | Chi tiết việc làm (công khai) | **698 / 330** | 1928 | mẫu cũng dài (trang giới thiệu) |
| H07 | Chi tiết yêu cầu đã duyệt | **631** | (đang đo) | |
| A05 | Chi tiết người dùng | **585** | (đang đo) | |
| R07 | Tạo việc làm | **494** | 1335 | mẫu cũng dài |
| H09 / R14 | Hồ sơ ứng viên | **417 / 384** | 928 | CV + tab xếp dọc; mẫu: CV trái, tab phải, vừa màn |
| A04 | Mời người dùng | **407** | (đang đo) | |
| R38 | Danh mục phòng ban | **398** | 900 | |
| R06 | Việc làm — danh sách | **356** | 900 | |
| C02 | Việc làm (công khai) | **327** | 1367 | |
| R16 | Ứng viên — danh sách | **306** | 1037 | |
| R26 | Chi tiết thư mời | **280** | 911 | |
| R41 | Danh mục — tổng quan | **244** | 900 | |
| R01 / H01 | Việc của tôi | **225 / 212** | 1068 | |
| C17 | Hồ sơ của tôi | **179** | 979 | |
| R32 | Cài đặt tài khoản | **176** | 900 | |
| C09 | Biểu mẫu ứng tuyển | **155** | 900 | |
| A07, A03, H08, C20, C18, R36 | | 36 – 72 | 900 | lệch nhỏ (khoảng cách) |
| R02, R09, R40, R21, R25, R23, R37, H04, H11, H12, H16, H17, A02, C11, C12, C14, C15, C16, C19 | | 0 | | vừa màn (với dữ liệu hiện tại) |

## 4. Khác biệt nội dung so với mẫu (đã kiểm trong code)

| Mã | HTML mẫu có | Web hiện tại | Đề xuất |
|---|---|---|---|
| R06 | Tab "**Chờ duyệt**"; cột cuối "**Hạn nộp**" (còn N ngày); nhãn "Đã đủ người" | tab cùng nghĩa nhưng ghi "Chờ đăng"; cột cuối là "Ngày đăng" (`PostingListPanel.tsx:25` — viết lúc việc làm chưa có hạn nộp) | đổi chữ theo mẫu; thêm cột Hạn nộp (V5 đã có `applicationDeadline`), nhãn "Đã đủ người" khi đã tuyển đủ |
| R24 | 2 cột: Điều khoản (lương kèm **khung duyệt**, phụ cấp + ghi chú, kỳ trả lương, báo cáo cho, phép năm, thưởng) · **Tham chiếu** (vị trí trong khung lương, đề xuất của người phỏng vấn) · **Lời nhắn cho ứng viên** · Xem trước thư | 4 khối xếp dọc, không có khối Tham chiếu, "Điều kiện kèm theo" thay cho lời nhắn | làm lại bố cục theo mẫu; khối tham chiếu dùng dữ liệu có sẵn (khung lương duyệt, đề xuất lương trong phiếu đánh giá) |
| R36/R37/R38 | Bảng: Lý do · **Nhóm** · **Đã dùng** (số lần) · Đang dùng; ô tìm + lọc trạng thái | chưa có cột Nhóm, cột Đã dùng; chưa có ô tìm/lọc | **cần thảo luận** — backend chưa có "nhóm" và "số lần đã dùng" |
| R38 | Phòng ban có **Trưởng phòng** | không có | **cần thảo luận** — backend phòng ban chưa có trưởng phòng |
| R14 / H09 | Khối **"Kỹ năng & chứng chỉ"**: số năm kinh nghiệm, học vấn & chứng chỉ, kỹ năng chuyên môn, kinh nghiệm liên quan, lĩnh vực | chỉ có trong thẻ Điểm AI | đưa khối tóm tắt CV (từ kết quả trích xuất AI có sẵn) lên cạnh CV như mẫu |
| R46 / H14 | Nhận xét từng tiêu chí ẩn sau "+ Thêm nhận xét"; tiêu chí khớp danh mục | luôn hiện ô nhận xét cho mọi tiêu chí | làm theo mẫu (giảm cuộn ~40%) |
| C02 | Cột **Bộ lọc** bên trái kèm số đếm (Phòng ban, Địa điểm, Hình thức, Loại hình) + "Xoá lọc" | bộ lọc dạng chip/ô chọn phía trên | làm theo mẫu |
| C12 | Khối **"Người phụ trách"** (tên, email chuyên viên tuyển dụng) và "Hồ sơ đã nộp" (tên file CV) | không có | **cần backend**: `CandidateApplicationResponse` (đơn phía ứng viên) không có người phụ trách — phải thêm tên + email chuyên viên |
| C16 | Tiêu đề khối: "Điều khoản chính", "Phúc lợi", "Phản hồi thư mời", tải "Thu_moi_nhan_viec.pdf" | tên khối khác, không có tải PDF cho ứng viên | đổi chữ theo mẫu; tải PDF **cần backend**: `GET /offer/offers/{id}/pdf` chỉ cho HR và Quản trị (`OfferService.assertCanView`, dòng 481) — phải mở cho đúng ứng viên của thư |
| C17 | **Ảnh đại diện** (tải ảnh / xoá), Giới tính, Trình độ học vấn | không có ảnh đại diện | **cần thảo luận** — backend chưa lưu ảnh đại diện |
| C18 | "Xem chính sách" (chính sách bảo vệ dữ liệu) | không có liên kết | thêm — chính sách đã có ở thông tin doanh nghiệp (C4) |
| A08 | **"Thêm văn phòng"**, **"Đổi logo"** | không có | văn phòng dùng danh mục Địa điểm làm việc (đã có) → làm được; logo: **cần thảo luận** (chưa có chỗ lưu file) |
| A05 | Nút **"Thay đổi"** vai trò/phòng ban, "Chức danh" | chỉ xem | thêm (API đổi vai trò cần kiểm) |
| R32 | **Đổi ảnh** đại diện | chưa có (`AccountSettingsPage.tsx:19` ghi rõ: tài khoản chưa có trường ảnh) | đi cùng quyết định ảnh đại diện (C17) |
| R25 | Tab "Đã thu hồi" | thu hồi thư mời (R44) đang hoãn | giữ hoãn |
| R18 / C13 / C24 / C25 / R19 | Gửi nhiều khung giờ, ứng viên chọn | đang có | **bỏ** theo quyết định lịch mới |
| H11 / C14 | Trạng thái buổi theo góc người xem ("Chờ bạn xác nhận", "Bạn đã nộp · Nên tuyển") | có một phần | rà lại khi làm luồng lịch mới |

Màn còn lại khớp mẫu về nội dung (khác biệt chỉ là dữ liệu mẫu).

## 5. Cách sửa "vừa 1 màn hình" — đề xuất

### 5.1 Màn danh sách (R02, R06, R16, R25, R40, R31, H04, H08, H11, A03, Nhật ký, C11, C14, C15, C19…)
- `ListPage` dùng chung: trang cao đúng vùng nhìn thấy; tiêu đề, tab, bộ lọc ở trên; thanh phân trang luôn ở đáy.
- **Số dòng/trang tự tính** = (chiều cao khung bảng − dòng tiêu đề) ÷ chiều cao một dòng, tính lại khi đổi
  cửa sổ (`ResizeObserver`). Ví dụ: 1280×720 ≈ 7 dòng, 1366×768 ≈ 8, 1440×900 ≈ 11, 1920×1080 ≈ 15.
- Phân trang ở client với danh sách đã tải (đa số API đang lấy `size=1000`) — **nợ kỹ thuật**: khi dữ liệu
  lớn nên chuyển sang phân trang ở backend.

### 5.2 Màn chi tiết / biểu mẫu dài (R24, R46/H14, H05, R07, A08, A01, R03/H07, R14/H09, A05, A04)
Bản mẫu cũng dài hơn 900 ở vài màn này, nên "không cuộn" tuyệt đối là không thể với lượng nội dung đó.
Ba cách (cần chọn — mục 6):
- **(a) Chia cột như mẫu + khung cuộn bên trong**: trang không cuộn; mỗi cột tự cuộn trong khung của nó,
  nút hành động luôn hiện trên đầu trang.
- **(b) Chia tab / bước**: biểu mẫu dài tách thành các bước (vd. R24: Điều khoản → Tham chiếu → Xem trước);
  mỗi bước vừa 1 màn.
- **(c) Giữ cuộn trang** nhưng làm gọn theo mẫu (giảm khoảng cách, ẩn ô nhận xét…) — vẫn cuộn ít.

### 5.3 Trang công khai cho ứng viên (C01, C02, C03)
Mẫu dài theo kiểu trang giới thiệu việc làm → đề xuất **giữ cuộn** ở 3 trang này, chỉ làm theo bố cục mẫu.

### 5.4 Kiểm thử nhiều cỡ màn
Đo lại bằng cùng script ở 1280×720, 1366×768, 1440×900, 1920×1080 (và cửa sổ hẹp ~1024) — tiêu chí đạt:
màn danh sách và màn chính **không cuộn trang**; màn chi tiết theo cách đã chọn ở 5.2.

## 6. Cần người dùng quyết định

1. Màn chi tiết / biểu mẫu dài (5.2): chọn (a), (b) hay (c)? Có thể khác nhau theo màn.
2. Trang công khai C01–C03 được phép cuộn (5.3)?
3. Các mục **cần backend** ở mục 4: cột Nhóm/Đã dùng của danh mục, Trưởng phòng, ảnh đại diện + logo
   (lưu file), email người phụ trách cho ứng viên, ứng viên tải PDF thư mời, đổi vai trò người dùng —
   làm mục nào, bỏ mục nào?
4. Khung giờ ứng viên đang chờ chọn trong dữ liệu hiện tại khi bỏ luồng chọn khung giờ: tự huỷ hết?

### Đã chốt (05/11/2026)

| # | Quyết định |
|---|---|
| 1 | Màn chi tiết / biểu mẫu dài: **giữ cuộn trang nhưng làm gọn theo mẫu** (cách c) — giảm khoảng cách, ẩn ô nhận xét tới khi cần, bố cục như mẫu |
| 2 | Trang công khai C01–C03: **cho cuộn**, sửa bố cục theo mẫu (cột bộ lọc trái ở C02) |
| 3 | Backend: **làm** ứng viên tải PDF thư mời (C16) và **ảnh đại diện + logo** (C17, R32, A08). **Bỏ**: người phụ trách ở C12, cột Nhóm/Đã dùng/Trưởng phòng ở danh mục, đổi vai trò ở A05 — giao diện không vẽ phần đó |
| 4 | Khung giờ đang chờ ứng viên chọn: **tự huỷ khi triển khai**, HR đặt lại 1 giờ cố định |
| — | Màn danh sách: phân trang vừa 1 màn, số dòng tự tính, đúng ở mọi cỡ màn (chốt 04/11) |

## 8. Đã làm — phần 1: lịch phỏng vấn 1 giờ cố định (05/11/2026)

- Backend interview-service: trạng thái `CANDIDATE_DECLINED`, cột `candidate_decline_reason` / `candidate_declined_at`
  (V11), `PATCH /interview/interviews/{id}/candidate-decline` (ứng viên của buổi, lịch đã chốt, chưa tới giờ),
  sự kiện `interview.candidate-declined`. V11 huỷ các khung giờ `PROPOSED` còn chờ.
- notification-service: thông báo "Ứng viên xin dời lịch phỏng vấn" cho người phỏng vấn + HR phụ trách
  (chưa giao người phụ trách → mọi Chuyên viên tuyển dụng).
- Web: C14 nút Đồng ý / Từ chối (xin dời kèm lý do · không tham gia nữa = rút đơn); bỏ C13 (link cũ chuyển về C14);
  R18 chỉ còn 1 giờ cố định; R01 việc "Ứng viên xin dời lịch → Đặt lịch mới"; R40 tab Cần xử lý; R21 thông báo + nút
  "Đặt lịch mới"; hồ sơ ứng viên hiện lý do.
- Mobile: UC08 Đồng ý / Từ chối (bảng trượt), bỏ UC07 chọn khung giờ; nhân viên thấy "Ứng viên xin dời".

**Nợ kỹ thuật**
1. API khung giờ (`/interview/slots/*`, `InterviewSlotService`, bảng `interview_slot`) còn trong backend nhưng giao
   diện không dùng nữa — nên xoá ở đợt dọn backend.
2. Phiếu đánh giá trống của buổi đã huỷ / xin dời vẫn được backend trả về; web ẩn ở `ApplicationEvaluationPanel`
   — nên để backend tự dọn khi buổi kết thúc mà chưa diễn ra.
3. Hàm/type khung giờ còn lại trong `frontend/src/features/interview/interviewApi.ts` và `types.ts` (không dùng).

## 9. Đã làm — phần 2: danh sách phân trang vừa 1 màn hình (05/11/2026)

- `components/ui/useFitPageSize.ts`: số dòng = khoảng trống thật tới đáy vùng cuộn ÷ chiều cao dòng (trung vị),
  tự hiệu chỉnh sau khi vẽ (còn chỗ thì thêm, tràn thì bớt), tính lại khi đổi cỡ cửa sổ; `paginateGrouped`
  cho danh sách có tiêu đề nhóm (tiêu đề ≈ 0,6 dòng).
- `components/ui/FitTable.tsx` thay `Table` ở: Người dùng, Nhật ký, Đơn của tôi (C11), Danh mục, Thư mời,
  Việc làm, Yêu cầu tuyển dụng. Ứng viên (R16/H08) phân trang phía server theo cùng số dòng. Thông báo và
  Lịch phỏng vấn (R40/H11, nhóm theo ngày) phân trang theo cùng cách.
- Đo bằng iframe ở 1280×720 · 1366×768 · 1440×900 · 1920×1080 (cửa sổ Chrome máy dev không đổi cỡ được):
  mọi màn danh sách của HR, Phòng ban, Quản trị, ứng viên **không cuộn** (over = 0). Ví dụ Thông báo 5 / 8 / 11
  dòng; Nhật ký 7 dòng ở 1280×720, 14 dòng ở 1920×1080 (trước dư 772px).

**Còn lại / nợ kỹ thuật**
1. 1024×600: Việc làm dư 31px — bảng bị bóp hẹp, một dòng cao ~207px (cần cho cột co/ẩn khi màn hẹp).
2. Phân trang ở client trên danh sách đã tải `size=1000` — dữ liệu lớn nên chuyển sang phân trang backend.
3. C14 Lịch phỏng vấn và C15 Thư mời (ứng viên) là danh sách thẻ, chưa phân trang (ứng viên thường ít mục).

## 10. Đã làm — phần 4: khác biệt nội dung ở mục 4 (13/11/2026)

| Mã | Kết quả |
|---|---|
| R06 | Tab và nhãn "Chờ duyệt" (Q2, cả mobile), cột "Hạn nộp" (N ngày / Hết hạn / —), nhãn "Đã đủ người" khi tin đang tuyển đã tuyển đủ — `PostingListPanel.tsx` |
| R46 / H14 | Ô nhận xét từng tiêu chí ẩn sau "+ Thêm nhận xét", tự hiện khi bản nháp đã có nhận xét — `EvaluationFormPage.tsx` |
| C18 | "Xem chính sách" mở chính sách bảo mật dữ liệu ứng viên soạn ở A08; ẩn khi chưa có nội dung — `AccountSettingsPage.tsx` |
| A08 | "Thêm văn phòng" tạo địa điểm trong danh mục Địa điểm làm việc (Quản trị được phép theo `requireHr`) — `CompanyPage.tsx` |
| R14 / H09 | **Không cần làm**: "Kỹ năng & chứng chỉ" trong mẫu là nội dung của file CV mẫu; các dòng "Số năm kinh nghiệm / Học vấn & chứng chỉ / Lĩnh vực" nằm trong tab Điểm AI — web đã có |

Dữ liệu test tạo khi kiểm (DB local): chính sách bảo mật "(Nội dung thử nghiệm)…", văn phòng "Văn phòng test A08".

## 7. Thứ tự làm đề xuất (sau khi duyệt)

1. Luồng lịch mới (backend `candidate-decline` + `CANDIDATE_DECLINED`, web, mobile) — thay đổi nghiệp vụ.
2. `ListPage` phân trang tự tính + áp cho mọi màn danh sách.
3. Màn chi tiết / biểu mẫu theo cách chọn ở 6.1, ưu tiên màn cuộn nhiều nhất: R24, R46/H14, A08, H05, A01.
4. Khác biệt nội dung ở mục 4 theo thứ tự người dùng chọn.
5. Đo lại ở 4 cỡ màn, cập nhật file này.
