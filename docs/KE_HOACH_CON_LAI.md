# Kế hoạch các phần còn lại (giao cho phiên làm việc sau)

Lập ngày 17/11/2026, sau commit `fd677af` trên nhánh `dev`. Hạn của đề bài gốc: 25/11/2026.

Tài liệu này tự đứng được: người (hoặc mô hình) nhận việc không cần đọc lại lịch sử trò chuyện. Đọc theo thứ tự:

1. `CLAUDE.md` ở gốc — cách chạy, cổng, bẫy môi trường, quy tắc commit.
2. `mobile/CLAUDE.md` — quy ước riêng của app.
3. File này.
4. Khi cần chi tiết một mã lỗi: `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md` (đề bài lỗi) và `docs/KET_QUA_HOAN_THIEN.md` (đã làm gì, đã kiểm bằng gì).

## 0. Quy tắc bắt buộc (không được vi phạm)

- Làm trên nhánh `dev`, commit theo từng nhóm việc, push `origin/dev`. **Không tạo Pull Request, không merge vào `main`.**
- Thông điệp commit tiếng Anh. **Không thêm `Co-Authored-By` hay "Generated with Claude Code".**
- **Không xoá file trên S3. Không gửi email ra ngoài miền `example.com`.** Không deploy, không build APK, không chạy benchmark AI.
- **Không đọc các file README.** Không đổi phông chữ, không đổi thứ tự / khối chính của màn so với `docs/UI`.
- **Không bấm "Xuất Excel" thật** — chặn trước bằng JS (xem việc V-HR-11).
- Lệnh chạy lâu thì chạy nền, không tự lặp `sleep`/`tail` để chờ.
- Máy 16 GB RAM. Không chạy test của hai service cùng lúc. **Chạy `mvnw test` làm service đang chạy tự khởi động lại** (devtools)
  — đừng chạy test khi đang kiểm giao diện phụ thuộc service đó hoặc khi `seed.py` đang chạy.
- "Xong" một việc = có mã + test của service liên quan qua (`mvnw.cmd -q test`) + `npx tsc -b --noEmit` (web) /
  `npm run typecheck && npm run lint` (mobile) sạch + **đã thấy chạy đúng trên giao diện**. Thiếu bước nào ghi rõ là thiếu.
- Sau mỗi việc: cập nhật `docs/TIEN_DO_HOAN_THIEN.md` (một dòng: mã việc, kết quả, đã kiểm bằng gì) và bảng tương ứng trong
  `docs/KET_QUA_HOAN_THIEN.md`.

## 1. Chuẩn bị phiên làm việc

| Bước | Lệnh | Kết quả phải thấy |
|---|---|---|
| 1 | Mở Docker Desktop; `docker ps` | `ats-postgres`, `ats-rabbitmq`, `ats-redis` đang Up |
| 2 | `bash scripts/dev/svc.sh status` | 11 dòng UP. Thiếu cái nào: `bash scripts/dev/svc.sh restart <tên>` (mỗi lần tối đa 4 service) |
| 3 | `cd frontend && npm run dev` (nền) | http://localhost:3000 mở được |
| 4 | Khi kiểm mobile: `cd mobile && npx expo start --web --port 19006` (nền) | http://localhost:19006 mở được. Tắt đi khi không dùng để đỡ RAM |
| 5 | `curl -s http://localhost:8080/api/auth/public/theme` | JSON có `"companyName":"Mộc Lam Software"` |
| 6 | `docker exec ats-postgres psql -U ats_user -d ats_application -tAc "select count(*) from application"` | `41` (dữ liệu demo còn nguyên). Khác 41 → chạy lại `seed.py` (mục 6 của file này) |

**Đăng nhập nhanh trên web** (dán vào console của tab `localhost:3000`, đổi email):

```js
const email='tran.ha@example.com';
const t=await (await fetch('http://localhost:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password:'Password123!'})})).json();
const me=await (await fetch('http://localhost:8080/api/auth/me',{headers:{Authorization:'Bearer '+t.accessToken}})).json();
localStorage.setItem('ats_auth',JSON.stringify({accessToken:t.accessToken,refreshToken:t.refreshToken,
  user:{userId:String(me.id),email:me.email,role:me.role,departmentId:me.departmentId??null,fullName:me.fullName,avatarUrl:me.avatarUrl??null}}));
```

Mobile web dùng sessionStorage: đăng nhập bằng form (bấm nút "Đăng nhập", phím Enter ở ô email không gửi form). Đăng xuất nhanh:
`sessionStorage.clear()` rồi mở lại `/login`.

### Dữ liệu demo hiện có (mã số đúng tới khi chạy lại `seed.py`; chạy lại thì cùng thứ tự nên thường giữ nguyên)

Tài khoản (mật khẩu `Password123!`): Quản trị `le.quan` (id 1) · Tuyển dụng `tran.ha` (2), `pham.anh` (3) · Trưởng bộ phận
`nguyen.long` Backend (4), `vo.phuong` Frontend (5), `dang.bao` Mobile (6), `bui.tam` Kiểm thử (7), `hoang.thinh` DevOps (8),
`do.vy` Dữ liệu (9). Tất cả `@example.com`. Ứng viên: email = khoá trong bảng dưới + `@example.com`.

Tin: 1 Backend (đang tuyển) · 2 Frontend · 3 Mobile · 4 Kiểm thử · 5 DevOps (tạm dừng) · 6 Dữ liệu (đã đóng).
Yêu cầu: 1–6 đã duyệt · 7 AI/ML chờ duyệt · 8 Thực tập sinh Backend (nháp, của `nguyen.long`) · 9 UI/UX cần sửa (của `vo.phuong`) · 10 Kiểm thử thủ công bị từ chối.

