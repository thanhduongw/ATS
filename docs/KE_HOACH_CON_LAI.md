# Kế hoạch các phần còn lại (giao cho phiên làm việc sau)

Lập ngày 17/11/2026, sau commit `83d26f1` trên nhánh `dev`. Hạn của đề bài gốc (`docs/GIAO_VIEC_FABLE.md`): **25/11/2026**.

Tài liệu này tự đứng được: người (hoặc mô hình) nhận việc không cần đọc lịch sử trò chuyện. Đọc theo thứ tự:

1. `CLAUDE.md` ở gốc — cách chạy, cổng, bẫy môi trường, quy tắc commit.
2. `mobile/CLAUDE.md` — quy ước riêng của app (token màu, chuỗi, component…).
3. File này, từ đầu đến cuối, trước khi làm việc đầu tiên.
4. Khi cần chi tiết một mã lỗi: `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md` (đề bài lỗi gốc) và `docs/KET_QUA_HOAN_THIEN.md`
   (đã làm gì, đã kiểm bằng gì, quyết định kỹ thuật).

---

## 0. Quy tắc bắt buộc

- Làm trên nhánh `dev`; commit theo từng phần (A, B, C…), push `origin/dev`. **Không tạo Pull Request, không merge vào `main`,
  không push nhánh khác.**
- Thông điệp commit tiếng Anh, dạng `fix(web): …`, `style(mobile): …`, `test(notification): …`.
  **Không thêm `Co-Authored-By` hay dòng "Generated with Claude Code".**
- Không commit `.env`, `target/`, `node_modules`, `.venv`, `logs/`, `tmp/`, `backups/`.
- **Không xoá file trên S3. Không gửi email ra ngoài miền `example.com`.** Không deploy, không build APK, không chạy benchmark AI.
- **Không đọc các file README.** Không đổi phông chữ; không đổi thứ tự / khối chính của màn so với `docs/UI`.
- **Không bấm "Xuất Excel" thật** — chặn trước bằng JS (xem V-HR-11).
- Thư viện mới: không thêm. Mobile nếu bắt buộc thì chỉ qua `npx expo install`.
- Lệnh chạy lâu (test Maven, `seed.py`, khởi động service) chạy nền; không tự lặp `sleep`/`tail` để chờ; đọc log có lọc.
- Máy 16 GB RAM: không chạy test của hai service cùng lúc; khởi động mỗi đợt tối đa 4 service.
  **Chạy `mvnw test` làm service đang chạy tự khởi động lại** (devtools) — đừng chạy test khi đang kiểm giao diện phụ thuộc
  service đó hoặc khi `seed.py` đang chạy; chạy test xong thì `bash scripts/dev/svc.sh status` và khởi động lại cái bị rớt.
- **"Xong" một việc** = có mã + test của service liên quan qua (`./mvnw.cmd -q test`) + `npx tsc -b --noEmit` (web) /
  `npm run typecheck && npm run lint` (mobile) sạch + **đã thấy chạy đúng trên giao diện**. Thiếu bước nào ghi rõ là thiếu.
- Sau mỗi việc: thêm một dòng vào `docs/TIEN_DO_HOAN_THIEN.md` (mã việc — kết quả — đã kiểm bằng gì) và cập nhật bảng tương
  ứng trong `docs/KET_QUA_HOAN_THIEN.md`. Không ghi "đã kiểm" cho thứ chưa tự mắt thấy.

### Khi nào dừng lại hỏi người dùng

Chỉ dừng hỏi khi: (1) cần xoá / tạo lại volume Postgres hoặc container Docker; (2) cần thêm thư viện; (3) một thay đổi giao
diện buộc phải đổi bố cục khối chính của `docs/UI`; (4) hai yêu cầu trong đề bài mâu thuẫn nhau. Các trường hợp khác (lỗi
build, service không lên, Gemini 503, máy thiếu RAM) tự chẩn đoán và xử lý theo mục 9 "Bẫy đã gặp".

---

## 1. Trạng thái hiện tại (17/11/2026, commit `83d26f1`)

| Mục đề bài | Trạng thái | Còn thiếu |
|---|---|---|
| 3 nhóm A, B, C | Mã xong, test 9 service qua | Kiểm giao diện phần lớn luồng ghi (phần D) |
| 3 nhóm D (lỗi nhỏ, mục 4 của file kiểm tra) | Một phần | Phần B của kế hoạch này |
| 4 Chức năng mới (màu thương hiệu, hero, email nền, nhắc lịch, tìm không dấu) | Mã xong, test qua, kiểm UI một phần | Thiếu test tự động riêng (phần F); kiểm UI các trường hợp biên (W-41…W-43, B-14) |
| 5 Giao diện "bớt giống AI làm" | Chưa làm | Phần C |
| 6 Dữ liệu demo | Xong, `seed.py` đã chạy trọn | Chạy lại lần cuối sau các sửa đổi (phần E) |
| 7 Kiểm toàn bộ trên giao diện | Khoảng 25 % | Phần A + D |
| 9 Bàn giao | Đã viết 4 tài liệu | Cập nhật lần cuối (phần E) |

Những gì đã thấy chạy đúng trên giao diện: liệt kê ở `docs/KET_QUA_HOAN_THIEN.md` mục 6 — **không kiểm lại**, trừ khi phần B/C
đổi đúng màn đó.

---

## 2. Chuẩn bị phiên làm việc

| Bước | Lệnh | Kết quả phải thấy |
|---|---|---|
| 1 | Mở Docker Desktop; `docker ps --format '{{.Names}} {{.Status}}'` | `ats-postgres`, `ats-rabbitmq`, `ats-redis` Up |
| 2 | `bash scripts/dev/svc.sh status` | 11 dòng UP. Thiếu: `bash scripts/dev/svc.sh restart <tên…>` (mỗi lần ≤ 4 service, chạy nền), log ở `logs/<tên>.log` |
| 3 | `cd frontend && npm run dev` (nền) | http://localhost:3000 mở được |
| 4 | Chỉ khi kiểm mobile: `cd mobile && npx expo start --web --port 19006` (nền) | http://localhost:19006 mở được. **Tắt khi không dùng** (tốn ~1 GB RAM) |
| 5 | `curl -s http://localhost:8080/api/auth/public/theme` | JSON có `"companyName":"Mộc Lam Software","brandColor":"#0F6E66"` |
| 6 | `docker exec ats-postgres psql -U ats_user -d ats_application -tAc "select count(*) from application"` | `41`. Khác → dữ liệu đã bị đổi; nếu cần dữ liệu sạch, chạy lại `seed.py` (E-3) |
| 7 | `powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)"` | ≥ 2 GB khi kiểm giao diện; ≥ 4 GB trước khi chạy `seed.py` |

**Kiểm giao diện bằng Chrome:** dùng công cụ Claude in Chrome; tạo tab mới, cửa sổ 1440 × 900 cho web, 480 × 900 cho Expo web.
Đóng tab khi xong.

**Đăng nhập nhanh trên web** (chạy trong tab `localhost:3000`, đổi email rồi tải lại trang):

```js
const email='tran.ha@example.com';
const t=await (await fetch('http://localhost:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password:'Password123!'})})).json();
const me=await (await fetch('http://localhost:8080/api/auth/me',{headers:{Authorization:'Bearer '+t.accessToken}})).json();
localStorage.setItem('ats_auth',JSON.stringify({accessToken:t.accessToken,refreshToken:t.refreshToken,
  user:{userId:String(me.id),email:me.email,role:me.role,departmentId:me.departmentId??null,fullName:me.fullName,avatarUrl:me.avatarUrl??null}}));
```

**Mobile web** dùng sessionStorage: đăng nhập bằng form, **bấm nút "Đăng nhập"** (phím Enter ở ô email không gửi form).
Đổi tài khoản: chạy `sessionStorage.clear()` rồi mở lại `/login`.

**Gọi API với token** (cho phần phân quyền D4): lấy `JSON.parse(localStorage.ats_auth).accessToken` rồi
`fetch(url,{headers:{Authorization:'Bearer '+token}})`.

### Dữ liệu demo hiện có

Mã số dưới đây đúng với lần chạy `seed.py` ngày 17/11; chạy lại cùng phiên bản script thì thứ tự tạo giống hệt nên mã giữ nguyên.
Nếu nghi ngờ, kiểm lại: `docker exec ats-postgres psql -U ats_user -d ats_application -tAc "select id,candidate_id,candidate_name_snapshot,current_stage_type from application order by id"`.

Tài khoản nội bộ (mật khẩu `Password123!`, tất cả `@example.com`):
Quản trị `le.quan` (id 1) · Tuyển dụng `tran.ha` (2, phụ trách tin 1, 3, 6), `pham.anh` (3, phụ trách tin 2, 4, 5) ·
Trưởng bộ phận `nguyen.long` Backend (4), `vo.phuong` Frontend (5), `dang.bao` Mobile (6), `bui.tam` Kiểm thử (7),
`hoang.thinh` DevOps (8), `do.vy` Dữ liệu & AI (9). Phòng Nhân sự **chưa có** trưởng bộ phận (cố ý — W-37 dùng).