| Tình huống | Ứng viên (khoá) | Đơn | Ứng viên id | Buổi PV | Thư mời |
|---|---|---|---|---|---|
| Thư mời chờ phản hồi | `tran.huy` | 17 | 15 | 7 | 4 (đã gửi) |
| Thư mời nháp | `luong.khoi` | 15 | 13 | 6 | 3 (nháp) |
| Thư mời hết hạn | `nguyen.hang` | 9 | 8 | 4 | 2 |
| Thư mời bị từ chối | `vo.tu` | 8 | 7 | 3 | 1 |
| Đã nhận việc | `nguyen.khanh` / `dinh.trang` / `tran.thu` | 4 / 5 / 2 | 4 / 5 / 2 | 19 / 20 / 18 | 6 / 7 / 5 |
| Đơn tự đóng vì nhận việc nơi khác | `dinh.trang` | 6 | 5 | — | — |
| Đã phỏng vấn, thiếu 1 phiếu đánh giá (của `tran.ha`) | `le.tram` | 18 | 16 | 8 | — |
| Đã phỏng vấn, đủ phiếu, chờ quyết định | `ta.ngan` | 20 | 18 | 9 | — |
| Lịch chờ trưởng bộ phận xác nhận | `ho.ngoc` | 30 | 28 | 17 | — |
| Lịch chờ ứng viên trả lời | `huynh.hao` | 29 | 27 | 16 | — |
| Lịch hai bên đã xác nhận | `do.tuan` / `nguyen.nghia` | 26 / 22 | 24 / 20 | 14 / 10 | — |
| Ứng viên xin dời | `chau.diep` | 25 | 23 | 13 | — |
| Trưởng bộ phận đề xuất giờ khác | `bui.huy` | 27 | 25 | 15 | — |
| Một buổi đã huỷ + một buổi mới | `truong.linh` | 23 | 21 | 11, 12 | — |
| Đã rút đơn | `mai.thu` / `ha.nhat` | 16 / 21 | 14 / 19 | — | — |
| CV chèn lệnh | `cao.tri` / `kieu.duyen` | 37 / 24 | 32 / 22 | — | — |
| Mới nộp, chưa ai xem | `ngo.bao` | 40 | 33 | — | — |
| Hồ sơ do chuyên viên nhập (không có tài khoản) | Vũ Hoàng Nam, Lê Hoàng Phúc, Đoàn Thị Như Quỳnh, Trịnh Quốc Đạt | 33, 19, 35, 10 | 30, 17, 31, 9 | — | — |

Đường dẫn web hay dùng: hồ sơ `/candidates/<ứng viên id>/applications/<đơn>` · buổi phỏng vấn `/interviews/<id>` · thư mời
`/offers/<id>` · tin `/recruitment/postings/<id>` · yêu cầu `/recruitment/requisitions/<id>` · người dùng `/admin/users/<id>`.

## 2. Thứ tự làm và ước lượng

| Thứ tự | Phần | Vì sao ở vị trí này |
|---|---|---|
| 1 | **Phần A** — kiểm giao diện các luồng CHỈ ĐỌC còn thiếu | Không làm bẩn dữ liệu demo |
| 2 | **Phần B** — lỗi đã biết, chưa sửa (nhóm D + lỗi thấy khi kiểm) | Sửa trước khi kiểm luồng ghi để khỏi kiểm hai lần |
| 3 | **Phần C** — mục 5: tinh chỉnh câu chữ và bố cục | Đổi giao diện xong mới kiểm lượt cuối |
| 4 | **Phần D** — kiểm giao diện các luồng GHI dữ liệu | Làm bẩn dữ liệu → để gần cuối |
| 5 | **Phần E** — chạy lại `seed.py`, kiểm số liệu, chốt tài liệu | Trả dữ liệu demo về trạng thái sạch để bàn giao |

Nếu thiếu thời gian: ưu tiên D (luồng ghi) > B > A > C. Phần E luôn phải làm.

## 3. Phần A — kiểm giao diện, luồng chỉ đọc

Cách ghi kết quả cho MỖI việc: `đạt` / `lỗi: <mô tả 1 câu> → đã sửa ở <file>` / `lỗi: … → chưa sửa vì …`.
Với mỗi màn, ngoài nội dung ghi ở cột "Phải thấy", luôn kiểm 4 điều: (a) không có chữ tiếng Anh / không dấu,
(b) không chữ bị cắt "…" ở nội dung chính, (c) console không có lỗi đỏ (đọc bằng công cụ console, lọc `rror`),
(d) màu chủ đạo là màu thương hiệu (xanh lục đậm `#0F6E66`), không còn chỗ nào xanh dương `#0A59F7` ngoài thẻ "Đã tuyển" và dải màu AI.

### A1. Quản trị (`le.quan`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-AD-1 | `/dashboard`: đổi "Quý 4/2026" sang "Quý 3/2026" | URL có `?quarter=`; cả 5 ô số và bảng "Theo phòng ban" đổi theo; tải lại trang vẫn giữ quý 3 |
| V-AD-2 | Bấm một dòng phòng ban ở bảng đó | Mở `/dashboard/departments/<id>?quarter=…`, vẫn đúng quý vừa chọn |
| V-AD-3 | "Thời gian tuyển trung bình" của Phòng Backend ở Tổng quan (chi tiết phòng) so với `/results` của `nguyen.long` | Cùng một con số (hiện là 13 ngày ở `/results`) |
| V-AD-4 | `/admin/users/roles` | Ma trận quyền: Quản trị có dấu ở "Danh mục"; không còn chữ tiếng Anh |
| V-AD-5 | `/masterdata` và mở 3 danh mục bất kỳ; ô tìm gõ "ky nang", "phong" | Danh mục IT (7 phòng ban, 16 chức danh, 50 kỹ năng…); tìm không dấu ra kết quả |
| V-AD-6 | `/audit-logs`: lọc "Loại đối tượng" = Phỏng vấn; gõ tìm "dat lich" | Có dòng "Lên lịch phỏng vấn", cột chi tiết ghi giờ hẹn thật của buổi (không phải giờ ngày 17/11 với các buổi tháng 9–10); tìm không dấu ra kết quả |
| V-AD-7 | `/admin/careers`: bấm "Xem trước" | Trang xem trước giống `/careers/home`, không có ảnh sơ đồ kiến trúc |
| V-AD-8 | Thử mở `/applications`, `/offers`, `/interviews` bằng tài khoản Quản trị | Theo ma trận quyền ở V-AD-4: trang nào không có quyền phải báo không có quyền / chuyển hướng, không được trắng trang |