Tin: 1 Backend Java (đang tuyển, 2 suất, đã tuyển 1) · 2 Frontend React (đang tuyển, 2 suất, đã tuyển 1) · 3 Mobile React Native ·
4 Kiểm thử tự động · 5 DevOps (tạm dừng) · 6 Kỹ sư Dữ liệu (đã đóng).
Yêu cầu: 1–6 đã duyệt · 7 AI/ML chờ duyệt (của `do.vy`) · 8 Thực tập sinh Backend nháp (của `nguyen.long`) ·
9 UI/UX cần sửa (của `vo.phuong`) · 10 Kiểm thử thủ công bị từ chối (của `bui.tam`).

| Tình huống | Ứng viên (email = khoá@example.com) | Đơn | Ứng viên id | Buổi PV | Thư mời |
|---|---|---|---|---|---|
| Thư mời đã gửi, chờ phản hồi | `tran.huy` | 17 | 15 | 7 | 4 |
| Thư mời nháp | `luong.khoi` | 15 | 13 | 6 | 3 |
| Thư mời hết hạn | `nguyen.hang` | 9 | 8 | 4 | 2 |
| Thư mời bị từ chối | `vo.tu` | 8 | 7 | 3 | 1 |
| Đã nhận việc | `nguyen.khanh` / `dinh.trang` / `tran.thu` | 4 / 5 / 2 | 4 / 5 / 2 | 19 / 20 / 18 | 6 / 7 / 5 |
| Đơn tự đóng vì đã nhận việc nơi khác | `dinh.trang` | 6 | 5 | — | — |
| Đã phỏng vấn, thiếu phiếu của `tran.ha` | `le.tram` | 18 | 16 | 8 | — |
| Đã phỏng vấn, đủ phiếu, chờ quyết định | `ta.ngan` | 20 | 18 | 9 | — |
| Lịch chờ trưởng bộ phận xác nhận | `ho.ngoc` | 30 | 28 | 17 | — |
| Lịch chờ ứng viên trả lời | `huynh.hao` | 29 | 27 | 16 | — |
| Lịch hai bên đã xác nhận | `do.tuan` / `nguyen.nghia` | 26 / 22 | 24 / 20 | 14 / 10 | — |
| Ứng viên xin dời | `chau.diep` | 25 | 23 | 13 | — |
| Trưởng bộ phận đề xuất giờ khác | `bui.huy` | 27 | 25 | 15 | — |
| Một buổi đã huỷ + một buổi mới chờ xác nhận | `truong.linh` | 23 | 21 | 11, 12 | — |
| Vắng mặt, đã từ chối | `nguyen.phuoc` | 13 | 11 | 5 | — |
| Đã rút đơn | `mai.thu` / `ha.nhat` | 16 / 21 | 14 / 19 | — | — |
| CV chèn lệnh điều khiển AI | `cao.tri` / `kieu.duyen` | 37 / 24 | 32 / 22 | — | — |
| Hồ sơ trái ngành (AI ≈ 19 điểm) | `duong.nhung` | 14 | 12 | — | — |
| Mới nộp, chưa ai xem | `ngo.bao` | 40 | 33 | — | — |
| Hồ sơ do chuyên viên nhập (không có tài khoản) | Vũ Hoàng Nam, Lê Hoàng Phúc, Đoàn Thị Như Quỳnh, Trịnh Quốc Đạt | 33, 19, 35, 10 | 30, 17, 31, 9 | — | — |

Đường dẫn web: hồ sơ `/candidates/<ứng viên id>/applications/<đơn>` · buổi PV `/interviews/<id>` · thư mời `/offers/<id>` ·
tin `/recruitment/postings/<id>` · yêu cầu `/recruitment/requisitions/<id>` · người dùng `/admin/users/<id>` ·
trang việc làm công khai `/careers`, `/careers/home`.

---

## 3. Đối chiếu đề bài → việc trong kế hoạch

| Đề bài | Việc trong kế hoạch |
|---|---|
| Mục 3 nhóm D (từng gạch đầu dòng mục 4.4 của file kiểm tra) + lỗi thấy khi kiểm 17/11 | B-1 … B-16 |
| Mục 4 — kiểm giao diện các tính năng mới | V-AD-7, V-HR-1, V-CA-10, V-MB-9, W-42 … W-45, B-14 |
| Mục 4 — test tự động cho tính năng mới | F-1 … F-7 |
| Mục 5 | C-1 … C-9 |
| Mục 7 — Ứng viên (web + mobile) | V-CA-*, W-1 … W-12b, W-25, W-26, V-MB-1 … 5, W-54 … W-56 |
| Mục 7 — HR (web + mobile) | V-HR-*, W-15 … W-33, W-37, V-MB-6, V-MB-7, V-MB-9, W-58, W-59 |
| Mục 7 — Trưởng bộ phận | V-HM-*, W-13, W-21, W-34 … W-36, V-MB-8, W-57 |
| Mục 7 — Admin (web; mobile bị chặn) | V-AD-*, W-38 … W-45 (mobile chặn: đã kiểm, không làm lại) |
| Mục 7 — Phân quyền | V-AD-8, V-HM-2, W-46 … W-53 |
| Mục 6 — chạy lại dữ liệu | E-3 … E-5 |
| Mục 9 — bàn giao | E-7 … E-10 |

---

## 4. Thứ tự làm và ước lượng

| Thứ tự | Phần | Ước lượng | Vì sao ở vị trí này |
|---|---|---|---|
| 1 | **B** — lỗi đã biết (nhóm D + lỗi thấy khi kiểm) | 0,5 ngày | Sửa trước để không phải kiểm giao diện hai lần |
| 2 | **F** — viết test còn thiếu cho mục 4 | 0,5 ngày | Có test rồi mới yên tâm đổi tiếp |
| 3 | **A** — kiểm giao diện, luồng chỉ đọc | 0,5 ngày | Không làm bẩn dữ liệu demo |
| 4 | **C** — mục 5: câu chữ và bố cục | 1 ngày | Đổi giao diện xong mới kiểm lượt cuối |
| 5 | **D** — kiểm giao diện, luồng ghi | 1 ngày | Làm bẩn dữ liệu → để gần cuối |
| 6 | **E** — test toàn bộ, chạy lại `seed.py`, chốt tài liệu | 0,5 ngày | Trả dữ liệu demo sạch để bàn giao |

Nếu thiếu thời gian: **E luôn làm**; sau đó ưu tiên D > B > A > F > C.

---

## 5. Phần B — lỗi đã biết, chưa sửa

Mỗi việc: sửa → `tsc`/`typecheck`/`lint` (và `mvnw test` nếu đụng backend) → nhìn lại trên giao diện → một dòng trong
`TIEN_DO_HOAN_THIEN.md`. Commit cả phần: `fix(web): …` / `fix(mobile): …`.