### A2. Chuyên viên tuyển dụng (`tran.ha`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-HR-1 | Ctrl+K, gõ "nguyen van", rồi "kiem thu" | Ra ứng viên Nguyễn Văn Khánh; ra tin "Kỹ sư Kiểm thử tự động". Enter mở đúng trang |
| V-HR-2 | `/applications`: các tab, lọc theo tin, ô tìm "le thi" | Tab "Đã rút đơn" có 2 đơn; tìm không dấu ra Lê Thị Ngọc Trâm |
| V-HR-3 | Hồ sơ `/candidates/32/applications/37` (Cao Minh Trí) tab Điểm AI | Băng cảnh báo đỏ "CV có nội dung bất thường…"; có điểm và lý do |
| V-HR-4 | Hồ sơ `/candidates/12/applications/14` (Dương Thị Hồng Nhung) | Điểm thấp (≈19), xếp "Không phù hợp", nêu rõ thiếu yêu cầu bắt buộc |
| V-HR-5 | Hồ sơ `/candidates/15/applications/17` (Trần Đức Huy) tab Hoạt động và tab Thư mời | Dòng thời gian có: nộp hồ sơ, đổi người phụ trách, chuyển giai đoạn, lên lịch, nộp đánh giá, tạo và gửi thư mời — theo đúng thứ tự thời gian, không lặp |
| V-HR-6 | `/offers`: 5 tab trạng thái; mở `/offers/4` | Đếm đúng: 1 nháp, 1 chờ phản hồi, 3 đã nhận, 1 từ chối, 1 hết hạn. Chi tiết có hạn phản hồi 17:00 |
| V-HR-7 | `/offers/compare` (so sánh ứng viên) với tin Backend | Bảng so sánh mở được, có điểm AI và điểm đánh giá |
| V-HR-8 | `/interviews` chế độ "Lịch tuần" | Buổi 60 phút tô đủ 2 ô 30 phút (lỗi 4.4 "chỉ tô 1 ô" — nếu còn thì sửa ở phần B, việc B-3) |
| V-HR-9 | `/recruitment/requisitions` các tab; mở yêu cầu 9 và 10 | Yêu cầu 9 hiện lời yêu cầu sửa; 10 hiện lý do từ chối; khối Lịch sử đủ bước |
| V-HR-10 | `/notifications` và chuông | Bấm "Đánh dấu tất cả đã đọc" → số trên chuông về 0 ngay, không cần tải lại (lỗi 3.18) |
| V-HR-11 | Xuất Excel ở `/applications`: TRƯỚC khi bấm, chạy trong console: `window.__saved=[]; URL.createObjectURL=(b)=>{window.__saved.push(b.size);return 'blob:x'}; HTMLAnchorElement.prototype.click=function(){window.__saved.push(this.download)}` | Sau khi bấm: `window.__saved` có kích thước > 0 và tên file `.xlsx`; **không có file nào tải về máy** |
| V-HR-12 | `/settings` | Mở được, đổi tên hiển thị thử rồi đổi lại |

### A3. Trưởng bộ phận (`nguyen.long`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-HM-1 | `/applications` | Chỉ thấy hồ sơ của tin Backend (14 hồ sơ), không thấy lương thư mời |
| V-HM-2 | Gõ thẳng URL hồ sơ phòng khác `/candidates/18/applications/20` và `/interviews/9` | Bị chặn bằng câu tiếng Việt ("Bạn không có quyền…" hoặc "Không tìm thấy…"), không trắng trang |
| V-HM-3 | `/recruitment/requisitions/8` (bản nháp của mình) | Có nút sửa và gửi duyệt; ô "Ngày bắt đầu mong muốn" không chọn được ngày đã qua |
| V-HM-4 | `/interviews` tab "Đã xong" → mở buổi 7 → xem phiếu đã nộp | Phiếu của mình hiện đủ điểm từng tiêu chí, không sửa được nữa |
| V-HM-5 | `/results` → bấm dòng tin Backend | `/results/1` mở được, không có cột lương |
| V-HM-6 | `/offers` | Xem việc B-4 (tiêu đề đang trùng "Kết quả tuyển dụng") |

### A4. Ứng viên — web

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| V-CA-1 | `nguyen.khanh` | `/my-offers` → mở thư đã nhận | Trang chào mừng / thư mời đã nhận; nút tải PDF mở được PDF tiếng Việt có dấu |
| V-CA-2 | `nguyen.hang` | `/my-offers` | Thư mời ghi "Hết hạn", không còn nút Nhận / Từ chối |
| V-CA-3 | `luong.khoi` | `/my-offers` | **Không** thấy thư mời nháp |
| V-CA-4 | `do.tuan` | `/my-interviews` | Buổi 19/11 09:00 hiện đường dẫn họp bấm được, nút tải `.ics` |
| V-CA-5 | `ho.ngoc` | `/my-interviews` | **Không** thấy buổi 17 (trưởng bộ phận chưa xác nhận) |
| V-CA-6 | `truong.linh` | `/my-interviews` | Buổi đã huỷ nằm ở nhóm "Đã huỷ" riêng |
| V-CA-7 | `dinh.trang` | Mở tin Backend `/careers/1` (hoặc đường dẫn chi tiết tin tương ứng) | Không nộp được đơn mới; có câu giải thích "đã nhận việc" trước khi bấm (3.7 — nếu chỉ báo sau khi bấm thì ghi lại, sửa ở B-6) |
| V-CA-8 | `mai.thu` | Mở tin Backend | Không nộp lại được; nêu lý do đã rút đơn |
| V-CA-9 | bất kỳ | `/my-profile` | Ngày sinh / Giới tính: xem việc B-5 |

### A5. Mobile (Expo web, cổng 19006)

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| V-MB-1 | `tran.huy` | Tab thư mời → mở thư | Chi tiết thư mời, hạn phản hồi, nút Nhận / Từ chối |
| V-MB-2 | `do.tuan` | Tab Lịch → mở buổi | Đường dẫn họp / địa điểm hiện đúng dòng (lỗi 4.4: dòng "Hình thức" hiện tên địa điểm — nếu còn thì sửa ở B-8) |
| V-MB-3 | `mai.thu` | Tab Hồ sơ | Đơn ghi "Đã rút đơn" (không phải "Không tiếp tục") |
| V-MB-4 | `tran.ha` | 4 tab: Việc của tôi · Ứng viên · Lịch · Thêm | Mỗi tab có dữ liệu; hồ sơ Cao Minh Trí có nhãn "CV bất thường" |
| V-MB-5 | `tran.ha` | Mở buổi phỏng vấn đã xong (ví dụ của Lê Thị Ngọc Trâm) | Tiêu đề KHÔNG phải "Xác nhận phỏng vấn" (lỗi 4.4 — nếu còn thì sửa ở B-8) |
| V-MB-6 | `nguyen.long` | Việc của tôi → buổi của Hồ Thị Bích Ngọc | Có nút xác nhận giờ |
| V-MB-7 | `nguyen.long` | Tab Kết quả, Yêu cầu | Chỉ dữ liệu phòng Backend |

**Kết quả phần A phải nộp:** bảng 42 dòng (mỗi mã một dòng) trong `docs/KET_QUA_HOAN_THIEN.md` mục 6, thay cho danh sách
"Chưa kiểm" hiện có; mọi lỗi tìm được hoặc đã sửa (kèm tên file) hoặc chuyển thành một việc mới ở phần B.

## 4. Phần B — lỗi đã biết, chưa sửa

Mỗi việc: sửa → type-check → nhìn lại trên giao diện → một dòng trong `TIEN_DO_HOAN_THIEN.md`.

| Mã | Lỗi | Chỗ sửa (gợi ý) | Kết quả phải đạt |
|---|---|---|---|
| B-1 | Bảng "Theo phòng ban" ở `/dashboard` cắt chữ: "Phòng Kiểm thử (Q…", "Nguyễn Hoàng …" | `frontend/src/features/overview/pages/CompanyOverviewPage.tsx` — nới cột Phòng ban / Đại diện hoặc cho xuống dòng | Ở cửa sổ rộng 1440 px, tên 7 phòng và 6 đại diện hiện đủ |
| B-2 | Thẻ Kanban cắt tên ứng viên ("Hồ Thị Bích …", "Cao Min…") | `frontend/src/features/candidate/components/ApplicationKanbanBoard.tsx` — cho tên xuống 2 dòng, đưa nhãn "CV bất thường" xuống dưới tên | Tên đầy đủ trên mọi thẻ của tin Backend |
| B-3 | Lưới giờ phỏng vấn: buổi 60 phút chỉ tô 1 ô 30 phút | `frontend/src/features/interview/pages/InterviewSchedulePage.tsx` (chế độ Lịch tuần) và lưới chọn giờ khi lên lịch | Buổi 60 phút phủ đúng 2 ô; buổi 90 phút phủ 3 ô |
| B-4 | `/offers` của trưởng bộ phận có tiêu đề "Kết quả tuyển dụng" (trùng `/results`) và tab "Bản nháp" không dùng | `frontend/src/features/offer/pages/OffersPage.tsx` dòng tiêu đề `isHm ? …` | Trưởng bộ phận: tiêu đề "Thư mời của phòng", không có tab Bản nháp; hoặc bỏ hẳn `/offers` khỏi vai trò này nếu menu không dẫn tới (kiểm `AppLayout.tsx`) |
| B-5 | Hồ sơ ứng viên hỏi Ngày sinh, Giới tính trong khi AI không dùng | `frontend/src/features/candidate/pages/CandidateProfilePage.tsx`, `CandidateFormModal.tsx`; mobile `app/(candidate)/profile.tsx` + `src/lib/strings.ts` | Dưới hai ô có dòng nhỏ "Không bắt buộc, không dùng để đánh giá hồ sơ" (web và mobile) |
| B-6 | 3.7: trang chi tiết việc chưa báo sẵn lý do không nộp được (đã nhận việc / đã rút đơn) trước khi bấm | `frontend/src/features/public/pages/JobDetailApplyPage.tsx` (đã có `closedLabel(mine)`); mobile `app/(candidate)/jobs/[id].tsx` | Ứng viên `dinh.trang` mở tin Backend thấy ngay "Bạn đã nhận việc ở vị trí khác nên không nộp thêm đơn được", nút Ứng tuyển bị khoá |
| B-7 | Giới hạn dung lượng không thống nhất: CV ứng viên 5 MB, "AI đọc CV" 20 MB | Tìm `20 * 1024` ở `frontend/src/features/ai/components/AiCvUploadModal.tsx`; đối chiếu `validateResume` ở candidate-service và giới hạn của ai-service | Một con số (5 MB) ở cả hai nơi và trong câu hướng dẫn; backend từ chối file lớn hơn bằng câu tiếng Việt (mã 413) |
| B-8 | Mobile: tiêu đề "Xác nhận phỏng vấn" cho buổi đã hoàn tất; dòng "Hình thức" hiện tên địa điểm | `mobile/src/features/staff/screens/interview-screen.tsx`, màn lịch ứng viên; chuỗi ở `src/lib/strings.ts` | Buổi đã xong: tiêu đề "Buổi phỏng vấn"; "Hình thức" = "Trực tuyến"/"Trực tiếp", địa điểm ở dòng riêng |
| B-9 | Nút "Từ chối" trong hộp thoại từ chối hồ sơ (Kanban và trang hồ sơ) không đỏ | Hộp thoại từ chối trong `ApplicationKanbanBoard.tsx` / component dùng chung — dùng `SmallDialog` với `danger` | Nút xác nhận màu đỏ, giống các hành động không hoàn tác khác |
| B-10 | Menu sắp xếp "Lương cao n…" bị cắt ở `/careers` | `frontend/src/features/public/pages/CompanyJobsPage.tsx` — `popupMatchSelectWidth={false}` hoặc nới rộng | Đọc đủ "Sắp xếp: Lương cao nhất" |
| B-11 | Cột trạng thái ở danh sách lịch phỏng vấn bị cắt chữ (báo cáo gốc) | `InterviewSchedulePage.tsx` — kiểm ở 1280 px | Nhãn trạng thái dài nhất ("Chờ ứng viên xác nhận") hiện đủ |
| B-12 | Hồ sơ bị gắn cờ chèn lệnh vẫn được xếp loại | `ai-service/app/services/application_scoring.py` — đối chiếu quyết định 1.7 trong đề bài: nếu đề bài yêu cầu "luôn Chưa phân loại" thì sửa; nếu chỉ yêu cầu cảnh báo thì ghi rõ vào báo cáo | Hành vi khớp đề bài, có test trong `tests/test_scoring_aggregate.py` hoặc file test của application_scoring |
| B-13 | Tiêu đề tab trình duyệt "ATS — Hệ thống Quản lý Tuyển dụng" | `frontend/index.html` + đặt `document.title` theo `companyName` trong `BrandProvider` | Tab hiện "Mộc Lam Software · Tuyển dụng" |
| B-14 | Nhắc lịch 24h/1h chưa thấy chạy thật | Không sửa mã. Kiểm: `docker exec ats-postgres psql -U ats_user -d ats_interview -tAc "select id,status,scheduled_at,reminder_24h_sent_at,reminder_1h_sent_at from interview where scheduled_at>now() order by scheduled_at"`; tạo một buổi cách hiện tại 50 phút, hai bên xác nhận, chờ 1–2 phút | Cột `reminder_1h_sent_at` có giá trị; bảng `notification` (DB `ats_notification`) có dòng `INTERVIEW_REMINDER` cho người phỏng vấn và ứng viên; chạy lại không sinh dòng thứ hai |