| Mã | Lỗi | Chỗ sửa | Kết quả phải đạt |
|---|---|---|---|
| B-1 | Bảng "Theo phòng ban" ở `/dashboard` cắt chữ ("Phòng Kiểm thử (Q…", "Nguyễn Hoàng …") | `frontend/src/features/overview/pages/CompanyOverviewPage.tsx` dòng ~94–103: bỏ `ellipsis: true` ở hai cột đầu, cho tên xuống dòng (`whiteSpace: "normal"`), đặt `width` cột Phòng ban ≈ 170, Đại diện ≈ 190 | Cửa sổ 1440 px: đủ tên 7 phòng và 6 đại diện, không "…" |
| B-2 | Khối "Cần chú ý" ở `/dashboard`: liên kết hành động ("Mời") tràn ra ngoài thẻ | Cùng file, quanh dòng 193: `InlineNotice` có `action` — cho khối chữ `minWidth: 0`, liên kết `flexShrink: 0` | Liên kết nằm trong thẻ, căn phải |
| B-3 | Phễu "Đã tuyển = 0" trong khi ô "Đã tuyển trong quý = 1" — hai định nghĩa khác nhau (phễu tính hồ sơ **nộp** trong quý, ô KPI tính hồ sơ **nhận việc** trong quý) | `frontend/src/features/overview/useCompanyOverview.ts` (`funnelOf`, dòng ~134) và phụ đề phễu ở `CompanyOverviewPage.tsx` | Không đổi công thức (giữ một công thức thống nhất với 3.12), chỉ đổi phụ đề phễu thành "Hồ sơ nộp trong Quý 4/2026 đã tới từng giai đoạn" để người xem không thấy mâu thuẫn. Ghi lại quyết định vào báo cáo mục 8 |
| B-4 | Thẻ Kanban cắt tên ứng viên ("Hồ Thị Bích …", "Cao Min…") | `frontend/src/features/candidate/components/ApplicationKanbanBoard.tsx` — tên cho 2 dòng (`WebkitLineClamp: 2`), nhãn "CV bất thường" xuống dòng dưới tên thay vì cùng hàng | Đủ tên trên mọi thẻ của tin 1 |
| B-5 | Lưới giờ phỏng vấn: buổi 60 phút chỉ tô 1 ô 30 phút | `frontend/src/features/interview/components/InterviewTimeGrid.tsx` (và chế độ "Lịch tuần" ở `InterviewSchedulePage.tsx`): số ô = `durationMinutes / 30` | 60 phút phủ 2 ô, 90 phút phủ 3 ô, ở cả lưới chọn giờ khi lên lịch và lịch tuần |
| B-6 | `/offers` của trưởng bộ phận có tiêu đề "Kết quả tuyển dụng" (trùng `/results`) và tab "Bản nháp" không dùng | `frontend/src/features/offer/pages/OffersPage.tsx` (dòng có `isHm ? "Kết quả tuyển dụng"`); kiểm menu ở `frontend/src/layouts/AppLayout.tsx` | Nếu menu trưởng bộ phận không dẫn tới `/offers`: chặn route này cho vai trò đó (chuyển về `/results`). Nếu có: tiêu đề "Thư mời của phòng", bỏ tab Bản nháp |
| B-7 | Hồ sơ ứng viên hỏi Ngày sinh, Giới tính trong khi AI đã bỏ hai trường này | Web: `frontend/src/features/candidate/pages/CandidateProfilePage.tsx` (~dòng 141–145), `components/CandidateFormModal.tsx` (~211–220). Mobile: `mobile/app/(candidate)/profile.tsx` + chuỗi trong `mobile/src/lib/strings.ts` | Dưới hai ô có dòng nhỏ "Không bắt buộc · không dùng để đánh giá hồ sơ" (web: `extra` của `Form.Item`; mobile: chuỗi mới trong `strings.ts`) |
| B-8 | 3.7 phần còn thiếu: trang chi tiết việc chưa báo sẵn lý do không nộp được (đã nhận việc / đã rút đơn / đã nộp) | Web: `frontend/src/features/public/pages/JobDetailApplyPage.tsx` (đã có `closedLabel(mine)`, dùng cho cả trường hợp ứng viên đã nhận việc ở tin khác — lấy từ `GET /application/applications/my`). Mobile: `mobile/app/(candidate)/jobs/[id].tsx` | `dinh.trang` mở tin 1: thấy ngay "Bạn đã nhận việc ở vị trí khác nên không nộp thêm đơn được", nút Ứng tuyển khoá. `mai.thu` mở tin 1: "Bạn đã rút đơn ở vị trí này". Cả web và mobile |
| B-9 | Giới hạn dung lượng không thống nhất: giao diện ứng viên ghi 5 MB, backend candidate-service 10 MB (`MAX_RESUME_SIZE_BYTES`, `CandidateService.java:39`), "AI đọc CV" 20 MB (`AiCvUploadModal.tsx:29`) | Chốt **10 MB** cho CV ở mọi nơi: sửa câu hướng dẫn và kiểm tra phía client (`grep -rn "5MB\|5 MB\|5 \* 1024" frontend/src mobile/src`), `MAX_FILE_SIZE_MB = 10` ở AiCvUploadModal; kiểm giới hạn ai-service (`grep -rn "MAX\|max_size\|MB" ai-service/app/api`) và `spring.servlet.multipart.max-file-size` của candidate-service | Một con số 10 MB ở mọi câu hướng dẫn; file 12 MB bị từ chối ở client và (nếu lách client) backend trả 413 câu tiếng Việt. Ảnh đại diện / logo giữ 5 MB |
| B-10 | Mobile: tiêu đề "Xác nhận phỏng vấn" (`strings.ts:639` `titleHm`) cho cả buổi đã xong; dòng "Hình thức" hiện tên địa điểm | `mobile/src/features/staff/screens/interview-screen.tsx` + `src/lib/strings.ts` (khoá `titleHm`, `format`) | Buổi còn chờ xác nhận: "Xác nhận phỏng vấn"; các trạng thái khác: "Buổi phỏng vấn". "Hình thức" = "Trực tuyến"/"Trực tiếp"; địa điểm hoặc đường dẫn họp ở dòng riêng |
| B-11 | Hộp thoại từ chối hồ sơ: nút "Từ chối" không đỏ | Hộp thoại từ chối dùng chung (tìm `Từ chối hồ sơ ứng tuyển` trong `frontend/src`) — dùng `SmallDialog` với `danger` hoặc `okButtonProps={{ danger: true }}` | Nút xác nhận đỏ ở Kanban, trang hồ sơ, từ chối hàng loạt |
| B-12 | Menu sắp xếp "Lương cao n…" bị cắt ở `/careers` | `frontend/src/features/public/pages/CompanyJobsPage.tsx` (~dòng 151): `popupMatchSelectWidth={false}` và nới `style.width` | Đọc đủ "Sắp xếp: Lương cao nhất" cả trong ô và trong danh sách xổ xuống |
| B-13 | Cột trạng thái ở danh sách lịch phỏng vấn bị cắt chữ | `InterviewSchedulePage.tsx` — cột Trạng thái `width` ≥ 170 hoặc nhãn xuống dòng | Ở 1280 px, nhãn dài nhất ("Chờ ứng viên xác nhận", "Đề xuất đổi giờ") hiện đủ |
| B-14 | Nhắc lịch 24h/1h chưa thấy chạy thật | Không sửa mã trước. Kiểm: tạo một buổi (web, `tran.ha`) cho đơn ở cột Phỏng vấn, giờ hẹn = hiện tại + 50 phút; `nguyen.long` xác nhận; chờ 2 phút; `docker exec ats-postgres psql -U ats_user -d ats_interview -tAc "select id,status,scheduled_at,reminder_24h_sent_at,reminder_1h_sent_at from interview order by id desc limit 3"` và `… -d ats_notification -tAc "select recipient_user_id,title,message from notification where type='INTERVIEW_REMINDER' order by id desc limit 5"` | `reminder_1h_sent_at` có giá trị; có thông báo "Sắp đến giờ phỏng vấn" cho người phỏng vấn (và ứng viên nếu buổi đã tới bước ứng viên thấy); chờ thêm 2 phút không sinh dòng thứ hai; đổi giờ buổi đó sang +23 giờ → sau ≤ 2 phút có lời nhắc 24h mới. Huỷ buổi thử sau khi kiểm. Lỗi thì sửa ở `interview-service/.../interview/InterviewReminderJob.java` hoặc `notification-service/.../event/BusinessEventListener.java#onInterviewReminder` |
| B-15 | Tiêu đề tab trình duyệt "ATS — Hệ thống Quản lý Tuyển dụng" | `frontend/index.html` (đặt "Tuyển dụng") + `frontend/src/app/BrandProvider.tsx`: khi có `companyName` từ `/auth/public/theme` thì `document.title = \`${companyName} · Tuyển dụng\`` (cần thêm `companyName` vào kiểu `PublicTheme`) | Tab hiện "Mộc Lam Software · Tuyển dụng" |
| B-16 | Báo cáo ghi 1.7 chưa khớp hành vi: hồ sơ chèn lệnh vẫn có điểm và xếp loại | **Không sửa mã** — đề bài (`GIAO_VIEC_FABLE.md` dòng 101) chỉ yêu cầu lưu cờ + banner + badge. Sửa câu trong `docs/KET_QUA_HOAN_THIEN.md` (bảng nhóm A dòng 1.7) cho đúng: "AI vẫn chấm và xếp loại; hồ sơ bị gắn cờ hiện cảnh báo để người tuyển dụng xem trực tiếp" | Báo cáo và hành vi khớp nhau |

Lỗi tìm thêm trong phần A/D: thêm vào bảng này với mã B-17, B-18… rồi sửa theo cùng quy trình.

---

## 6. Phần F — test tự động còn thiếu cho mục 4

Mỗi test viết bằng JUnit 5 + Mockito (giống test sẵn có trong cùng service; xem `src/test/java/.../service/*Test.java` để theo
mẫu). Commit: `test(<service>): …`.

| Mã | Service / file test mới | Ca kiểm | Kết quả phải đạt |
|---|---|---|---|
| F-1 | auth-service `src/test/java/iuh/fit/se/auth/service/BrandColorTest.java` | `validate(null)`/`""` → null; `"#0f6e66"` → `"#0F6E66"`; `"0F6E66"`, `"#12345"`, `"red"` → `BusinessException`; `"#F5D76E"` (nhạt) → `BusinessException`; `contrastWithWhite("#0A59F7")` ≈ 5,2 (sai số 0,1) | Test qua |
| F-2 | auth-service: `CompanyServiceTest` (mới) | `updateCompanyInfo(req, actorId)` gọi `auditEventPublisher.publishSingleCompany(actorId, "COMPANY_UPDATED", "COMPANY", …)` với chi tiết chứa "màu thương hiệu" khi đổi màu | Test qua |
| F-3 | notification-service `src/test/java/iuh/fit/se/notification/notification/EmailNotificationServiceTest.java` | `isDeliverable`: `a@gmail.com` true; `a@example.com`, `a@x.test`, `a@x.invalid`, `abc`, `null`, `""` false. `sendSafe` với `email-enabled=false` không gọi `mailSender` | Test qua |
| F-4 | interview-service `src/test/java/iuh/fit/se/interview/interview/InterviewReminderJobTest.java` | Buổi `HM_CONFIRMED` còn 50 phút, chưa nhắc → phát 1 sự kiện `hoursBefore=1`, đặt cả 2 mốc. Còn 20 giờ, tạo trước đó 3 ngày → phát `hoursBefore=24`. Còn 20 giờ nhưng `hmConfirmedAt` = 2 giờ trước → không phát nhưng đặt mốc 24h. Đã có `reminder1hSentAt` → không phát. Trạng thái `CANCELLED` / giờ đã qua → không phát. `Interview.resetReminders()` xoá cả hai mốc | Test qua |
| F-5 | recruitment-service: test cho `TextSearch.fold(String)` (`src/test/java/iuh/fit/se/recruitment/common/TextSearchTest.java`) | `"Nguyễn Văn Đạt"` → `"nguyen van dat"`; `"  KIỂM THỬ "` → `"kiem thu"`; `likePattern("50%_a")` thoát `%` và `_` bằng `!` | Test qua. (Chỉ cần ở một service; ba bản giống nhau) |
| F-6 | offer-service: thêm ca vào test sẵn có của `OfferService` | `create` với `responseDeadline` cùng ngày hoặc sau `startDate` → `BusinessException("Hạn phản hồi phải trước ngày bắt đầu làm việc")` | Test qua |
| F-7 | Web (không có bộ test đơn vị) — kiểm bằng console trên trang bất kỳ: `const m=await import('/src/app/text.ts'); [m.matchesKeyword('nguyen van','Nguyễn Văn Khánh'), m.matchesKeyword('kiem thu','Kỹ sư Kiểm thử'), m.matchesKeyword('xyz','abc')]` và `const b=await import('/src/app/brand.ts'); [b.ensureContrast('#F5D76E'), b.contrastRatio(b.ensureContrast('#F5D76E'),'#FFFFFF')]` | `[true, true, false]`; màu trả về đậm hơn và tỉ lệ ≥ 4,5 |

---

## 7. Phần A — kiểm giao diện, luồng chỉ đọc

Ghi kết quả cho MỖI việc: `đạt` / `lỗi: <1 câu> → đã sửa ở <file>` / `lỗi: … → chuyển thành B-xx`.
Ngoài cột "Phải thấy", mỗi màn luôn kiểm 4 điều: (a) không có chữ tiếng Anh / không dấu; (b) không có chữ bị cắt "…" ở nội
dung chính; (c) console không có lỗi đỏ (công cụ đọc console, lọc `rror|Warning`); (d) màu chủ đạo là xanh lục `#0F6E66`,
không còn chỗ xanh dương `#0A59F7` ngoài giai đoạn "Đã tuyển" và dải màu AI.

### A1. Quản trị (`le.quan`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-AD-1 | `/dashboard`: đổi "Quý 4/2026" sang "Quý 3/2026"; tải lại trang | URL có `?quarter=`; 5 ô số, bảng phòng ban, phễu đều đổi; tải lại vẫn giữ quý 3 |
| V-AD-2 | Bấm một dòng ở bảng "Theo phòng ban" | Mở `/dashboard/departments/<id>?quarter=…`, giữ đúng quý vừa chọn |
| V-AD-3 | So "Thời gian tuyển trung bình" của Phòng Backend ở chi tiết phòng (cùng quý) với `/results` của `nguyen.long` | Cùng con số |
| V-AD-4 | `/admin/users/roles` | Ma trận quyền: Quản trị có quyền "Danh mục"; không chữ tiếng Anh |
| V-AD-5 | `/masterdata`, mở Phòng ban, Kỹ năng, Lý do từ chối; ô tìm gõ "ky nang", "phong" | Danh mục IT (7 phòng ban, 16 chức danh, 50 kỹ năng, 11 lý do từ chối…); tìm không dấu ra kết quả |
| V-AD-6 | `/audit-logs`: lọc "Loại đối tượng" = Phỏng vấn; tìm "dat lich" | Dòng "Lên lịch phỏng vấn" ghi giờ hẹn thật của buổi (buổi tháng 9–10 ghi giờ tháng 9–10); tìm không dấu ra kết quả; cột Đối tượng kiểu Người dùng hiện tên người |
| V-AD-7 | `/admin/careers` → "Xem trước"; mở `/careers/home` ở tab ẩn danh | Giống nhau; không có ảnh sơ đồ kiến trúc; phần đầu trang chỉ có một ảnh, không bị cắt |
| V-AD-8 | Gõ thẳng `/applications`, `/offers`, `/interviews`, `/my-work` bằng tài khoản Quản trị | Đúng theo ma trận quyền V-AD-4; trang không có quyền phải báo bằng câu tiếng Việt hoặc chuyển hướng, không trắng trang |
| V-AD-9 | `/admin/users`: tab Chờ kích hoạt / Đã khoá / Tất cả; lọc vai trò, phòng ban; tìm "nguyen" | Đếm đúng (9 tài khoản nội bộ, 0 chờ kích hoạt, 0 đã khoá); "Đăng nhập gần nhất" của nhân viên trong 2 ngày qua |
| V-AD-10 | `/admin/users/2` (Trần Thị Thu Hà) | "Việc đang phụ trách" có số liệu; "Lịch sử tài khoản" có các dòng gần nhất |
| V-AD-11 | `/notifications`, `/settings` của Quản trị | Mở được, không lỗi |

### A2. Chuyên viên tuyển dụng (`tran.ha`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-HR-1 | Ctrl+K, gõ "nguyen van", rồi "kiem thu" | Ra Nguyễn Văn Khánh; ra tin "Kỹ sư Kiểm thử tự động"; ↑↓ Enter mở đúng trang; Esc đóng |
| V-HR-2 | `/applications`: các tab, lọc theo tin, ô tìm "le thi"; lọc AI "Phù hợp"; sắp xếp theo điểm AI | Tab "Đã rút đơn" có 2 đơn; tìm không dấu ra Lê Thị Ngọc Trâm; bộ lọc chạy |
| V-HR-3 | Hồ sơ `/candidates/32/applications/37` (Cao Minh Trí) tab Điểm AI | Băng đỏ "CV có nội dung bất thường…" |
| V-HR-4 | Hồ sơ `/candidates/12/applications/14` (Dương Thị Hồng Nhung) | ≈ 19 điểm, "Không phù hợp", nêu yêu cầu bắt buộc còn thiếu |
| V-HR-5 | Hồ sơ `/candidates/15/applications/17` (Trần Đức Huy): tab Hoạt động, tab Thư mời, tab Phỏng vấn, CV xem trong trang | Dòng thời gian đủ: nộp hồ sơ, đổi người phụ trách, chuyển giai đoạn, lên lịch, nộp đánh giá, tạo và gửi thư mời — đúng thứ tự, không lặp; CV PDF hiện trong khung |
| V-HR-6 | `/offers`: các tab trạng thái; mở `/offers/4`, `/offers/2` | Đếm: 1 nháp, 1 chờ phản hồi, 3 đã nhận, 1 từ chối, 1 hết hạn. Chi tiết có hạn phản hồi 17:00; thư hết hạn ghi "Hết hạn" |
| V-HR-7 | `/offers/compare` với tin 1 | Bảng so sánh có điểm AI và điểm đánh giá |
| V-HR-8 | `/interviews`: các tab, lọc người phỏng vấn, lọc việc làm, chế độ "Lịch tuần" | Đếm đúng; lịch tuần hiện đủ buổi tuần này (sau B-5: buổi 60 phút phủ 2 ô) |
| V-HR-9 | `/recruitment/requisitions` các tab; mở yêu cầu 9 và 10 | 9 hiện lời yêu cầu sửa; 10 hiện lý do từ chối; khối Lịch sử đủ bước |
| V-HR-10 | `/notifications` và chuông | "Đánh dấu tất cả đã đọc" → số trên chuông về 0 ngay, không tải lại |
| V-HR-11 | Xuất Excel ở `/applications`. **TRƯỚC** khi bấm, chạy trong console: `window.__saved=[];URL.createObjectURL=(b)=>{window.__saved.push(b.size);return 'blob:x'};HTMLAnchorElement.prototype.click=function(){window.__saved.push(this.download)}` | `window.__saved` có số > 0 và tên file `.xlsx`; **không file nào tải về máy** (kiểm thư mục Downloads không có file mới) |
| V-HR-12 | `/settings` | Mở được; đổi tên hiển thị rồi đổi lại; tải ảnh đại diện PNG |
| V-HR-13 | `/recruitment/postings/1` tab "Nội dung tin" và "Hoạt động"; "Xem tin công khai" | Nội dung đúng; Hoạt động có các mốc của tin; nút mở trang công khai đúng tin |
| V-HR-14 | `/evaluations` | Danh sách đánh giá mở được, có phiếu còn thiếu của Lê Thị Ngọc Trâm |