## 5. Phần C — mục 5 của đề bài: giao diện "bớt giống AI làm"

Nguyên tắc: giữ bố cục và thứ tự khối của `docs/UI`. Chỉ đổi câu chữ, bớt trang trí, thống nhất kiểu. Mỗi thay đổi so với
`docs/UI` ghi một dòng vào `docs/KET_QUA_HOAN_THIEN.md` mục 4 (màn — đổi gì — lý do).

| Mã | Việc | Cách làm | Kết quả phải đạt |
|---|---|---|---|
| C-1 | Rà câu chữ web | `grep -rn " · \| — " frontend/src --include=*.tsx` và đọc từng `subtitle=`, `InlineNotice`, `message.success/error`, `placeholder=` | Không còn phụ đề lặp ý tiêu đề (ví dụ "Nhật ký hệ thống / Thao tác quan trọng trong toàn doanh nghiệp" → bỏ phụ đề hoặc đổi thành số liệu). Mỗi dòng mô tả tối đa một dấu "·". Thông báo thành công ≤ 8 từ, nói đúng việc vừa xong. Lập danh sách trước–sau (ít nhất 30 chỗ) trong báo cáo |
| C-2 | Rà câu chữ mobile | Toàn bộ `mobile/src/lib/strings.ts` | Cùng tiêu chí C-1; không sửa chuỗi ở ngoài `strings.ts` |
| C-3 | Bớt ô biểu tượng trang trí | Tìm các `IconTile`/ô vuông bo góc chứa icon ở: danh sách việc cần làm (`MyWorkPage.tsx`), thẻ thư mời ứng viên (`CandidateOffersPage.tsx`), hộp thoại (`SmallDialog` có icon) | Chỉ giữ icon khi nó phân biệt loại việc (màu theo loại). Bỏ icon ở tiêu đề hộp thoại và ở thẻ chỉ có một loại. Chụp trước–sau 3 màn |
| C-4 | Bớt thẻ lồng thẻ | Tìm `Panel` chứa `Panel`/khối có nền `COLORS.fill` bên trong thẻ trắng ở các trang chi tiết (hồ sơ, yêu cầu, thư mời) | Tối đa hai lớp nền (nền trang xám → thẻ trắng). Khối con dùng đường kẻ mảnh thay cho nền |
| C-5 | KPI chỉ ở nơi cần | `/dashboard`, `/results`, trang chủ mobile của nhân viên (3 ô số) | Giữ KPI ở Tổng quan và Kết quả. Ở mobile "Việc của tôi": bỏ ô nào luôn bằng 0 hoặc trùng với danh sách ngay bên dưới |
| C-6 | Thống nhất trạng thái, chip, nút | So `StatusTag`, `StageTag`, các `<Tag>` antd còn sót (`grep -rn "<Tag " frontend/src`) | Mọi trạng thái đi qua `StatusTag`/`StageTag`. Nút hành động chính mỗi màn chỉ một nút đặc màu thương hiệu; hành động không hoàn tác màu đỏ |
| C-7 | Gradient | `grep -rn "linear-gradient" frontend/src mobile/src` | Chỉ còn: nền phần đầu trang tuyển dụng / màn đăng nhập (màu thương hiệu), thư mời, dải màu AI. Không gradient ở nút hay thẻ thường |
| C-8 | Số chưa đọc trên chuông sau khi tạo dữ liệu (đang là 33) | `scripts/demo-data/seed.py` hàm `fixups()` — đánh dấu đã đọc mọi thông báo cũ hơn 3 ngày thay vì 10 | Sau khi chạy lại seed, chuông của `tran.ha` ≤ 9 |

**Kết quả phần C phải nộp:** commit riêng `style(web): …` và `style(mobile): …`; bảng "đổi gì so với docs/UI" trong báo cáo;
`tsc`, `typecheck`, `lint` sạch; 6 ảnh chụp trước–sau lưu ở `docs/UI/after/` (không bắt buộc commit ảnh nếu nặng).

## 6. Phần D — kiểm giao diện, luồng GHI dữ liệu

Các việc này thay đổi dữ liệu demo. Làm theo đúng thứ tự (việc sau dùng kết quả việc trước). Mỗi việc ghi: đạt / lỗi + đã sửa.
Sau mỗi thao tác ghi, kiểm thêm: thông báo thành công ngắn và đúng, chuông của người liên quan tăng, tab Hoạt động / Lịch sử có dòng mới.

### D1. Ứng viên mới, từ đầu đến cuối (web)

| Mã | Việc | Phải thấy |
|---|---|---|
| W-1 | Chưa đăng nhập: `/register`, email `uv.kiemthu@example.com`, KHÔNG tick đồng ý | Báo lỗi tiếng Việt, không tạo tài khoản |
| W-2 | Tick đồng ý, đăng ký | Trả về trong < 2 giây (email gửi nền), chuyển sang màn nhập mã |
| W-3 | Nhập mã sai 1 lần | Câu "Mã xác minh không đúng hoặc đã hết hạn" |
| W-4 | Kích hoạt bằng tay: `docker exec ats-postgres psql -U ats_user -d ats_auth -c "update app_user set status='ACTIVE', email_verified=true where email='uv.kiemthu@example.com'"`; đăng nhập sai mật khẩu rồi đúng | Sai → "Email hoặc mật khẩu không chính xác" (không bị đẩy ra màn hết phiên); đúng → vào `/my-home` |
| W-5 | `/my-profile`: điền hồ sơ, tải ảnh đại diện PNG; thử tải file `.svg` và một file `.txt` đổi đuôi thành `.png` | PNG nhận; SVG và file giả bị từ chối bằng câu tiếng Việt |
| W-6 | Tải CV: dùng `tmp/cv/nguyen.khanh.pdf` (tạo bằng `ai-service/.venv/Scripts/python.exe scripts/demo-data/cv_pdf.py`); thử một file `.txt` đổi đuôi `.pdf` | PDF thật nhận; file giả bị từ chối |
| W-7 | Ứng tuyển tin Backend: không tick đồng ý → tick → gửi | Chặn khi chưa tick; gửi xong tới màn "Ứng tuyển thành công" |
| W-8 | Ứng tuyển lại cùng tin | Bị chặn, nêu lý do đã nộp |
| W-9 | Đăng nhập `tran.ha`, mở tin 1 | Trong ≤ 90 giây thẻ ứng viên mới có điểm AI (nếu lỗi do Gemini 503: bấm "Chấm lại" đúng một lần, kiểm tab Network chỉ có 1 request `rescore`) |
| W-10 | Ứng viên mới: rút đơn ở `/my-applications` | Trạng thái "Đã rút đơn"; phía `tran.ha` đơn sang tab "Đã rút đơn"; nộp lại bị chặn |
| W-11 | Ứng viên mới: Hồ sơ → Dữ liệu & quyền riêng tư → xoá dữ liệu | Bị đăng xuất; đăng nhập lại không được; phía `tran.ha` tên thành dạng ẩn danh, không mở được CV; `select count(*) from cv_extractions` giảm đúng 1 dòng của ứng viên đó |
| W-12 | Quên mật khẩu với `tran.huy@example.com` | Trả ngay câu "Nếu email tồn tại…"; không lỗi |

### D2. Chuyên viên tuyển dụng và trưởng bộ phận (web)

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| W-13 | `nguyen.long` | `/interviews/17` → Xác nhận | Trạng thái "Chờ ứng viên xác nhận"; ứng viên `ho.ngoc` giờ thấy buổi ở `/my-interviews` |
| W-14 | `ho.ngoc` | Đồng ý lịch | "Ứng viên đã xác nhận" ở phía chuyên viên |
| W-15 | `huynh.hao` | Xin dời buổi 16 với lý do | Phía `pham.anh`: băng lý do + nút "Đặt lịch mới" |
| W-16 | `pham.anh` | Từ buổi 16 bấm "Đặt lịch mới", chọn ngày khác, địa điểm | Form điền sẵn; địa điểm mặc định là văn phòng của tin (TP. HCM), không phải văn phòng khác; buổi cũ đóng lại, buổi mới ở "Chờ xác nhận" |
| W-17 | `tran.ha` | `/interviews/15` (đề xuất đổi giờ của Đặng Quốc Bảo) → Đồng ý đề xuất | Giờ đổi sang giờ đề xuất, trạng thái chờ ứng viên |
| W-18 | `tran.ha` | Buổi 12: "Thêm người phỏng vấn" → thêm chính mình; "Đổi giờ"; rồi "Huỷ" | Mỗi thao tác thành công, Nhật ký có 3 dòng tương ứng |
| W-19 | `tran.ha` | Viết đánh giá còn thiếu cho Lê Thị Ngọc Trâm: từ *Việc của tôi* bấm "Viết đánh giá" | Mở đúng phiếu của buổi 8 (không phải trang trống); lưu nháp → tải lại vẫn còn → nộp → buổi 8 thành "Đã xong" |
| W-20 | `tran.ha` | Thử ba lối khác vào phiếu đánh giá: từ `/interviews/8`, từ tab Đánh giá của hồ sơ, từ `/evaluations` | Cả ba đều mở đúng nơi (lỗi 1.1) |
| W-21 | `tran.ha` | Hồ sơ Lê Thị Ngọc Trâm → "Chuyển sang Thư mời" → Soạn thư mời: để hạn phản hồi SAU ngày bắt đầu | Báo "Hạn phản hồi phải trước ngày bắt đầu làm việc" (không phải "Đã có lỗi xảy ra") |
| W-22 | `tran.ha` | Sửa cho hợp lệ, lưu nháp, mở lại sửa lương, "Kiểm tra trước khi gửi", gửi | Hạn phản hồi mặc định 17:00; gửi xong ứng viên `le.tram` thấy thư ở `/my-offers` |
| W-23 | `tran.ha` | Hồ sơ Hồ Thị Bích Ngọc (chưa có đánh giá): nút "Chuyển sang Thư mời" | Bị khoá kèm lý do (3.1) |
| W-24 | `le.tram` | Xem thư mời, tải PDF, Từ chối với lý do | Thư "Đã từ chối"; đơn chuyển trạng thái tương ứng; phía chuyên viên có thông báo ghi tên vị trí |
| W-25 | `tran.huy` | Nhận thư mời 4 | Trang chào mừng; đơn 17 "Đã tuyển"; tin Backend 2/2; thử soạn thư mời cho người khác ở tin Backend → bị chặn vì hết suất, câu tiếng Việt |
| W-26 | `tran.ha` | Thư nháp 3 (`/offers/3`): xoá | Xoá được; danh sách cập nhật |
| W-27 | `tran.ha` | Kanban tin 2 (cần `pham.anh` vì là người phụ trách — dùng `pham.anh`): chọn 2 thẻ ở cột Ứng tuyển → giao phụ trách; chọn 1 thẻ → từ chối hàng loạt; kéo 1 thẻ sang cột kế | Cả ba thao tác chạy; kéo sai cột (nhảy 2 giai đoạn) báo câu hướng dẫn |
| W-28 | `tran.ha` | "Thêm ứng viên" ở tin 1: bỏ trống CV rồi bấm lưu | Màn cuộn tới lỗi "Vui lòng tải lên CV"; điền đủ → thông báo "Đã thêm ứng viên vào tin" (không phải "Ứng tuyển thành công") |
| W-29 | `tran.ha` | "AI đọc CV" với `tmp/cv/le.tram.pdf` | Điền sẵn họ tên, kỹ năng; không lỗi |
| W-30 | `tran.ha` | Sửa tin 1 đang tuyển: đổi một dòng mô tả, bật/tắt "Tuyển gấp", lưu; thử lương vượt khung | Lưu được; `/careers` thấy thay đổi ngay; tab Hoạt động của tin có dòng "Sửa nội dung tin — mô tả, nhãn tuyển gấp"; lương vượt khung bị chặn |
| W-31 | `tran.ha` | Tin 5 (tạm dừng): mở lại; tin 4: tạm dừng rồi mở; KHÔNG đóng tin | Trạng thái đổi; nhật ký có dòng "Đổi trạng thái tin" |
| W-32 | `tran.ha` | Yêu cầu 7: "Yêu cầu sửa" với ghi chú | Trạng thái "Cần sửa"; `do.vy` có thông báo |
| W-33 | `do.vy` | Sửa yêu cầu 7 và gửi lại | Về "Chờ duyệt"; khối Lịch sử: tạo → gửi → yêu cầu sửa → sửa → gửi |
| W-34 | `pham.anh` | Duyệt yêu cầu 7 (người duyệt khác người đã yêu cầu sửa) | Duyệt được; "Người duyệt" ghi Phạm Ngọc Ánh; lương duyệt min > max bị chặn |
| W-35 | `nguyen.long` | Tạo yêu cầu mới: lương min > max; chọn kỹ năng; thử "thêm nhanh" kỹ năng mới | Chặn lương sai; không có nút thêm nhanh kỹ năng (2.3) |
| W-36 | `tran.ha` | `/masterdata`: thêm một kỹ năng "Rust", sửa, ẩn | Chạy; `/audit-logs` (Quản trị) có 3 dòng "Thêm / Sửa danh mục · Kỹ năng" |