### A3. Trưởng bộ phận (`nguyen.long`) — web

| Mã | Việc | Phải thấy |
|---|---|---|
| V-HM-1 | `/applications` | Chỉ hồ sơ của tin 1 (14 hồ sơ); không thấy lương thư mời |
| V-HM-2 | Gõ thẳng URL phòng khác: `/candidates/18/applications/20`, `/interviews/9`, `/recruitment/postings/2`, `/recruitment/requisitions/9` | Mỗi trang báo bằng câu tiếng Việt ("Bạn không có quyền…" / "Không tìm thấy…"), không trắng trang, không lộ dữ liệu |
| V-HM-3 | `/recruitment/requisitions/8` (nháp của mình) | Có nút Sửa, Gửi duyệt; ô "Ngày bắt đầu mong muốn" không chọn được ngày đã qua |
| V-HM-4 | `/interviews` tab "Đã xong" → buổi 19 → xem phiếu của mình | Phiếu đủ điểm từng tiêu chí, không sửa được |
| V-HM-5 | `/results` → dòng tin 1 → `/results/1` | Mở được, không có lương |
| V-HM-6 | `/offers` | Đúng như B-6 đã sửa |
| V-HM-7 | Đăng nhập `do.vy` (phòng Dữ liệu & AI, tin 6 đã đóng): `/my-work`, `/results` | Có số liệu tin đã đóng; không lỗi khi phòng không còn tin đang tuyển |

### A4. Ứng viên — web

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| V-CA-1 | `nguyen.khanh` | `/my-offers` → thư đã nhận → tải PDF | Trang chào mừng / thư đã nhận; PDF tiếng Việt có dấu, đúng lương 42.000.000 |
| V-CA-2 | `nguyen.hang` | `/my-offers` | "Hết hạn", không còn nút Nhận / Từ chối |
| V-CA-3 | `luong.khoi` | `/my-offers` | **Không** thấy thư nháp |
| V-CA-4 | `do.tuan` | `/my-interviews` | Buổi 19/11 09:00: đường dẫn họp bấm được, nút tải `.ics` (kiểm bằng cách chặn tải như V-HR-11 hoặc chỉ kiểm có nút) |
| V-CA-5 | `ho.ngoc` | `/my-interviews` | **Không** thấy buổi 17 (trưởng bộ phận chưa xác nhận) |
| V-CA-6 | `truong.linh` | `/my-interviews` | Buổi đã huỷ ở nhóm "Đã huỷ" riêng; buổi mới chưa hiện (chưa ai xác nhận) |
| V-CA-7 | `dinh.trang` | Chi tiết tin 1 từ `/careers` | Như B-8 |
| V-CA-8 | `mai.thu` | Chi tiết tin 1 | Như B-8 |
| V-CA-9 | `nguyen.khanh` | `/my-profile` | Ngày sinh / Giới tính có ghi chú như B-7; CV hiện ngày tải |
| V-CA-10 | Chưa đăng nhập | `/careers`: lọc phòng ban + địa điểm + hình thức; sắp xếp theo lương; tìm "react" | Đếm theo bộ lọc khớp danh sách; sắp xếp đúng thứ tự |
| V-CA-11 | `tran.huy` | `/notifications` | Thông báo có tên vị trí ("…Lập trình viên Backend Java…"), không "Offer #" / "application #" |

### A5. Mobile (Expo web, cổng 19006, cửa sổ 480 × 900)

Danh sách màn có trong app (thư mục `mobile/app/`): ứng viên `(candidate)/` — jobs, applications, interviews, offers,
notifications, profile; chuyên viên tuyển dụng `hr/` — index (Việc của tôi), applications, interviews, jobs, offers,
requisitions, evaluations, search, notifications, more, settings; trưởng bộ phận `hm/` — index, applications, interviews,
requisitions, evaluations, results, notifications, more, settings.

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| V-MB-1 | `tran.huy` | Tab thư mời → mở thư 4 | Chi tiết, hạn phản hồi, nút Nhận / Từ chối, màn nói rõ không hoàn tác |
| V-MB-2 | `do.tuan` | Tab Lịch → buổi 14 | Như B-10 (Hình thức / đường dẫn họp đúng dòng) |
| V-MB-3 | `mai.thu` | Tab Hồ sơ | Đơn ghi "Đã rút đơn" |
| V-MB-4 | `dinh.trang` | Tab Hồ sơ; mở tin 1 | Đơn Mobile "Ngừng xử lý vì bạn đã nhận việc…"; tin 1 như B-8 |
| V-MB-5 | `nguyen.khanh` | Tab "Tôi": hồ sơ, ảnh đại diện, Dữ liệu & quyền riêng tư (chỉ xem, không xoá) | Mở được, chữ đủ dấu |
| V-MB-6 | `tran.ha` | Cả 4 tab; trong "Thêm": Yêu cầu, Thư mời, Đánh giá, Tìm kiếm, Cài đặt, Thông báo | Mỗi màn có dữ liệu, đủ 4 trạng thái (đang tải / trống / lỗi / có dữ liệu); hồ sơ Cao Minh Trí có nhãn "CV bất thường" |
| V-MB-7 | `tran.ha` | Buổi PV đã xong của Lê Thị Ngọc Trâm | Như B-10 (tiêu đề không phải "Xác nhận phỏng vấn") |
| V-MB-8 | `nguyen.long` | Cả 4 tab; Kết quả, Yêu cầu, Đánh giá | Chỉ dữ liệu phòng Backend; buổi của Hồ Thị Bích Ngọc có nút xác nhận |
| V-MB-9 | `tran.ha` | Tìm kiếm: gõ "nguyen", "kiem thu" | Có kết quả (tìm không dấu) |

**Kết quả phần A phải nộp:** bảng một dòng mỗi mã (A1–A5, 52 dòng) trong `docs/KET_QUA_HOAN_THIEN.md` mục 6, thay cho danh sách
"Chưa kiểm"; lỗi tìm được đã sửa (ghi file) hoặc thành việc B-17 trở đi.

---

## 8. Phần C — mục 5 của đề bài: giao diện "bớt giống AI làm"

Nguyên tắc: **giữ bố cục và thứ tự khối của `docs/UI`**; chỉ đổi câu chữ, bớt trang trí, thống nhất kiểu. Mỗi thay đổi so với
`docs/UI` ghi một dòng vào `docs/KET_QUA_HOAN_THIEN.md` mục 4 (màn — đổi gì — lý do). Chụp trước–sau ít nhất 6 màn (lưu ở
`tmp/ui-truoc-sau/`, không commit ảnh).

| Mã | Việc | Cách làm | Kết quả phải đạt |
|---|---|---|---|
| C-1 | Câu chữ web | `grep -rn "subtitle=\|InlineNotice\|message\.\(success\|error\|warning\)\|placeholder=" frontend/src --include=*.tsx`; đọc từng chỗ | Không phụ đề lặp ý tiêu đề (vd. "Nhật ký hệ thống / Thao tác quan trọng trong toàn doanh nghiệp" → bỏ phụ đề hoặc thay bằng số liệu "253 thao tác"). Mỗi dòng mô tả tối đa một dấu "·", không dùng "—" để nối hai ý. Thông báo thành công ≤ 8 từ, nói đúng việc vừa xong ("Đã gửi thư mời"). Câu dẫn trong ô trống / thông báo chỉ một câu. Bảng trước–sau ≥ 30 chỗ trong báo cáo |
| C-2 | Câu chữ mobile | Toàn bộ `mobile/src/lib/strings.ts` | Tiêu chí như C-1; chỉ sửa trong `strings.ts` |
| C-3 | Bớt ô biểu tượng trang trí | Tìm icon trong ô vuông bo góc: `grep -rn "IconTile\|width: 28, height: 28\|width: 32, height: 32" frontend/src --include=*.tsx`; các chỗ chính: `MyWorkPage.tsx` (việc cần làm), `UserDetailPage.tsx` (việc đang phụ trách), `CandidateOffersPage.tsx`, tiêu đề hộp thoại có icon | Chỉ giữ icon khi nó phân biệt loại (mỗi loại một màu). Bỏ ở: tiêu đề hộp thoại, thẻ chỉ có một loại, dòng đếm số liệu |
| C-4 | Bớt thẻ lồng thẻ | Tìm `Panel` chứa `Panel` hoặc khối nền `COLORS.fill` bên trong thẻ trắng ở: hồ sơ ứng viên, chi tiết yêu cầu, chi tiết thư mời, thông tin doanh nghiệp (khối xem trước màu giữ nguyên) | Tối đa hai lớp nền (nền trang xám → thẻ trắng). Khối con dùng đường kẻ mảnh `COLORS.border` |
| C-5 | KPI chỉ ở nơi cần | `/dashboard`, `/results` giữ. Mobile "Việc của tôi" của chuyên viên (3 ô số) — `mobile/src/features/staff/screens/` màn trang chủ | Bỏ ô luôn bằng 0 hoặc trùng với danh sách bên dưới; nếu bỏ cả 3 thì ghi lý do vào báo cáo |
| C-6 | Thống nhất trạng thái, chip, nút | `grep -rn "<Tag " frontend/src --include=*.tsx` | Mọi trạng thái qua `StatusTag`/`StageTag`. Mỗi màn chỉ một nút đặc màu thương hiệu cho hành động chính; hành động không hoàn tác màu đỏ |
| C-7 | Gradient | `grep -rn "linear-gradient" frontend/src mobile/src` | Chỉ còn: nền phần đầu trang tuyển dụng, màn đăng nhập, thẻ thư mời, dải màu AI. Không gradient ở nút / thẻ thường |
| C-8 | Lạm dụng "·" và "—" trong dữ liệu sinh sẵn | `scripts/demo-data/jobs.py`, `people.py` và câu nhật ký phía backend (`grep -rn '" — "\|" · "' */src/main/java`) | Câu nhật ký gọn, ví dụ "Đặt lịch phỏng vấn: Hồ Thị Bích Ngọc, 14:00 21/11/2026" |
| C-9 | Chuông có quá nhiều thông báo chưa đọc sau khi tạo dữ liệu (đang 33) | `scripts/demo-data/seed.py` hàm `fixups()`: đánh dấu đã đọc mọi thông báo cũ hơn 3 ngày (đang là 10) | Sau E-3, chuông `tran.ha` ≤ 9 |