### D3. Quản trị (web)

| Mã | Việc | Phải thấy |
|---|---|---|
| W-37 | `/admin/users/invite`: mời `nv.moi@example.com` làm Trưởng bộ phận Phòng Nhân sự | Trả về nhanh; tài khoản ở tab "Chờ kích hoạt"; cảnh báo "Phòng Nhân sự chưa có đại diện" ở Tổng quan biến mất sau khi kích hoạt (kích hoạt bằng SQL như W-4) |
| W-38 | `/admin/users/3` (Phạm Ngọc Ánh): "Đổi vai trò / phòng ban" → Trưởng bộ phận, Phòng Kiểm thử | Hộp thoại nhắc số việc đang phụ trách; lưu xong vai trò đổi; `pham.anh` đăng nhập lại thấy menu của trưởng bộ phận; nhật ký "Đổi vai trò / phòng ban". **Đổi lại như cũ sau khi kiểm** |
| W-39 | Mở `/admin/users/1` (chính mình) | Không có nút đổi vai trò, không tự khoá được |
| W-40 | Khoá `hoang.thinh`, thử đăng nhập bằng tài khoản đó, thử chọn làm người phỏng vấn khi lên lịch; mở khoá | Đăng nhập báo "Tài khoản đã bị khoá…"; không có trong danh sách người phỏng vấn (2.5) |
| W-41 | Thông tin doanh nghiệp: chọn màu vàng nhạt `#F5D76E` | Xem trước dùng bản đậm hơn, có dòng cảnh báo tương phản; bấm Lưu → giá trị lưu là bản đã làm đậm. **Đổi lại `#0F6E66` và lưu** |
| W-42 | Sau khi đổi màu ở W-41: mở `/careers/home` (tab ẩn danh) và Expo web | Web đổi màu ngay; mobile đổi sau một lần tải lại |
| W-43 | Trang tuyển dụng: nền "Chuyển màu" với 2 màu, tắt khối Đời sống, "Xuất bản"; kiểm `/careers/home`; rồi trả về "Màu thương hiệu", bật lại, xuất bản | Trang công khai đổi đúng theo từng lần xuất bản; nhật ký có "Xuất bản trang tuyển dụng" |
| W-44 | Sửa tên hiển thị công ty rồi sửa lại | Nhật ký "Sửa thông tin doanh nghiệp — Đổi: tên" |
| W-45 | Cài đặt: đổi mật khẩu sai mật khẩu hiện tại | "Mật khẩu hiện tại không đúng" |

### D4. Phân quyền qua API (dùng `curl` hoặc `fetch` với token của từng vai trò)

| Mã | Gọi | Phải trả |
|---|---|---|
| W-46 | Ứng viên gọi `GET /api/application/applications` | 403, thân `{message:"Bạn không có quyền thực hiện thao tác này", …}` |
| W-47 | Ứng viên A gọi `GET /api/offer/offers/my/<id thư của ứng viên B>` | 403 hoặc 404, không lộ dữ liệu |
| W-48 | `nguyen.long` gọi `GET /api/application/applications/20` (phòng Frontend) | 403 / 404 |
| W-49 | `tran.ha` gọi `PATCH /api/auth/users/3/role` | 403 |
| W-50 | Không token gọi `GET /api/notification/audit-logs` | 401 |
| W-51 | `nguyen.long` gọi `POST /api/masterdata/skills` | 403 |

### D5. Mobile (Expo web) — luồng ghi

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| W-52 | (mới) | Đăng ký ở mobile: không tick đồng ý → tick | Chặn rồi cho qua; màn nhập OTP |
| W-53 | `do.tuan` | Lịch → buổi 14 → Xin dời | Trạng thái đổi; phía web chuyên viên thấy |
| W-54 | `ngo.bao` | Việc làm → tin Frontend → Ứng tuyển: chọn nguồn, tick đồng ý | Nộp được; tab Hồ sơ có đơn mới |
| W-55 | `nguyen.long` | Xác nhận một buổi (nếu còn buổi chờ) / đề xuất giờ khác | Chạy, Snackbar báo thành công |
| W-56 | `tran.ha` | Hồ sơ một ứng viên ở cột Ứng tuyển → chuyển sang Sàng lọc; từ chối một hồ sơ | Chạy; chọn lý do từ danh sách tiếng Việt |
| W-57 | `tran.ha` | Thư mời nháp (tạo mới ở web trước nếu đã xoá ở W-26) → Gửi | Màn nói rõ "gửi cho ứng viên ngay" trước khi bấm |