**Kết quả phần C phải nộp:** commit `style(web): …`, `style(mobile): …`; bảng "đổi gì so với docs/UI" trong báo cáo;
`tsc`, `typecheck`, `lint` sạch.

---

## 9. Phần D — kiểm giao diện, luồng GHI dữ liệu

Các việc này đổi dữ liệu demo. Làm đúng thứ tự (việc sau dùng kết quả việc trước). Sau mỗi thao tác ghi, kiểm thêm: thông báo
thành công ngắn và đúng; chuông người liên quan tăng; tab Hoạt động / khối Lịch sử / Nhật ký có dòng mới đúng tên hành động.

### D1. Ứng viên mới, từ đầu đến cuối (web)

| Mã | Việc | Phải thấy |
|---|---|---|
| W-1 | Chưa đăng nhập: `/register`, email `uv.kiemthu@example.com`, KHÔNG tick đồng ý | Lỗi tiếng Việt, không tạo tài khoản |
| W-2 | Tick đồng ý, đăng ký | Trả về < 2 giây (email gửi nền), sang màn nhập mã |
| W-3 | Nhập mã sai | "Mã xác minh không đúng hoặc đã hết hạn" |
| W-4 | Kích hoạt bằng tay: `docker exec ats-postgres psql -U ats_user -d ats_auth -c "update app_user set status='ACTIVE', email_verified=true where email='uv.kiemthu@example.com'"`; đăng nhập sai mật khẩu, rồi đúng | Sai → "Email hoặc mật khẩu không chính xác" (không hiện hộp "phiên hết hạn"); đúng → `/my-home` |
| W-5 | `/my-profile`: điền hồ sơ, tải ảnh PNG; thử `.svg` và file `.txt` đổi đuôi `.png` | PNG nhận; SVG và file giả bị từ chối bằng câu tiếng Việt |
| W-6 | Tải CV: tạo bằng `ai-service/.venv/Scripts/python.exe scripts/demo-data/cv_pdf.py` (ra `tmp/cv/*.pdf`), dùng `tmp/cv/nguyen.khanh.pdf`; thử file `.txt` đổi đuôi `.pdf` | PDF thật nhận; file giả bị từ chối |
| W-7 | Ứng tuyển tin 1: không tick đồng ý → tick → gửi | Chặn khi chưa tick; xong tới màn "Ứng tuyển thành công" |
| W-8 | Ứng tuyển lại tin 1 | Bị chặn, nêu lý do |
| W-9 | `tran.ha` mở tin 1 | ≤ 90 giây thẻ mới có điểm AI. Nếu "Chấm lỗi" (Gemini 503): bấm "Chấm lại" một lần, tab Network chỉ có **1** request `rescore` |
| W-10 | Ứng viên mới đổi mật khẩu ở cài đặt (sai mật khẩu cũ, rồi đúng); đăng xuất; đăng nhập bằng mật khẩu mới | Sai → "Mật khẩu hiện tại không đúng"; đúng → bị đăng xuất các phiên khác, đăng nhập lại được |
| W-11 | Ứng viên mới rút đơn ở `/my-applications` | "Đã rút đơn"; phía `tran.ha` đơn ở tab "Đã rút đơn"; nộp lại bị chặn kèm lý do |
| W-12 | Ứng viên mới: Hồ sơ → Dữ liệu & quyền riêng tư → xoá dữ liệu (tick xác nhận) | Bị đăng xuất; đăng nhập lại không được; phía `tran.ha` tên thành "Ứng viên đã xoá dữ liệu", không mở được CV; `docker exec ats-postgres psql -U ats_user -d ats_ai -tAc "select count(*) from cv_extractions"` giảm 1 |
| W-12b | Quên mật khẩu với `tran.huy@example.com` | Trả ngay câu "Nếu email tồn tại…", không lỗi |

### D2. Chuyên viên tuyển dụng và trưởng bộ phận (web)

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| W-13 | `nguyen.long` | *Việc của tôi* → "Xem và xác nhận" buổi của Hồ Thị Bích Ngọc → Xác nhận | Mở thẳng `/interviews/17`; sau khi xác nhận: "Chờ ứng viên xác nhận"; `ho.ngoc` thấy buổi ở `/my-interviews` |
| W-14 | `ho.ngoc` | Đồng ý lịch | Phía chuyên viên: "Ứng viên đã xác nhận" |
| W-15 | `huynh.hao` | Xin dời buổi 16, nhập lý do | Phía `pham.anh`: băng lý do + nút "Đặt lịch mới" |
| W-16 | `pham.anh` | Từ buổi 16 bấm "Đặt lịch mới", chọn giờ khác, trực tiếp | Form điền sẵn; địa điểm mặc định là văn phòng của tin (TP. HCM); buổi cũ đóng, buổi mới "Chờ xác nhận" |
| W-17 | `tran.ha` | `/interviews/15` → Đồng ý đề xuất của Đặng Quốc Bảo | Giờ đổi sang giờ đề xuất; chờ ứng viên |
| W-18 | `tran.ha` | Buổi 12: "Thêm người phỏng vấn" (thêm chính mình) → "Đổi giờ" → "Huỷ" | Mỗi thao tác thành công; Nhật ký (Quản trị) có 3 dòng tương ứng |
| W-19 | `tran.ha` | Buổi 10 (Nguyễn Trọng Nghĩa, `pham.anh` phụ trách — dùng `pham.anh`) sau giờ hẹn: "Ghi nhận vắng mặt". Nếu giờ hẹn còn ở tương lai, kiểm nút bị khoá / báo "Chưa tới giờ phỏng vấn…" | Đúng một trong hai, tuỳ thời điểm kiểm |
| W-20 | `tran.ha` | *Việc của tôi* → "Viết đánh giá · Lê Thị Ngọc Trâm" | Mở đúng phiếu buổi 8; lưu nháp → tải lại còn nguyên → nộp → buổi 8 "Đã xong" |
| W-21 | `tran.ha` và `nguyen.long` | Ba lối khác vào phiếu đánh giá: từ `/interviews/<id>`, từ tab Đánh giá của hồ sơ, từ `/evaluations` (trưởng bộ phận: từ *Việc của tôi*, chi tiết buổi, lịch) | Cả ba lối đều mở đúng nơi, không trang trống (lỗi 1.1) |
| W-22 | `tran.ha` | Hồ sơ Lê Thị Ngọc Trâm → "Chuyển sang Thư mời" → soạn thư: hạn phản hồi SAU ngày bắt đầu | "Hạn phản hồi phải trước ngày bắt đầu làm việc" (không phải "Đã có lỗi xảy ra") |
| W-23 | `tran.ha` | Sửa cho hợp lệ (giờ mặc định 17:00), lưu nháp, mở lại sửa lương, "Kiểm tra trước khi gửi", gửi | `le.tram` thấy thư ở `/my-offers` |
| W-24 | `tran.ha` | Hồ sơ Hồ Thị Bích Ngọc (chưa có đánh giá): nút "Chuyển sang Thư mời" | Khoá kèm lý do (3.1) |
| W-25 | `le.tram` | Xem thư, tải PDF, Từ chối có lý do | "Đã từ chối"; chuyên viên có thông báo ghi tên vị trí |
| W-26 | `tran.huy` | Nhận thư 4 | Trang chào mừng; đơn 17 "Đã tuyển"; tin 1 đủ 2/2; `tran.ha` thử soạn thư cho hồ sơ khác ở tin 1 → bị chặn vì hết suất, câu tiếng Việt |
| W-27 | `tran.ha` | `/offers/3` (nháp): Xoá | Xoá được, danh sách cập nhật |
| W-28 | `pham.anh` | Kanban tin 2: chọn 2 thẻ cột Ứng tuyển → giao phụ trách; chọn 1 thẻ → từ chối hàng loạt; kéo 1 thẻ sang cột kế; kéo 1 thẻ nhảy 2 cột; kéo 1 thẻ vào dải từ chối → Huỷ | Ba thao tác đầu chạy; nhảy 2 cột báo câu hướng dẫn; dải từ chối mở hộp thoại lý do (nút đỏ sau B-11), Huỷ không đổi gì |
| W-29 | `tran.ha` | "Thêm ứng viên" ở tin 1: bỏ trống CV, bấm lưu | Màn cuộn tới lỗi "Vui lòng tải lên CV"; điền đủ → "Đã thêm ứng viên vào tin" (không phải "Ứng tuyển thành công") |
| W-30 | `tran.ha` | "AI đọc CV" với `tmp/cv/le.tram.pdf` | Điền sẵn họ tên, kỹ năng, kinh nghiệm |
| W-31 | `tran.ha` | Sửa tin 1 đang tuyển: đổi một dòng mô tả, tắt "Tuyển gấp", lưu; thử lương vượt khung; bật lại "Tuyển gấp" | Lưu được; `/careers` đổi ngay; tab Hoạt động của tin: "Sửa nội dung tin — mô tả, nhãn tuyển gấp"; vượt khung bị chặn |
| W-32 | `pham.anh` | Tin 5: mở lại → tạm dừng lại; KHÔNG đóng tin nào | Trạng thái đổi; nhật ký "Đổi trạng thái tin: Tạm dừng → Đang tuyển" |
| W-33 | `tran.ha` | Yêu cầu 7: "Yêu cầu sửa" kèm ghi chú | "Cần sửa"; `do.vy` có thông báo |
| W-34 | `do.vy` | Sửa yêu cầu 7, gửi lại | "Chờ duyệt"; Lịch sử: tạo → gửi duyệt → yêu cầu sửa → sửa → gửi duyệt |
| W-35 | `pham.anh` | Duyệt yêu cầu 7: thử lương duyệt min > max, rồi hợp lệ | min > max bị chặn; duyệt xong "Người duyệt: Phạm Ngọc Ánh" |
| W-36 | `nguyen.long` | Tạo yêu cầu mới: lương min > max; chọn kỹ năng; tìm nút "thêm nhanh" kỹ năng | Lương sai bị chặn; không có thêm nhanh (2.3); lưu nháp được |
| W-37 | `tran.ha` | `/masterdata` → Kỹ năng: thêm "Rust", sửa thành "Rust (cơ bản)", ẩn | Chạy; Nhật ký có 3 dòng "Thêm / Sửa danh mục · Kỹ năng" |