**Kết quả phần D phải nộp:** bảng 57 dòng trong báo cáo; danh sách lỗi mới + commit sửa; với lỗi không sửa được, ghi lý do và bước tái hiện.

## 7. Phần E — chốt

| Mã | Việc | Kết quả phải đạt |
|---|---|---|
| E-1 | Chạy toàn bộ test: 9 service lần lượt (`for s in auth masterdata recruitment candidate application interview offer notification dashboard; do (cd $s-service && ./mvnw.cmd -q test > ../tmp/test-$s.log 2>&1; echo "$s $?"); done` — chạy nền), `cd frontend && npx tsc -b --noEmit`, `cd mobile && npm run typecheck && npm run lint`, `cd ai-service && .venv/Scripts/python.exe -m pytest tests/test_scoring_aggregate.py -q` | 9 dòng `… 0`; tsc không in gì; lint 0 lỗi; pytest pass |
| E-2 | `bash scripts/dev/svc.sh status` → đủ 11 UP (khởi động lại cái nào bị devtools làm rớt) | 11 UP |
| E-3 | Chạy lại dữ liệu: `PYTHONIOENCODING=utf-8 ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py > tmp/seed.log 2>&1` (nền, 35–45 phút, cần ≥ 4 GB RAM trống) | Dòng cuối log bắt đầu bằng "Xong."; không có dòng `!!` hay `Traceback`; dòng tổng kết: 41 đơn (3 HIRED, 3 OFFER, 9 TECHNICAL_INTERVIEW, 7 CV_SCREENING, 7 APPLIED, 2 WITHDRAWN), 20 buổi phỏng vấn, 7 thư mời (1 DRAFT, 1 APPROVED, 1 EXPIRED, 1 DECLINED, 3 ACCEPTED), AI không còn đơn FAILED |
| E-4 | Nếu AI còn đơn lỗi (Gemini 503): `… seed.py --rescore-failed` | Mọi đơn `aiStatus = COMPLETED` |
| E-5 | Kiểm nhanh sau seed (5 phút): `/dashboard` (Quản trị), `/my-work` (`tran.ha`), `/careers/home` | Giống mô tả ở `frontend/docs/TEST_ACCOUNTS.md`; lần đăng nhập gần nhất của nhân viên trong 2 ngày qua; dòng nhật ký "Lên lịch phỏng vấn" của buổi tháng 9–10 ghi đúng giờ hẹn quá khứ |
| E-6 | (Tuỳ chọn, chỉ khi có thời gian và được đồng ý vì phải tạo volume mới) thử `docker/postgres-init/init-databases.sql` trên một container Postgres tạm, cổng khác | Script chạy hết không lỗi; đăng nhập `le.quan@example.com` được sau khi trỏ auth-service sang DB tạm. Không đụng `ats-postgres` |
| E-7 | Cập nhật `docs/KET_QUA_HOAN_THIEN.md`: thay mục 6 "Chưa kiểm" bằng bảng kết quả A + D; mục 4 thêm bảng thay đổi so với `docs/UI`; mục 7 "Còn lại" chỉ còn những gì thật sự chưa làm | Không còn câu nào trong báo cáo mâu thuẫn với trạng thái thật |
| E-8 | Cập nhật `frontend/docs/TEST_ACCOUNTS.md` nếu kịch bản demo đổi; `docs/TIEN_DO_HOAN_THIEN.md` tới việc cuối | — |
| E-9 | Commit + push `origin/dev`; `git status` sạch (trừ `tmp/`, `logs/`) | `git log origin/dev -1` là commit cuối |

## 8. Bẫy đã gặp (đọc để khỏi mất thời gian lần nữa)

- **Service "DOWN" mà khởi động lại không lên:** còn tiến trình cũ bị treo giữ file log. `svc.sh` bản mới tự tìm và tắt; nếu vẫn
  kẹt, tìm `cmd.exe`/`java.exe` có dòng lệnh chứa tên service (PowerShell `Get-CimInstance Win32_Process`) và `taskkill /F /T`.
- **Thêm migration Flyway:** liệt kê bằng `ls … | sort -V` (đã từng đặt trùng số 10). Xoá bản cũ trong `target/classes/db/migration`
  nếu đổi tên file. Test không chạy Flyway nên chỉ lộ khi khởi động service.
- **API công khai mới** phải thêm vào `api-gateway/.../JwtAuthGlobalFilter.java`, nếu không gateway trả 401.
- **offer-service** có trigger khoá sửa thư đã gửi và ràng buộc "hạn phản hồi < ngày đi làm". Sửa dữ liệu bằng SQL phải
  `set session_replication_role = replica;` trong cùng phiên.
- **ai-service ghi giờ UTC**, các service Java ghi giờ Việt Nam.
- **Gemini hay trả 503** vào giờ cao điểm: chấm lại là được, không phải lỗi của hệ thống.
- **`COLORS.primary` trên web là `var(--ats-brand)`**, không nối đuôi alpha (`${COLORS.primary}1A` sẽ hỏng) — dùng `brandAlpha(%)`
  hoặc `COLORS.primarySoft/primaryFaint`.
- **Python trên Windows gọi `bash` ra WSL** — trong script dùng `reset_db.git_bash()`.
- Claude Code tự dừng job nền khi máy thiếu RAM lúc phiên đang rảnh. Trước khi chạy `seed.py`: đóng Expo web và các ứng dụng
  nặng, kiểm RAM trống ≥ 4 GB (`powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)"`).

## 9. Mẫu báo cáo khi xong mỗi phần

```
Phần <A|B|C|D|E> — <ngày giờ>
Đã làm: <n>/<tổng> việc. Đạt: <n>. Lỗi đã sửa: <n> (liệt kê mã việc → file). Lỗi chưa sửa: <n> (mã việc → lý do).
Test: <service nào đã chạy, kết quả>. tsc / typecheck / lint: <kết quả>.
Commit: <hash> <thông điệp>.
Việc tiếp theo: <mã việc>.
```