### D3. Quản trị (web)

| Mã | Việc | Phải thấy |
|---|---|---|
| W-38 | `/admin/users/invite`: mời `nv.moi@example.com` làm Trưởng bộ phận Phòng Nhân sự; "Gửi lại lời mời" | Trả về nhanh; ở tab "Chờ kích hoạt"; kích hoạt bằng SQL như W-4 → cảnh báo "Phòng Nhân sự chưa có đại diện" ở `/dashboard` biến mất |
| W-39 | `/admin/users/3` (Phạm Ngọc Ánh): "Đổi vai trò / phòng ban" → Trưởng bộ phận, Phòng Kiểm thử | Hộp thoại nhắc số việc đang phụ trách; lưu xong vai trò đổi; `pham.anh` đăng nhập lại thấy menu trưởng bộ phận; Nhật ký "Đổi vai trò / phòng ban". **Đổi lại như cũ ngay sau đó** |
| W-40 | `/admin/users/1` (chính mình) | Không có nút đổi vai trò, không khoá được chính mình |
| W-41 | `/admin/users/8` (`hoang.thinh`): "Gửi email đặt lại mật khẩu"; Khoá; đăng nhập bằng tài khoản đó; `tran.ha` lên lịch và tìm `hoang.thinh` trong danh sách người phỏng vấn; Mở khoá | Đặt lại mật khẩu báo thành công (không gửi thật vì example.com); khoá → "Tài khoản đã bị khoá…"; không có trong danh sách người phỏng vấn (2.5); mở khoá đăng nhập lại được |
| W-42 | Thông tin doanh nghiệp: chọn màu `#F5D76E` | Xem trước dùng bản đậm hơn, dòng cảnh báo tương phản; Lưu → giá trị lưu là bản đã làm đậm (đọc lại ô màu). **Đổi lại `#0F6E66` và Lưu** |
| W-43 | Ngay sau khi lưu màu ở W-42 (trước khi đổi lại): mở `/careers/home` ở tab ẩn danh; Expo web tải lại 2 lần | Web công khai đổi màu; mobile đổi sau lần tải lại |
| W-44 | Trang tuyển dụng: nền "Chuyển màu" 2 màu, tắt khối Đời sống, Xuất bản → kiểm `/careers/home` → trả về "Màu thương hiệu", bật Đời sống, Xuất bản | Trang công khai đổi đúng theo từng lần xuất bản; Nhật ký "Xuất bản trang tuyển dụng" ×2 |
| W-45 | Sửa tên hiển thị công ty rồi sửa lại | Nhật ký "Sửa thông tin doanh nghiệp — Đổi: tên" ×2; tiêu đề tab (B-15) đổi theo |

### D4. Phân quyền qua API

Gọi bằng `fetch` trong console với token của vai trò tương ứng (mục 2).

| Mã | Gọi | Phải trả |
|---|---|---|
| W-46 | Ứng viên: `GET /api/application/applications` | 403, thân `{"message":"Bạn không có quyền thực hiện thao tác này", …}` |
| W-47 | `tran.huy`: `GET /api/offer/offers/my/5` (thư của người khác) | 403 hoặc 404, không lộ dữ liệu |
| W-48 | `nguyen.long`: `GET /api/application/applications/20` (phòng Frontend) | 403 / 404 |
| W-49 | `tran.ha`: `PATCH /api/auth/users/3/role` body `{"role":"RECRUITER","departmentId":7}` | 403 |
| W-50 | Không token: `GET /api/notification/audit-logs` | 401 |
| W-51 | `nguyen.long`: `POST /api/masterdata/skills` body `{"name":"Thử","category":"Chuyên môn"}` | 403 |
| W-52 | `nguyen.long`: `GET /api/notification/audit-logs/resource?resourceType=APPLICATION&resourceIds=20` | Hiện tại trả 200 cho mọi nhân viên nội bộ. **Đánh giá:** nếu lộ chi tiết của phòng khác thì thêm kiểm tra quyền ở `AuditLogController.forResource` (chỉ HR/Quản trị, hoặc trưởng bộ phận khi đối tượng thuộc phòng mình) và ghi thành B-xx |
| W-53 | Ứng viên: `GET /api/candidate/candidates/1` | 403 |

### D5. Mobile (Expo web) — luồng ghi

| Mã | Tài khoản | Việc | Phải thấy |
|---|---|---|---|
| W-54 | (mới) `uv.mobile@example.com` | Đăng ký: không tick đồng ý → tick | Chặn rồi cho qua; sang màn OTP |
| W-55 | `do.tuan` | Lịch → buổi 14 → Xin dời có lý do | Trạng thái đổi; web chuyên viên thấy |
| W-56 | `ngo.bao` | Việc làm → tin 2 → Ứng tuyển (chọn nguồn, tick đồng ý) | Nộp được; tab Hồ sơ có đơn mới |
| W-57 | `nguyen.long` | Xác nhận / đề xuất giờ khác cho một buổi còn chờ | Snackbar báo thành công |
| W-58 | `tran.ha` | Hồ sơ ở cột Ứng tuyển → chuyển Sàng lọc; từ chối một hồ sơ khác | Chạy; lý do chọn từ danh sách tiếng Việt |
| W-59 | `tran.ha` | Thư mời nháp (tạo ở web nếu đã xoá ở W-27) → Gửi | Trước khi gửi có câu nói rõ "gửi cho ứng viên ngay" |

**Kết quả phần D phải nộp:** bảng một dòng mỗi mã (≈ 60 dòng) trong báo cáo; lỗi mới + commit sửa; lỗi không sửa được ghi lý do
và bước tái hiện.

---

## 10. Phần E — chốt

| Mã | Việc | Kết quả phải đạt |
|---|---|---|
| E-1 | Test toàn bộ (chạy nền): `for s in auth masterdata recruitment candidate application interview offer notification dashboard; do (cd $s-service && ./mvnw.cmd -q test > ../tmp/test-$s.log 2>&1; echo "$s $?"); done`; `cd frontend && npx tsc -b --noEmit`; `cd mobile && npm run typecheck && npm run lint`; `cd ai-service && .venv/Scripts/python.exe -m pytest tests/test_scoring_aggregate.py -q` | 9 dòng `<tên> 0`; tsc không in gì; lint 0 lỗi (cảnh báo axios có sẵn được phép); pytest pass |
| E-2 | Sinh lại kiểu cho mobile: `cd mobile && npm run gen:types -- -Base http://localhost:8080` rồi `npm run typecheck` | Không lỗi; `git diff mobile/src/types/generated` chỉ có thay đổi hợp lý (ví dụ `PublicThemeResponse`, `UpdateUserRoleRequest`) |
| E-3 | `bash scripts/dev/svc.sh status` → 11 UP; RAM trống ≥ 4 GB (đóng Expo web); chạy lại dữ liệu (nền, 35–45 phút): `PYTHONIOENCODING=utf-8 ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py > tmp/seed.log 2>&1` | Dòng cuối log bắt đầu "Xong."; không có dòng `!!` hay `Traceback`; dòng tổng kết: **41 đơn** = APPLIED 7, CV_SCREENING 7, TECHNICAL_INTERVIEW 9, OFFER 3, HIRED 3, REJECTED 9, REJECTED/HIRED_ELSEWHERE 1, WITHDRAWN 2; **20 buổi**: COMPLETED 10, SCHEDULED 2, CANDIDATE_CONFIRMED 2, HM_CONFIRMED 1, HM_RESCHEDULE_PROPOSED 1, CANDIDATE_DECLINED 1, CANCELLED 1, EVALUATION_PENDING 1, NO_SHOW 1; **7 thư mời**: DRAFT 1, APPROVED 1, EXPIRED 1, DECLINED 1, ACCEPTED 3 |
| E-4 | Nếu còn đơn AI lỗi (Gemini 503): `… seed.py --rescore-failed` | `docker exec ats-postgres psql -U ats_user -d ats_application -tAc "select count(*) from application where ai_status<>'COMPLETED'"` = 0 |
| E-5 | Kiểm nhanh sau seed: `/dashboard` (Quản trị), `/my-work` (`tran.ha`), `/careers/home` (ẩn danh), `/audit-logs` | Khớp `frontend/docs/TEST_ACCOUNTS.md`; "Đăng nhập gần nhất" của nhân viên trong 2 ngày qua; nhật ký "Lên lịch phỏng vấn" của buổi tháng 9–10 ghi đúng giờ quá khứ; chuông `tran.ha` ≤ 9 (sau C-9) |
| E-6 | (Tuỳ chọn, phải hỏi người dùng trước) thử `docker/postgres-init/init-databases.sql` trên container Postgres tạm cổng 55432: `docker run --rm -d --name ats-pg-thu -e POSTGRES_USER=ats_user -e POSTGRES_PASSWORD=thu -p 55432:5432 -v "%CD%/docker/postgres-init:/docker-entrypoint-initdb.d" pgvector/pgvector:pg16` | Log container không có lỗi; `psql -p 55432 … -d ats_auth -c "select email from app_user"` ra `le.quan@example.com`. Xoá container sau khi kiểm. **Không đụng `ats-postgres`** |
| E-7 | Cập nhật `docs/KET_QUA_HOAN_THIEN.md`: mục 2 (bảng nhóm A–D: cột "Đã kiểm" thêm UI cho việc đã kiểm; sửa 1.7 theo B-16), mục 3 (mục 4 đề bài: thêm F-1…F-7), mục 4 (bảng thay đổi so với `docs/UI` từ phần C), mục 6 (bảng A + D thay cho "Chưa kiểm"), mục 7 "Còn lại" chỉ còn việc thật sự chưa làm, mục 8 thêm quyết định B-3, B-9 | Không câu nào mâu thuẫn trạng thái thật; mỗi dòng có cách đã kiểm |
| E-8 | Cập nhật `frontend/docs/TEST_ACCOUNTS.md` nếu kịch bản đổi (ví dụ chuông, tài khoản mời thêm) | Khớp dữ liệu sau E-3 |
| E-9 | Cập nhật `docs/TIEN_DO_HOAN_THIEN.md` tới việc cuối; xoá mục "Việc dở dang" nếu hết việc | — |
| E-10 | Commit + push `origin/dev`; `git status` sạch (trừ `tmp/`, `logs/`) | `git log origin/dev -1` là commit cuối; dán vào báo cáo cuối cùng cho người dùng: danh sách commit, số việc đạt / lỗi / chưa làm theo từng phần |

---

## 11. Bẫy đã gặp (đọc để khỏi mất thời gian lần nữa)

- **Service "DOWN" mà khởi động lại không lên:** còn tiến trình cũ treo giữ file log. `svc.sh` đã tự tìm và tắt; nếu vẫn kẹt:
  PowerShell `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*<tên-service>*' }` rồi `taskkill /F /T /PID <id>`.
- **Máy khởi động lại / Docker tắt:** mở Docker Desktop (`Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`),
  chờ `docker info` chạy được, rồi khởi động lại cả 11 service theo đợt.
- **Thêm migration Flyway:** liệt kê `ls <service>/src/main/resources/db/migration | sort -V` trước khi đặt số (đã từng trùng
  số 10). Đổi tên file thì xoá bản cũ trong `target/classes/db/migration`. Test không chạy Flyway nên lỗi chỉ lộ khi khởi động.
- **API công khai mới** phải thêm vào `api-gateway/src/main/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilter.java`, nếu không gateway trả 401.
- **offer-service** có trigger khoá sửa thư đã gửi và ràng buộc "hạn phản hồi < ngày đi làm". Sửa bằng SQL phải
  `set session_replication_role = replica;` trong cùng câu lệnh `psql`.
- **ai-service ghi giờ UTC**, các service Java ghi giờ Việt Nam.
- **Gemini hay trả 503** vào giờ cao điểm — chấm lại là được, không phải lỗi hệ thống.
- **ai-service mất consumer RabbitMQ:** đã có canh gác 30 giây. Nếu đơn mới không có điểm sau 2 phút:
  `docker exec ats-rabbitmq rabbitmqctl list_queues name messages consumers | grep '^ai\.'` — `consumers` phải là 1; nếu 0 thì
  `bash scripts/dev/svc.sh restart ai-service`.
- **Web: `COLORS.primary` là `var(--ats-brand)`** — không nối đuôi alpha (`${COLORS.primary}1A` hỏng); dùng `brandAlpha(%)` hoặc
  `COLORS.primarySoft` / `primaryFaint`.
- **Mobile: màu thương hiệu và tên công ty đọc lúc khởi động** (`mobile/src/theme/brand.ts`); đổi trên web thì mobile cần tải lại.
- **Python trên Windows gọi `bash` ra WSL** — trong script dùng `reset_db.git_bash()`.
- **Script Python có chuỗi tiếng Việt / dấu nháy:** viết file bằng công cụ ghi file rồi chạy, đừng nhúng heredoc phức tạp vào bash.
- **Claude Code tự dừng job nền khi máy thiếu RAM** lúc phiên đang rảnh. Trước `seed.py`: đóng Expo web, kiểm RAM trống ≥ 4 GB.
  Nếu job bị dừng, báo người dùng và chỉ chạy lại khi được bảo.
- **Access token sống ngắn:** script dài phải đăng nhập lại khi gặp 401 (`lib.Api.call` đã làm).

---

## 12. Mẫu báo cáo khi xong mỗi phần

```
Phần <A|B|C|D|E|F> — <ngày giờ>
Đã làm: <n>/<tổng> việc. Đạt: <n>. Lỗi đã sửa: <n> (mã việc → file). Lỗi chưa sửa: <n> (mã việc → lý do).
Test: <service đã chạy, kết quả>. tsc / typecheck / lint: <kết quả>.
Commit: <hash> <thông điệp>.
Việc tiếp theo: <mã việc>.
```

## 13. Định nghĩa hoàn thành toàn bộ

Đề bài coi là xong khi đủ cả:

1. Mọi việc B, F đạt hoặc có lý do ghi trong báo cáo vì sao không làm.
2. Mọi việc A, D có kết quả (đạt / lỗi đã sửa / lỗi còn lại kèm lý do); không còn lỗi chặn luồng chính (nộp đơn → phỏng vấn →
   đánh giá → thư mời → nhận việc) trên web và mobile.
3. Phần C có bảng thay đổi so với `docs/UI`.
4. E-1 sạch; E-3 chạy trọn; `docs/KET_QUA_HOAN_THIEN.md` khớp trạng thái thật; mọi thứ đã push `origin/dev`.
