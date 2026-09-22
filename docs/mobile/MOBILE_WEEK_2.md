# Tuần 2 — Candidate hoàn chỉnh + Push notification (Ngày 8–14)

> **Tài liệu gốc:** [`MOBILE_V1_PLAN.md`](./MOBILE_V1_PLAN.md) · **Tuần trước:** [`MOBILE_WEEK_1.md`](./MOBILE_WEEK_1.md)
> **Phạm vi:** B5 · B6 · B7 · B8 · 4 thay đổi backend · A4 · deep link
> **🎯 MỐC AN TOÀN:** cuối tuần này phải demo được **trọn một vòng Candidate kèm push thật**. Nếu hai tuần sau có đổ vỡ gì thì vẫn còn bài để nộp.

---

## 0. Bản đồ tuần và hai cảnh báo

### 0.1. Thứ tự và lý do

| Ngày | Việc | Vì sao đặt ở đây |
|---|---|---|
| 8 | B5 phần 1 — danh sách lịch phỏng vấn | Nhẹ, khởi động tuần |
| 9 | B5 phần 2 — xác nhận + chọn slot | Hành động một chạm đầu tiên của app |
| 10 | **`download.ts` + B6** | Tải file kèm header là chỗ kỹ thuật dễ vướng nhất — làm sớm |
| 11 | B7 — offer + PDF + đồng ý/từ chối | Dùng lại `download.ts` của hôm qua |
| 12 | B8 — hồ sơ + upload CV | Khép lại phụ thuộc B2→B8 |
| 13 | **Backend push** — 4 việc ở mục 8 | Code Java, tách hẳn khỏi RN |
| 14 | Client push + A4 + deep link + **demo mốc an toàn** | Khớp hai đầu lại |

### 0.2. Cảnh báo 1 — PDF và CV **không** mở bằng `Linking.openURL`

`GET /api/offer/offers/{id}/pdf` trả `byte[]` và **yêu cầu header `Authorization`**.
`Linking.openURL` giao URL cho trình duyệt hệ thống, và **trình duyệt không có token** → luôn nhận
401, hiện một trang trắng hoặc trang lỗi. Đây là lỗi mất cả buổi để hiểu nếu không biết trước.

**Đường đúng:** `expo-file-system` tải file kèm header → lưu vào thư mục của app →
`expo-sharing` mở bằng ứng dụng đọc PDF của hệ thống. Bước 10.1 viết sẵn hàm dùng chung.

### 0.3. Cảnh báo 2 — phần Java của ngày 13 là chỗ AI dễ làm sai nhất

Mục 8 của kế hoạch đã nói thẳng. Cách làm an toàn:

1. **Mở `RealtimePushService.java` đọc trước.** Nó là bản mẫu: `@Service`,
   `@RequiredArgsConstructor`, inject qua constructor, một method công khai.
2. **Bắt chước đúng cấu trúc đó**, đừng tả một câu rồi để AI tự bịa ra `@Autowired`, `RestTemplate`
   cấu hình riêng, hay một `@Configuration` mới không cần thiết.
3. **Push phải bọc try/catch.** Lỗi push không bao giờ được làm hỏng luồng notification cũ của web.
   `createAndPush()` hiện đã bọc `realtimePushService` trong try/catch — làm đúng như vậy.

---

## NGÀY 8 — B5 phần 1: danh sách lịch phỏng vấn của ứng viên

> **Mục tiêu:** ứng viên xem được lịch phỏng vấn thật, phân biệt rõ buổi sắp tới và buổi đã qua.

### Bước 8.1 — Hiểu mô hình trạng thái trước khi viết code (20 phút)

Mở `interview-service/src/main/java/iuh/fit/se/interview/interview/InterviewStatus.java` và đọc
sơ đồ vòng đời ở đầu file. Ba điều quyết định màn B5:

```java
public boolean visibleToCandidate() {
    return this != SCHEDULED && this != HM_RESCHEDULE_PROPOSED;
}
```

1. **Ứng viên chỉ thấy buổi từ `HM_CONFIRMED` trở đi.** Backend đã lọc sẵn — app **không** cần
   lọc lại. Nếu bạn tự lọc thêm ở client là làm thừa và dễ sai.
2. **`EVALUATION_PENDING` vẫn hiện với ứng viên**, nhưng phải dịch thành **"Đã diễn ra"**. Dịch
   đúng nghĩa đen ("Chờ đánh giá") là lộ chuyện nội bộ đang chờ ai chấm điểm. Tuần 1 đã chuẩn bị
   sẵn `INTERVIEW_STATUS_LABEL_CANDIDATE` cho việc này.
3. **Ứng viên chỉ xác nhận được khi trạng thái là `HM_CONFIRMED`.** Ở `CANDIDATE_CONFIRMED` thì
   nút phải biến mất, không phải chỉ mờ đi.

### Bước 8.2 — API và hook (30 phút)

`src/features/interviews/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { InterviewResponse } from "@/types/api";

export const interviewsApi = {
  /** CHỈ dành cho CANDIDATE (requireCandidate ở backend). HM phải dùng listForInterviewer. */
  myList: () =>
    apiClient.get<InterviewResponse[]>("/interview/interviews/my").then((r) => r.data),

  myDetail: (id: number | string) =>
    apiClient.get<InterviewResponse>(`/interview/interviews/my/${id}`).then((r) => r.data),

  /** Ứng viên xác nhận sẽ tham dự. */
  confirm: (id: number | string) =>
    apiClient.patch(`/interview/interviews/${id}/confirm`).then((r) => r.data),

  /** Các slot đang chờ ứng viên chọn giờ. */
  myPendingSlots: () =>
    apiClient.get("/interview/slots/my-pending").then((r) => r.data),

  selectSlot: (slotId: number | string) =>
    apiClient.post(`/interview/slots/${slotId}/select`).then((r) => r.data),
};
```

> **Đối chiếu `src/types/generated/interview.ts`** để lấy đúng kiểu trả về của `/slots/my-pending`
> và `/slots/{id}/select`, đừng để `any`. Nếu springdoc không mô tả rõ, khai báo kiểu tối thiểu ở
> `src/types/api.ts` kèm comment giải thích — nhưng phải cố dùng type sinh ra trước đã.

`src/features/interviews/hooks.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interviewsApi } from "./api";
import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { apiErrorMessage } from "@/api/client";

export const interviewKeys = {
  all: ["interviews"] as const,
  my: () => [...interviewKeys.all, "my"] as const,
  pendingSlots: () => [...interviewKeys.all, "pending-slots"] as const,
};

export const useMyInterviews = () =>
  useQuery({ queryKey: interviewKeys.my(), queryFn: interviewsApi.myList });

export const useMyPendingSlots = () =>
  useQuery({ queryKey: interviewKeys.pendingSlots(), queryFn: interviewsApi.myPendingSlots });

export const useConfirmInterview = () => {
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: (id: number | string) => interviewsApi.confirm(id),
    onSuccess: () => {
      notify("Đã xác nhận tham dự", "success");
      void qc.invalidateQueries({ queryKey: interviewKeys.all });
    },
    onError: (e) => notify(apiErrorMessage(e), "error"),
  });
};

export const useSelectSlot = () => {
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  return useMutation({
    mutationFn: (slotId: number | string) => interviewsApi.selectSlot(slotId),
    onSuccess: () => {
      notify("Đã chọn khung giờ. Chờ xác nhận từ nhà tuyển dụng.", "success");
      void qc.invalidateQueries({ queryKey: interviewKeys.all });
    },
    onError: (e) => notify(apiErrorMessage(e), "error"),
  });
};
```

### Bước 8.3 — Màn danh sách, chia hai nhóm (60 phút)

`app/(candidate)/interviews/index.tsx`:

```tsx
import { useMemo } from "react";
import { SectionList, RefreshControl, View, StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";
import { useMyInterviews, useMyPendingSlots } from "@/features/interviews/hooks";
import { QueryScreen } from "@/components/ui/QueryScreen";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateTime } from "@/lib/format";
import { PendingSlotCard } from "@/features/interviews/PendingSlotCard";   // làm ở ngày 9
import { InterviewCard } from "@/features/interviews/InterviewCard";

export default function MyInterviewsScreen() {
  const query = useMyInterviews();
  const slots = useMyPendingSlots();

  const sections = useMemo(() => {
    const items = query.data ?? [];
    const now = Date.now();
    // "Sắp tới" = chưa tới giờ bắt đầu VÀ chưa ở trạng thái kết thúc.
    const closed = new Set(["COMPLETED", "NO_SHOW", "CANCELLED", "EVALUATION_PENDING"]);
    const upcoming = items.filter(
      (i) => !closed.has(String(i.status)) && new Date(i.scheduledAt).getTime() >= now
    );
    const past = items.filter((i) => !upcoming.includes(i));

    return [
      { title: "Sắp tới", data: upcoming },
      { title: "Đã qua", data: past },
    ].filter((s) => s.data.length > 0);
  }, [query.data]);

  return (
    <QueryScreen
      query={query}
      scrollable={false}
      isEmpty={(d) => d.length === 0 && (slots.data ?? []).length === 0}
      empty={{
        icon: "calendar-blank-outline",
        title: "Chưa có lịch phỏng vấn nào",
        description: "Khi nhà tuyển dụng sắp lịch, bạn sẽ nhận được thông báo.",
      }}
    >
      {() => (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => { void query.refetch(); void slots.refetch(); }}
            />
          }
          ListHeaderComponent={
            (slots.data ?? []).length > 0 ? (
              <View style={styles.slotBlock}>
                <Text variant="titleMedium" style={styles.slotTitle}>
                  Cần bạn chọn giờ
                </Text>
                {(slots.data ?? []).map((s: any) => (
                  <PendingSlotCard key={s.id} slot={s} />
                ))}
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <Text variant="titleSmall" style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => <InterviewCard interview={item} />}
        />
      )}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  sectionHeader: { marginTop: 16, marginBottom: 8, opacity: 0.6 },
  slotBlock: { marginBottom: 8 },
  slotTitle: { marginBottom: 8 },
});
```

`src/features/interviews/InterviewCard.tsx`:

```tsx
import { View, StyleSheet } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateTime } from "@/lib/format";
import { useConfirmInterview } from "./hooks";
import type { InterviewResponse } from "@/types/api";

export function InterviewCard({ interview }: { interview: InterviewResponse }) {
  const confirm = useConfirmInterview();
  // Chỉ HM_CONFIRMED mới là lúc ứng viên cần xác nhận.
  const needsConfirm = interview.status === "HM_CONFIRMED";

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.head}>
          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {interview.jobPostingTitle ?? "Buổi phỏng vấn"}
          </Text>
          {/* domain="interviewCandidate" → EVALUATION_PENDING hiện là "Đã diễn ra" */}
          <StatusChip status={interview.status} domain="interviewCandidate" />
        </View>

        <View style={styles.line}>
          <Icon source="clock-outline" size={16} />
          <Text variant="bodyMedium">{formatDateTime(interview.scheduledAt)}</Text>
        </View>

        {interview.location ? (
          <View style={styles.line}>
            <Icon source="map-marker-outline" size={16} />
            <Text variant="bodyMedium">{interview.location}</Text>
          </View>
        ) : null}

        {interview.meetingLink ? (
          <View style={styles.line}>
            <Icon source="video-outline" size={16} />
            <Text variant="bodyMedium" selectable numberOfLines={1}>
              {interview.meetingLink}
            </Text>
          </View>
        ) : null}
      </Card.Content>

      {needsConfirm ? (
        <Card.Actions>
          <Button
            mode="contained"
            loading={confirm.isPending}
            disabled={confirm.isPending}
            onPress={() => confirm.mutate(interview.id)}
          >
            Xác nhận tham dự
          </Button>
        </Card.Actions>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, borderRadius: 12 },
  head: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  title: { flex: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
});
```

> `meetingLink` để `selectable` cho phép người dùng nhấn giữ để copy — đây là việc thật sự xảy ra
> trong 30 giây trước giờ họp. Không cần nút "Mở link" phức tạp; `selectable` là giải pháp một
> thuộc tính.

### ✅ Định nghĩa "ngày 8 đã xong"

- [ ] Ứng viên thấy đúng các buổi từ `HM_CONFIRMED` trở đi
- [ ] Buổi ở `EVALUATION_PENDING` hiện chữ **"Đã diễn ra"**, không hiện "Chờ đánh giá"
- [ ] Chia đúng hai nhóm "Sắp tới" / "Đã qua"
- [ ] Nút "Xác nhận tham dự" chỉ xuất hiện ở buổi `HM_CONFIRMED`
- [ ] Chưa có lịch nào → EmptyState nói rõ "khi nhà tuyển dụng sắp lịch, bạn sẽ nhận thông báo"

---

## NGÀY 9 — B5 phần 2: xác nhận tham dự và chọn khung giờ

> **Đây là "ví dụ mẫu mực" mà mục 2 của kế hoạch nói tới:** nhận noti → mở app → bấm xác nhận →
> xong trong 30 giây. Làm cho nó thật gọn.

### Bước 9.1 — Thẻ chọn khung giờ (60 phút)

`src/features/interviews/PendingSlotCard.tsx`:

```tsx
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Card, Dialog, Portal, RadioButton, Text } from "react-native-paper";
import { formatDateTime } from "@/lib/format";
import { useSelectSlot } from "./hooks";

/** Kiểu tối thiểu — thay bằng type sinh ra từ OpenAPI khi đã xác nhận tên schema. */
interface SlotGroup {
  id: number;
  jobPostingTitle?: string | null;
  options: Array<{ id: number; startTime: string; endTime?: string | null }>;
}

export function PendingSlotCard({ slot }: { slot: SlotGroup }) {
  const select = useSelectSlot();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  const chosenOption = slot.options.find((o) => o.id === chosen);

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">{slot.jobPostingTitle ?? "Buổi phỏng vấn"}</Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Nhà tuyển dụng đề xuất {slot.options.length} khung giờ. Chọn giờ phù hợp với bạn.
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => setOpen(true)}>Chọn khung giờ</Button>
        </Card.Actions>
      </Card>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>Chọn khung giờ</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              value={String(chosen ?? "")}
              onValueChange={(v) => setChosen(Number(v))}
            >
              {slot.options.map((o) => (
                <RadioButton.Item
                  key={o.id}
                  value={String(o.id)}
                  label={formatDateTime(o.startTime)}
                />
              ))}
            </RadioButton.Group>

            {chosenOption ? (
              <Text variant="bodySmall" style={styles.warn}>
                Sau khi chọn, khung giờ này sẽ được gửi cho nhà tuyển dụng và bạn không tự đổi lại
                được.
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>Hủy</Button>
            <Button
              mode="contained"
              disabled={!chosen || select.isPending}
              loading={select.isPending}
              onPress={() => {
                if (!chosen) return;
                select.mutate(chosen, { onSuccess: () => setOpen(false) });
              }}
            >
              Xác nhận
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#FB8C00" },
  hint: { marginTop: 6, opacity: 0.75 },
  warn: { marginTop: 12, color: "#E65100" },
});
```

> Viền cam bên trái là cách rẻ nhất để nói "cái này cần bạn làm gì đó" mà không cần thêm icon hay
> badge. Câu cảnh báo chỉ hiện **sau khi** đã chọn — hiện trước thì nó chỉ là tiếng ồn.

### Bước 9.2 — Hộp thoại xác nhận trước hành động không lùi được (30 phút)

Quy ước 10 cấm `alert()`/`confirm()`. Dùng `Dialog` của Paper. Gói lại một lần để tuần 3 (duyệt
requisition, duyệt offer, chấm điểm) dùng lại:

`src/components/ui/ConfirmDialog.tsx`:

```tsx
import { Button, Dialog, Portal, Text } from "react-native-paper";

export function ConfirmDialog({
  visible, title, message, confirmLabel = "Xác nhận", cancelLabel = "Hủy",
  danger, loading, onConfirm, onDismiss,
}: {
  visible: boolean; title: string; message: string;
  confirmLabel?: string; cancelLabel?: string;
  danger?: boolean; loading?: boolean;
  onConfirm: () => void; onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={loading ? () => {} : onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>{cancelLabel}</Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            buttonColor={danger ? "#B71C1C" : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

> `onDismiss` bị vô hiệu khi `loading` — chạm ra ngoài lúc đang gửi request sẽ đóng hộp thoại và
> người dùng mất dấu kết quả. Chi tiết nhỏ, nhưng đúng là loại thứ phân biệt app chạy được với app
> dùng được.

Dùng cho nút xác nhận tham dự:

```tsx
<ConfirmDialog
  visible={confirmOpen}
  title="Xác nhận tham dự"
  message={`Bạn xác nhận sẽ tham dự buổi phỏng vấn lúc ${formatDateTime(interview.scheduledAt)}?`}
  loading={confirm.isPending}
  onConfirm={() => confirm.mutate(interview.id, { onSuccess: () => setConfirmOpen(false) })}
  onDismiss={() => setConfirmOpen(false)}
/>
```

### Bước 9.3 — Kiểm thử chéo web ↔ mobile (60 phút)

Cần hai thiết bị: web mở tài khoản HR, điện thoại mở tài khoản ứng viên.

| Bước | Làm trên | Kỳ vọng trên điện thoại |
|---|---|---|
| 1. HR tạo lịch phỏng vấn cho ứng viên | Web | **Chưa thấy gì** — trạng thái đang là `SCHEDULED` |
| 2. HM xác nhận (làm hộ trên web) | Web | Kéo refresh → buổi hiện ra, trạng thái "Đã chốt giờ", có nút xác nhận |
| 3. Ứng viên bấm xác nhận | Điện thoại | Snackbar xanh, chip đổi thành "Ứng viên đã xác nhận", nút biến mất |
| 4. Kiểm tra lại trên web | Web | Trạng thái là `CANDIDATE_CONFIRMED` |
| 5. HR tạo bộ slot cho ứng viên chọn | Web | Kéo refresh → khối "Cần bạn chọn giờ" hiện lên |
| 6. Ứng viên chọn một khung giờ | Điện thoại | Snackbar, khối slot biến mất |

> Bước 1 là phép thử quan trọng nhất của hôm nay: **không thấy gì là ĐÚNG**. Nếu buổi `SCHEDULED`
> lọt ra màn ứng viên thì hoặc backend lọc sai, hoặc bạn đang gọi nhầm endpoint nội bộ thay vì
> `/my`.

### ✅ Định nghĩa "ngày 9 đã xong"

- [ ] Chạy hết 6 bước kiểm thử chéo, không bước nào sai
- [ ] `ConfirmDialog` đã tách thành component dùng chung
- [ ] Bấm xác nhận hai lần liên tiếp → chỉ gửi một request
- [ ] B5 đạt đủ 7 điều kiện ở mục 11 của kế hoạch

---

## NGÀY 10 — Hạ tầng tải file + B6 Thư mời của tôi

> **Nửa đầu ngày là phần kỹ thuật khó nhất tuần.** Làm xong nó thì B7 (ngày mai), C3 (tuần 3) chỉ
> còn là gọi lại một hàm.

### Bước 10.1 — `src/lib/download.ts` — tải kèm header rồi mở bằng app hệ thống (80 phút)

```ts
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "@/config";
import { authState } from "@/store/authStore";

/**
 * Tải một file cần xác thực rồi mở bằng ứng dụng của hệ thống.
 *
 * KHÔNG dùng Linking.openURL cho các endpoint này: trình duyệt hệ thống không mang theo
 * header Authorization nên luôn nhận 401. Phải tự tải kèm header, lưu vào thư mục của app,
 * rồi nhờ expo-sharing mở.
 *
 * @param path      đường dẫn tính từ base URL, ví dụ "/offer/offers/12/pdf"
 * @param fileName  tên file khi lưu, ví dụ "thu-moi-12.pdf"
 * @param mimeType  kiểu nội dung để hệ thống chọn đúng app mở
 */
export async function downloadAndOpen(
  path: string,
  fileName: string,
  mimeType = "application/pdf"
): Promise<void> {
  const { accessToken } = authState();
  if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");

  // Tên file phải sạch: ký tự lạ làm hỏng đường dẫn trên Android.
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const target = `${FileSystem.cacheDirectory}${safeName}`;

  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, target, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (result.status === 401) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  }
  if (result.status === 403) {
    throw new Error("Bạn không có quyền xem tệp này");
  }
  if (result.status === 404) {
    throw new Error("Không tìm thấy tệp");
  }
  if (result.status !== 200) {
    throw new Error(`Tải tệp thất bại (mã ${result.status})`);
  }

  // File rỗng = backend trả 200 nhưng không có nội dung. Mở ra sẽ là trang trắng khó hiểu.
  const info = await FileSystem.getInfoAsync(result.uri, { size: true });
  if (!info.exists || (info.size ?? 0) === 0) {
    throw new Error("Tệp rỗng hoặc bị lỗi");
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Thiết bị không hỗ trợ mở tệp");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType,
    dialogTitle: "Mở tệp bằng",
    UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
  });
}

/** Đoán mimeType từ đuôi file — dùng cho CV có thể là pdf hoặc docx. */
export const guessMimeType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "doc": return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default: return "application/octet-stream";
  }
};
```

> **`downloadAsync` không ném lỗi khi gặp 401** — nó trả về status trong kết quả và vẫn ghi ra một
> file chứa nội dung trang lỗi. Nếu không kiểm tra `result.status`, người dùng sẽ thấy một "PDF"
> mở ra toàn ký tự rác. Đây là lý do khối kiểm tra status ở trên dài như vậy.
>
> Dùng `cacheDirectory` chứ không phải `documentDirectory`: file tải về là bản tạm để xem, hệ
> điều hành được phép dọn khi thiếu dung lượng. Không cần tự quản lý vòng đời.

Hook dùng chung, có trạng thái đang tải để nút hiện spinner:

`src/lib/useDownload.ts`:

```ts
import { useState } from "react";
import { downloadAndOpen } from "./download";
import { useSnackbar } from "@/components/ui/SnackbarProvider";

export function useDownload() {
  const { notify } = useSnackbar();
  const [downloading, setDownloading] = useState(false);

  const open = async (path: string, fileName: string, mimeType?: string) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAndOpen(path, fileName, mimeType);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Không mở được tệp", "error");
    } finally {
      setDownloading(false);
    }
  };

  return { open, downloading };
}
```

### Bước 10.2 — Kiểm chứng `download.ts` ngay, trước khi làm tiếp (30 phút)

Đừng đợi tới khi làm xong B7 mới test. Tạo một màn nháp, gắn một nút, chạy thử ngay:

```tsx
const { open, downloading } = useDownload();

<Button loading={downloading} onPress={() => open("/offer/offers/1/pdf", "test.pdf")}>
  Thử tải PDF
</Button>
```

| Tình huống test | Cách tạo | Kỳ vọng |
|---|---|---|
| Tải thành công | Offer thật có PDF | Hộp chọn app mở ra, PDF hiện đúng nội dung |
| Không có quyền | Dùng id offer của người khác | Snackbar "Bạn không có quyền xem tệp này" |
| Không tồn tại | Dùng id 99999 | Snackbar "Không tìm thấy tệp" |
| Mất mạng giữa chừng | Bật chế độ máy bay lúc đang tải | Snackbar lỗi, không crash, nút hết spinner |

> **Nếu bước này chưa chạy được thì dừng lại làm cho xong.** B7 (ngày mai) và C3 (tuần 3) đều
> đứng trên nó. Phát hiện hỏng vào ngày 11 tốn gấp đôi thời gian so với phát hiện hôm nay.

### Bước 10.3 — B6 Thư mời của tôi (60 phút)

`src/features/offers/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { CandidateOffer, OfferResponse } from "@/types/api";

export const offersApi = {
  // ===== Ứng viên =====
  myList: () => apiClient.get<CandidateOffer[]>("/offer/offers/my").then((r) => r.data),
  myDetail: (id: number | string) =>
    apiClient.get<CandidateOffer>(`/offer/offers/my/${id}`).then((r) => r.data),
  accept: (id: number | string) =>
    apiClient.patch(`/offer/offers/${id}/accept`).then((r) => r.data),
  decline: (id: number | string, reason?: string) =>
    apiClient.patch(`/offer/offers/${id}/decline`, reason ? { reason } : undefined)
      .then((r) => r.data),

  // ===== HR (dùng ở tuần 3) =====
  // Tham số đã xác minh trong OfferController: applicationId, jobPostingId, status,
  // createdFrom, createdTo, page, size → trả PageResponse.
  list: (params: { status?: string; page?: number; size?: number }) =>
    apiClient.get("/offer/offers", { params }).then((r) => r.data),
  detail: (id: number | string) =>
    apiClient.get<OfferResponse>(`/offer/offers/${id}`).then((r) => r.data),
  approve: (id: number | string) =>
    apiClient.patch(`/offer/offers/${id}/approve`).then((r) => r.data),
  reject: (id: number | string, reason?: string) =>
    apiClient.patch(`/offer/offers/${id}/reject`, reason ? { reason } : undefined)
      .then((r) => r.data),

  pdfPath: (id: number | string) => `/offer/offers/${id}/pdf`,
};
```

> **Kiểm tra body của `/decline` và `/reject`** trong `src/types/generated/offer.ts` — chúng có thể
> nhận `{ reason }`, nhận một chuỗi, hoặc không nhận gì. Sửa lại cho khớp trước khi chạy.

`app/(candidate)/offers/index.tsx` — lắp khuôn danh sách, thẻ hiện: tiêu đề vị trí · `StatusChip`
domain `"offer"` · lương · ngày hết hạn. Đơn giản, vì mục 12 đã ghi phương án cắt "gộp B6 vào B7"
— giữ B6 mỏng thì việc gộp sau này rẻ.

Thêm đường vào B6: ứng viên không có tab riêng cho thư mời (tab bar chỉ có 4 mục), nên đặt một
mục trong màn Hồ sơ và một lối từ A4. Khi có thư mời chờ xử lý, hiện badge:

```tsx
// trong app/(candidate)/profile.tsx
<List.Item
  title="Thư mời của tôi"
  left={(p) => <List.Icon {...p} icon="email-outline" />}
  right={(p) => pendingCount > 0
    ? <Badge {...p} style={{ alignSelf: "center" }}>{pendingCount}</Badge>
    : <List.Icon {...p} icon="chevron-right" />}
  onPress={() => router.push("/(candidate)/offers")}
/>
```

### ✅ Định nghĩa "ngày 10 đã xong"

- [ ] `downloadAndOpen` mở được PDF thật trên máy thật
- [ ] Cả 4 tình huống lỗi ở bước 10.2 cho thông báo tiếng Việt đúng, không crash
- [ ] B6 hiện danh sách thư mời thật, đủ 4 trạng thái màn hình
- [ ] Có đường vào B6 từ màn Hồ sơ, kèm badge khi có thư mời chờ

---

## NGÀY 11 — B7 Chi tiết thư mời: xem PDF, đồng ý, từ chối

> **Khoảnh khắc quan trọng nhất với ứng viên**, và nó luôn xảy ra trên điện thoại. Màn này đáng
> được chăm chút hơn mức trung bình.

### Bước 11.1 — Bố cục màn (60 phút)

`app/(candidate)/offers/[id].tsx`:

```tsx
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Card, Divider, Text, TextInput } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { QueryScreen } from "@/components/ui/QueryScreen";
import { StatusChip } from "@/components/ui/StatusChip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMyOffer, useAcceptOffer, useDeclineOffer } from "@/features/offers/hooks";
import { useDownload } from "@/lib/useDownload";
import { offersApi } from "@/features/offers/api";
import { formatDate, formatMoney } from "@/lib/format";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
      <Text variant="bodyMedium" style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useMyOffer(id);
  const accept = useAcceptOffer();
  const decline = useDeclineOffer();
  const { open, downloading } = useDownload();

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <QueryScreen query={query} skeleton="detail">
      {(offer) => {
        // Chỉ thư mời đã gửi tới ứng viên mới cho phép quyết định.
        const decidable = offer.status === "SENT_TO_CANDIDATE"
          || offer.status === "PENDING_CONFIRMATION";

        return (
          <>
            <View style={styles.head}>
              <Text variant="headlineSmall" style={{ flex: 1 }}>
                {offer.jobPostingTitle ?? "Thư mời nhận việc"}
              </Text>
              <StatusChip status={offer.status} domain="offer" />
            </View>

            <Card style={styles.card}>
              <Card.Content>
                <Row label="Vị trí" value={offer.positionTitle ?? offer.jobPostingTitle} />
                <Divider style={styles.divider} />
                <Row label="Mức lương" value={formatMoney(offer.salaryAmount)} />
                <Divider style={styles.divider} />
                <Row label="Ngày bắt đầu" value={formatDate(offer.startDate)} />
                <Divider style={styles.divider} />
                <Row label="Hạn phản hồi" value={formatDate(offer.expiresAt)} />
              </Card.Content>
            </Card>

            <Button
              mode="outlined"
              icon="file-pdf-box"
              style={styles.pdfBtn}
              loading={downloading}
              disabled={downloading}
              onPress={() => open(offersApi.pdfPath(offer.id), `thu-moi-${offer.id}.pdf`)}
            >
              Xem thư mời (PDF)
            </Button>

            {offer.notes ? (
              <>
                <Text variant="titleMedium" style={styles.section}>Ghi chú</Text>
                <Text variant="bodyMedium" style={styles.body}>{offer.notes}</Text>
              </>
            ) : null}

            {decidable ? (
              <View style={styles.actions}>
                <Button
                  mode="contained"
                  style={styles.action}
                  onPress={() => setAcceptOpen(true)}
                >
                  Đồng ý nhận việc
                </Button>
                <Button
                  mode="outlined"
                  textColor="#B71C1C"
                  style={styles.action}
                  onPress={() => setDeclineOpen(true)}
                >
                  Từ chối
                </Button>
              </View>
            ) : (
              <Text variant="bodySmall" style={styles.closed}>
                Thư mời này đã được xử lý, bạn không cần làm gì thêm.
              </Text>
            )}

            <ConfirmDialog
              visible={acceptOpen}
              title="Đồng ý nhận việc"
              message={`Bạn xác nhận đồng ý với mức lương ${formatMoney(offer.salaryAmount)}, bắt đầu từ ${formatDate(offer.startDate)}? Quyết định này không thể hoàn tác.`}
              confirmLabel="Đồng ý"
              loading={accept.isPending}
              onConfirm={() => accept.mutate(offer.id, {
                onSuccess: () => { setAcceptOpen(false); void query.refetch(); },
              })}
              onDismiss={() => setAcceptOpen(false)}
            />

            {/* Từ chối cần lý do → dùng Dialog riêng có ô nhập */}
            <DeclineDialog
              visible={declineOpen}
              loading={decline.isPending}
              reason={reason}
              onChangeReason={setReason}
              onDismiss={() => setDeclineOpen(false)}
              onConfirm={() => decline.mutate(
                { id: offer.id, reason: reason.trim() || undefined },
                { onSuccess: () => { setDeclineOpen(false); void query.refetch(); } }
              )}
            />
          </>
        );
      }}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  card: { marginTop: 16, borderRadius: 12 },
  row: { flexDirection: "row", paddingVertical: 8 },
  label: { width: 110, opacity: 0.6 },
  value: { flex: 1, fontWeight: "500" },
  divider: { opacity: 0.4 },
  pdfBtn: { marginTop: 16 },
  section: { marginTop: 24, marginBottom: 8 },
  body: { lineHeight: 22 },
  actions: { marginTop: 32, gap: 10 },
  action: { paddingVertical: 4 },
  closed: { marginTop: 32, textAlign: "center", opacity: 0.6 },
});
```

> **Hộp xác nhận nhắc lại lương và ngày bắt đầu.** Người dùng đang đứng ở bến xe, màn hình 6 inch,
> vừa lướt qua PDF. Nhắc lại hai con số quan trọng nhất ngay trước nút bấm là việc rẻ tiền nhưng
> ngăn được đúng loại sai lầm không sửa được.
>
> Tên trạng thái cho phép quyết định (`SENT_TO_CANDIDATE` / `PENDING_CONFIRMATION`) **phải đối
> chiếu với `OfferStatus` thật** trong `offer-service`. Đừng đoán — mở
> `src/types/generated/offer.ts` xem union string.

### Bước 11.2 — Dialog từ chối có ô nhập lý do (30 phút)

```tsx
function DeclineDialog({
  visible, loading, reason, onChangeReason, onConfirm, onDismiss,
}: {
  visible: boolean; loading: boolean; reason: string;
  onChangeReason: (v: string) => void; onConfirm: () => void; onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={loading ? () => {} : onDismiss}>
        <Dialog.Title>Từ chối thư mời</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Bạn chắc chắn từ chối? Quyết định này không thể hoàn tác.
          </Text>
          <TextInput
            label="Lý do (không bắt buộc)"
            mode="outlined"
            multiline
            numberOfLines={3}
            value={reason}
            onChangeText={onChangeReason}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>Hủy</Button>
          <Button mode="contained" buttonColor="#B71C1C"
                  onPress={onConfirm} loading={loading} disabled={loading}>
            Từ chối
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

### Bước 11.3 — Kiểm thử chéo (50 phút)

| Bước | Làm trên | Kỳ vọng |
|---|---|---|
| HR tạo offer, submit, duyệt | Web | Điện thoại kéo refresh → thư mời hiện ở B6 |
| Mở B7, bấm "Xem thư mời (PDF)" | Điện thoại | PDF mở đúng bằng app đọc PDF của máy |
| Bấm "Đồng ý" → xác nhận | Điện thoại | Snackbar xanh, chip đổi thành "Ứng viên đồng ý", hai nút biến mất |
| Kiểm tra lại | Web | Offer là `ACCEPTED`, hồ sơ ứng viên chuyển `HIRED` |
| Với offer khác: bấm "Từ chối", nhập lý do | Điện thoại | Chip đổi thành "Ứng viên từ chối" |
| Mở lại offer đã xử lý | Điện thoại | Không còn nút, hiện câu "đã được xử lý" |

### ✅ Định nghĩa "ngày 11 đã xong"

- [ ] Xem được PDF thư mời trên máy thật
- [ ] Đồng ý và từ chối đều chạy, kiểm chứng ngược trên web
- [ ] Thư mời đã xử lý không còn nút hành động
- [ ] B6 + B7 đạt đủ 7 điều kiện ở mục 11

---

## NGÀY 12 — B8 Hồ sơ & CV

> Màn này khép lại phụ thuộc B2→B8 đã nêu ở tuần 1, phần 0.2(a).

### Bước 12.1 — API hồ sơ (25 phút)

Đã đối chiếu `CandidatePortalController`: `GET /api/candidate/me` · `PATCH /api/candidate/me` ·
`POST /api/candidate/me/resume` (multipart, **tên trường là `file`**).

`src/features/profile/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { CandidateSelf } from "@/types/api";

export const profileApi = {
  me: () => apiClient.get<CandidateSelf>("/candidate/me").then((r) => r.data),

  update: (body: Partial<{ fullName: string; phone: string; address: string; dateOfBirth: string }>) =>
    apiClient.patch<CandidateSelf>("/candidate/me", body).then((r) => r.data),

  /**
   * Upload CV. React Native gửi FormData bằng object { uri, name, type } —
   * KHÔNG phải Blob/File như trên web.
   * Tên trường phải đúng "file" (@RequestParam("file") ở CandidatePortalController).
   */
  uploadResume: (file: { uri: string; name: string; mimeType?: string | null }) => {
    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);

    return apiClient
      .post<CandidateSelf>("/candidate/me/resume", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,          // file lớn + mạng yếu cần nhiều hơn 15 giây mặc định
      })
      .then((r) => r.data);
  },
};
```

> Ba cái bẫy của upload trên RN, cả ba đều im lặng:
> **(1)** `type` thiếu → một số backend từ chối phần multipart.
> **(2)** Đặt sẵn `Content-Type: multipart/form-data` mà không có `boundary` — ở axios RN thì cách
> viết trên hoạt động, nhưng nếu gặp lỗi 400 khó hiểu, **bỏ hẳn header đó đi** để axios tự sinh.
> **(3)** Timeout mặc định 15 giây quá ngắn cho file vài MB trên 3G.

### Bước 12.2 — Chọn file bằng `expo-document-picker` (40 phút)

```ts
import * as DocumentPicker from "expo-document-picker";

const MAX_SIZE = 5 * 1024 * 1024;   // 5MB

const pickResume = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    copyToCacheDirectory: true,     // bắt buộc: URI content:// của Android không upload thẳng được
    multiple: false,
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  if (!file) return null;

  if ((file.size ?? 0) > MAX_SIZE) {
    notify("Tệp quá lớn. Vui lòng chọn tệp dưới 5MB.", "error");
    return null;
  }
  return file;
};
```

> `copyToCacheDirectory: true` là bắt buộc trên Android. URI dạng `content://` do trình chọn file
> trả về chỉ sống trong phạm vi quyền tạm thời; axios đọc lại có thể thất bại. Copy vào cache là
> cách chắc chắn.
>
> Kiểm tra dung lượng **ở client trước khi gửi** — để backend từ chối một file 40MB sau 2 phút chờ
> trên 3G là trải nghiệm tệ nhất có thể.

### Bước 12.3 — Màn hồ sơ (70 phút)

`app/(candidate)/profile.tsx` gồm 4 khối:

**1. Thông tin cá nhân** — form `FormTextField` + zod, nút "Lưu" chỉ bật khi form `isDirty`:

```tsx
<Button
  mode="contained"
  disabled={!formState.isDirty || update.isPending}
  loading={update.isPending}
  onPress={handleSubmit(onSave)}
>
  Lưu thay đổi
</Button>
```

**2. Khối CV** — ba trạng thái rõ ràng:

```tsx
<Card style={styles.card}>
  <Card.Title title="CV của bạn" />
  <Card.Content>
    {me.cvFileUrl ? (
      <>
        <View style={styles.fileRow}>
          <Icon source="file-pdf-box" size={28} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={1}>{me.cvFileName ?? "CV.pdf"}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.6 }}>
              Cập nhật {formatRelative(me.cvUpdatedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.cvActions}>
          <Button
            mode="outlined"
            loading={downloading}
            onPress={() => open(
              `/candidate/candidates/cv-file/${me.cvFileName}`,
              me.cvFileName!,
              guessMimeType(me.cvFileName!)
            )}
          >
            Xem CV
          </Button>
          <Button mode="text" onPress={onPickAndUpload} loading={upload.isPending}>
            Thay CV khác
          </Button>
        </View>
      </>
    ) : (
      <>
        <Text variant="bodyMedium" style={styles.warn}>
          Bạn chưa có CV. Cần tải CV lên trước khi nộp đơn ứng tuyển.
        </Text>
        <Button
          mode="contained"
          icon="upload"
          onPress={onPickAndUpload}
          loading={upload.isPending}
          style={{ marginTop: 12 }}
        >
          Tải CV lên
        </Button>
      </>
    )}
  </Card.Content>
</Card>
```

**3. Lối vào "Thư mời của tôi"** — đã làm ở ngày 10.

**4. Đăng xuất** — phải gọi API để thu hồi refresh token, **và** (từ ngày 14) xóa device token:

```tsx
const onLogout = async () => {
  const { refreshToken } = useAuthStore.getState();
  try {
    // Ngày 14 sẽ thêm: await unregisterPushToken();
    if (refreshToken) await authApi.logout(refreshToken);
  } catch {
    // Backend không thu hồi được cũng vẫn phải đăng xuất ở máy. Không chặn người dùng.
  } finally {
    queryClient.clear();          // xóa cache, tránh người sau thấy dữ liệu người trước
    await signOut();
  }
};
```

> `queryClient.clear()` không phải tùy chọn: không xóa thì người dùng B đăng nhập vào cùng máy sẽ
> thấy nhoáng qua dữ liệu của người dùng A trước khi query mới chạy xong. Trên điện thoại dùng
> chung, đây là lỗi quyền riêng tư thật.
>
> `catch {}` rỗng có chủ ý: nếu mạng hỏng, người dùng vẫn phải thoát được khỏi tài khoản trên máy
> của họ. Ưu tiên đúng thứ tự.

### Bước 12.4 — Khép vòng B2↔B8 (25 phút)

| Kịch bản | Kỳ vọng |
|---|---|
| Tài khoản mới, chưa có CV → vào B2 nộp đơn | Snackbar báo lỗi + tự chuyển sang màn hồ sơ |
| Ở màn hồ sơ, tải CV lên | Khối CV chuyển sang trạng thái "đã có", hiện tên file |
| Quay lại B2 nộp đơn lại | Nộp thành công |
| Bấm "Xem CV" | Mở được file vừa tải lên |

### ✅ Định nghĩa "ngày 12 đã xong"

- [ ] Sửa thông tin cá nhân → lưu → kéo refresh vẫn còn
- [ ] Tải CV `.pdf` và `.docx` đều thành công
- [ ] File > 5MB bị chặn ở client kèm thông báo rõ
- [ ] Xem lại CV vừa tải lên được
- [ ] Vòng B2↔B8 khép kín
- [ ] Đăng xuất: thu hồi token + xóa cache + về màn login
- [ ] **B1–B8 đã xong đủ 8 màn Candidate**

---

## NGÀY 13 — Backend: 4 thay đổi trong notification-service

> **Hôm nay không viết một dòng React Native nào.** Toàn bộ là Java, trong
> `notification-service/`. Đọc lại cảnh báo ở phần 0.3 trước khi bắt đầu.

### Bước 13.0 — Đọc bản mẫu (15 phút)

Mở và đọc kỹ 3 file, **trước khi** viết bất cứ thứ gì:

```
notification-service/src/main/java/iuh/fit/se/notification/notification/RealtimePushService.java
notification-service/src/main/java/iuh/fit/se/notification/notification/NotificationService.java
notification-service/src/main/java/iuh/fit/se/notification/notification/NotificationController.java
```

Ghi nhớ 4 quy ước của codebase này:

1. DTO là **`record`**, không phải class có getter/setter.
2. Service dùng **`@RequiredArgsConstructor`** + field `final`, không `@Autowired`.
3. Lấy người dùng hiện tại bằng **`CurrentUser.required()`** — trả record
   `(userId, email, role, departmentId)`.
4. Log bằng **`@Slf4j`**, thông điệp tiếng Việt như các chỗ khác trong file.

### Bước 13.1 — Việc 1/4: Migration bảng `device_token` (25 phút)

Migration mới nhất hiện là `V4__phase3_notification_lifecycle.sql`, nên file mới là **V5**.

Tạo `notification-service/src/main/resources/db/migration/V5__mobile_device_token.sql`:

```sql
-- Mobile push: nơi lưu địa chỉ của từng thiết bị đã đăng nhập.
--
-- Cho tới giờ notification-service biết gửi tới một *người* (recipient_user_id) qua WebSocket và
-- email. Điện thoại thì khác: kênh đến nó là một token do Expo cấp cho từng lần cài app, và cùng
-- một người có thể có nhiều thiết bị. Bảng này là ánh xạ người → các thiết bị của họ.
--
-- Additive hoàn toàn. Không bảng nào đang chạy bị đụng tới.

CREATE TABLE IF NOT EXISTS device_token (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    -- Token của Expo, dạng ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx].
    -- UNIQUE vì một token chỉ thuộc về đúng một lần cài app: nếu máy đó được đăng nhập bằng
    -- tài khoản khác, dòng cũ phải được cập nhật sang user mới chứ không nhân đôi — nếu không,
    -- người dùng trước sẽ tiếp tục nhận thông báo trên máy không còn là của họ.
    expo_token    VARCHAR(255) NOT NULL UNIQUE,
    platform      VARCHAR(16)  NOT NULL DEFAULT 'ANDROID',
    created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    -- Cập nhật mỗi lần đăng ký lại, để sau này còn dọn được token của máy đã bỏ lâu ngày.
    last_seen_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Đường truy vấn duy nhất lúc gửi push: "user này có những thiết bị nào".
CREATE INDEX IF NOT EXISTS ix_device_token_user ON device_token(user_id);

ALTER TABLE device_token DROP CONSTRAINT IF EXISTS ck_device_token_platform;
ALTER TABLE device_token ADD CONSTRAINT ck_device_token_platform
    CHECK (platform IN ('ANDROID', 'IOS'));
```

> Comment dài theo đúng phong cách của `V4__phase3_notification_lifecycle.sql` — file migration ở
> repo này giải thích **vì sao**, không chỉ **cái gì**. Giữ nhất quán.

### Bước 13.2 — Việc 2/4: Entity, repository, controller (60 phút)

Tạo package `notification-service/src/main/java/iuh/fit/se/notification/device/`.

`DeviceToken.java`:

```java
package iuh.fit.se.notification.device;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeviceToken {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "expo_token", nullable = false, unique = true)
    private String expoToken;

    @Column(nullable = false)
    private String platform;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        lastSeenAt = now;
    }
}
```

`DeviceTokenRepository.java`:

```java
package iuh.fit.se.notification.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    List<DeviceToken> findByUserId(Long userId);
    Optional<DeviceToken> findByExpoToken(String expoToken);
    void deleteByExpoToken(String expoToken);
}
```

`dto/DeviceTokenRequest.java`:

```java
package iuh.fit.se.notification.device.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceTokenRequest(
        @NotBlank(message = "Thiếu device token") String expoToken,
        String platform
) {}
```

`DeviceTokenService.java`:

```java
package iuh.fit.se.notification.device;

import iuh.fit.se.notification.device.dto.DeviceTokenRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceTokenService {

    private final DeviceTokenRepository repository;

    /**
     * Đăng ký thiết bị cho user đang đăng nhập.
     *
     * Token là duy nhất theo từng lần cài app, không theo người. Nếu token đã tồn tại mà thuộc
     * user khác thì đây là trường hợp máy đó vừa được đăng nhập bằng tài khoản khác: chuyển chủ
     * sở hữu, không tạo thêm dòng. Để nguyên dòng cũ đồng nghĩa với việc người dùng trước vẫn
     * nhận được thông báo trên chiếc máy không còn là của họ.
     */
    @Transactional
    public void register(Long userId, DeviceTokenRequest req) {
        String platform = req.platform() == null || req.platform().isBlank()
                ? "ANDROID"
                : req.platform().toUpperCase();

        repository.findByExpoToken(req.expoToken())
                .ifPresentOrElse(existing -> {
                    existing.setUserId(userId);
                    existing.setPlatform(platform);
                    existing.setLastSeenAt(LocalDateTime.now());
                    repository.save(existing);
                }, () -> repository.save(DeviceToken.builder()
                        .userId(userId)
                        .expoToken(req.expoToken())
                        .platform(platform)
                        .build()));
    }

    @Transactional
    public void unregister(String expoToken) {
        repository.deleteByExpoToken(expoToken);
    }

    public List<String> tokensOf(Long userId) {
        return repository.findByUserId(userId).stream()
                .map(DeviceToken::getExpoToken)
                .toList();
    }

    /** Expo báo token đã chết (DeviceNotRegistered) → bỏ đi, đừng gửi nữa. */
    @Transactional
    public void removeDead(String expoToken) {
        log.info("Xóa device token đã chết: {}", expoToken);
        repository.deleteByExpoToken(expoToken);
    }
}
```

`DeviceTokenController.java`:

```java
package iuh.fit.se.notification.device;

import iuh.fit.se.notification.device.dto.DeviceTokenRequest;
import iuh.fit.se.notification.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notification/device-tokens")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService service;

    /** App gọi ngay sau khi đăng nhập thành công. */
    @PostMapping
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody DeviceTokenRequest req) {
        service.register(CurrentUser.required().userId(), req);
        return ResponseEntity.ok(Map.of("message", "Đã đăng ký thiết bị"));
    }

    /** App gọi trước khi đăng xuất. */
    @DeleteMapping("/{token}")
    public ResponseEntity<Map<String, String>> unregister(@PathVariable String token) {
        CurrentUser.required();          // bắt buộc phải đăng nhập
        service.unregister(token);
        return ResponseEntity.ok(Map.of("message", "Đã hủy đăng ký thiết bị"));
    }
}
```

> `SecurityConfig` hiện dùng `.anyRequest().authenticated()` nên hai endpoint này **tự động** được
> bảo vệ, không cần sửa gì thêm.

### Bước 13.3 — Việc 3/4: `MobilePushService` (70 phút)

Đặt cạnh `RealtimePushService.java`, cùng package `notification`:

```java
package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.device.DeviceTokenService;
import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Kênh thứ ba của notification, bên cạnh {@link RealtimePushService} (WebSocket cho web) và
 * EmailNotificationService: đẩy thông báo tới app điện thoại qua dịch vụ của Expo.
 *
 * Nguyên tắc: đây là kênh CỘNG THÊM. Mọi lỗi ở đây đều được nuốt và ghi log — luồng thông báo
 * sẵn có của web không bao giờ được hỏng vì điện thoại không nhận được push.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MobilePushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    /** Expo nhận tối đa 100 message mỗi lần gọi. */
    private static final int BATCH_SIZE = 100;

    private final DeviceTokenService deviceTokenService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.notification.mobile-push-enabled:true}")
    private boolean enabled;

    public void send(Long recipientUserId, NotificationResponse notification) {
        if (!enabled || recipientUserId == null) {
            return;
        }

        List<String> tokens = deviceTokenService.tokensOf(recipientUserId);
        if (tokens.isEmpty()) {
            return;                       // người này chưa cài app — không có gì để làm
        }

        for (int i = 0; i < tokens.size(); i += BATCH_SIZE) {
            List<String> batch = tokens.subList(i, Math.min(i + BATCH_SIZE, tokens.size()));
            sendBatch(batch, notification);
        }
    }

    private void sendBatch(List<String> tokens, NotificationResponse n) {
        List<Map<String, Object>> messages = new ArrayList<>();
        for (String token : tokens) {
            Map<String, Object> msg = new HashMap<>();
            msg.put("to", token);
            msg.put("title", n.title());
            msg.put("body", n.message());
            msg.put("sound", "default");
            msg.put("priority", "high");
            msg.put("channelId", "default");
            // App suy ra màn cần mở từ resourceType + resourceId, giống hệt cách web làm
            // trong frontend/src/features/notification/notificationRoutes.ts.
            msg.put("data", Map.of(
                    "notificationId", n.id(),
                    "type", n.type().name(),
                    "resourceType", n.resourceType() != null ? n.resourceType() : "",
                    "resourceId", n.resourceId() != null ? n.resourceId() : 0));
            messages.add(msg);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<Map> response = restTemplate.exchange(
                    EXPO_PUSH_URL, HttpMethod.POST,
                    new HttpEntity<>(messages, headers), Map.class);

            handleReceipts(tokens, response.getBody());
        } catch (Exception e) {
            // Nuốt lỗi có chủ ý. Push hỏng không được kéo theo notification in-app và email.
            log.warn("Gửi mobile push thất bại ({} token): {}", tokens.size(), e.getMessage());
        }
    }

    /**
     * Expo trả về mảng "data" song song với mảng message đã gửi. Phần tử nào có
     * status = "error" và details.error = "DeviceNotRegistered" nghĩa là app đã bị gỡ hoặc
     * token đã đổi — xóa token đi, nếu không mỗi lần gửi sau đều tốn một lần gọi vô ích.
     */
    @SuppressWarnings("unchecked")
    private void handleReceipts(List<String> tokens, Map<String, Object> body) {
        if (body == null) return;
        Object data = body.get("data");
        if (!(data instanceof List<?> results)) return;

        for (int i = 0; i < results.size() && i < tokens.size(); i++) {
            if (!(results.get(i) instanceof Map<?, ?> item)) continue;
            if (!"error".equals(item.get("status"))) continue;

            Object details = item.get("details");
            String code = details instanceof Map<?, ?> d ? String.valueOf(d.get("error")) : null;

            if ("DeviceNotRegistered".equals(code)) {
                deviceTokenService.removeDead(tokens.get(i));
            } else {
                log.warn("Expo từ chối push token {}: {}", tokens.get(i), item.get("message"));
            }
        }
    }
}
```

Thêm vào `notification-service/src/main/resources/application.yml`, dưới `app.notification`:

```yaml
app:
  notification:
    email-enabled: ${APP_NOTIFICATION_EMAIL_ENABLED:false}
    mobile-push-enabled: ${APP_NOTIFICATION_MOBILE_PUSH_ENABLED:true}
    interview-reminder-hours-before: 1
    evaluation-check-hours-after: 24
```

> Có cờ bật/tắt là để: nếu hôm demo mạng trường chặn `exp.host`, mỗi lần gửi notification sẽ phải
> chờ timeout HTTP rồi mới nuốt lỗi — làm chậm cả hệ thống. Lúc đó tắt cờ là xong. Đây là một lớp
> phòng thủ cho rủi ro mạng ở mục 12.

### Bước 13.4 — Việc 4/4: cắm vào `createAndPush()` (20 phút)

Sửa `NotificationService.java` đúng **hai chỗ**:

```java
    private final NotificationRepository repository;
    private final RealtimePushService realtimePushService;
    private final MobilePushService mobilePushService;          // ← THÊM
    private final EmailNotificationService emailNotificationService;
    private final AuthServiceClient authServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
```

và trong `createAndPush()`, ngay sau khối realtime push:

```java
        try {
            realtimePushService.pushToUser(recipientUserId, dto);
        } catch (Exception e) {
            log.warn("Realtime push thất bại userId={}: {}", recipientUserId, e.getMessage());
        }

        // Kênh thứ ba: điện thoại. Bọc try/catch riêng, cùng lý do với realtime push.
        try {
            mobilePushService.send(recipientUserId, dto);
        } catch (Exception e) {
            log.warn("Mobile push thất bại userId={}: {}", recipientUserId, e.getMessage());
        }

        trySendEmail(recipientUserId, type, title, message, resourceType, resourceId);
```

> **Chỉ có vậy.** Một điểm chèn duy nhất, và **cả 15 `NotificationType`** hiện có tự động có push.
> Không đụng tới một dòng business logic nào của interview, offer hay recruitment. Đây là câu trả
> lời tốt nhất cho câu hỏi "bạn thêm mobile vào hệ thống đang chạy như thế nào mà không làm hỏng
> nó" — và nó có sẵn trong nhật ký quyết định ở mục 15.

### Bước 13.5 — Kiểm thử backend, chưa cần app (50 phút)

```powershell
cd E:\ATS\notification-service
.\mvnw clean package -DskipTests
```

Khởi động lại notification-service, kiểm tra migration đã chạy:

```sql
-- psql vào ats_notification
SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;
\d device_token
```

Test endpoint bằng token thật (lấy từ `POST /api/auth/login`):

```powershell
$token = "<accessToken>"
# Đăng ký một token giả — Expo sẽ từ chối nhưng đường đi trong hệ thống vẫn kiểm tra được
Invoke-RestMethod -Uri "http://localhost:8080/api/notification/device-tokens" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"expoToken":"ExponentPushToken[test-token-gia]","platform":"ANDROID"}'
```

```sql
SELECT * FROM device_token;
```

Kích hoạt một notification thật (tạo lịch phỏng vấn trên web) rồi **xem log của
notification-service**:

- Thấy `Gửi mobile push thất bại` với token giả → **đúng như mong đợi**. Điều quan trọng là:
  notification vẫn được lưu vào DB, web vẫn nhận được qua WebSocket, email vẫn gửi. **Push hỏng
  không kéo theo gì cả** — đây chính là điều cần chứng minh hôm nay.

### ✅ Định nghĩa "ngày 13 đã xong"

- [ ] Migration V5 chạy thành công, bảng `device_token` tồn tại
- [ ] `POST /api/notification/device-tokens` lưu được, gọi lại cùng token **không** tạo dòng thứ hai
- [ ] `DELETE /api/notification/device-tokens/{token}` xóa được
- [ ] Notification vẫn chạy bình thường trên **web** sau khi sửa (kiểm tra chuông web!)
- [ ] Log hiện cảnh báo push thất bại với token giả, **không** có exception nào lan ra ngoài
- [ ] `mvnw package` sạch

### ⚠️ Bẫy ngày 13

| Bẫy | Hậu quả | Xử lý |
|---|---|---|
| Quên try/catch quanh `mobilePushService.send` | Một lỗi mạng làm hỏng cả notification của web | Bọc riêng như mẫu |
| Đặt `send()` **trong** transaction rồi để nó ném | Rollback cả notification đã lưu | Đã nuốt lỗi bên trong `send()`, cộng thêm try/catch bên ngoài |
| Tạo `RestTemplate` như một `@Bean` toàn cục | Đụng cấu hình Feign sẵn có | Khởi tạo cục bộ trong service như mẫu |
| Đặt tên migration là V4 | Flyway báo trùng version, service không khởi động | Dùng V5 |

---

## NGÀY 14 — Client push + A4 Thông báo + deep link + DEMO MỐC AN TOÀN

> **Ngày quan trọng nhất của cả dự án.** Cuối hôm nay phải demo được trọn vòng Candidate kèm push
> thật trên máy thật.

### Bước 14.1 — `src/lib/push.ts` (60 phút)

```ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiClient } from "@/api/client";

/** Thông báo đến lúc app đang mở: vẫn hiện banner để người dùng biết mà bấm. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let cachedToken: string | null = null;

/**
 * Xin quyền, lấy Expo push token, gửi lên backend.
 * Gọi sau khi đăng nhập thành công. Trả null khi không lấy được — KHÔNG ném lỗi,
 * vì không có push thì app vẫn phải dùng được.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push không chạy trên máy ảo");
    return null;
  }

  // Android 8+ bắt buộc có channel, nếu không thông báo sẽ im lặng.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo ATS",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1976D2",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") {
    console.warn("Người dùng từ chối quyền thông báo");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Thiếu EAS projectId — không lấy được push token");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedToken = token;
    await apiClient.post("/notification/device-tokens", {
      expoToken: token,
      platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    });
    return token;
  } catch (e) {
    console.warn("Đăng ký push token thất bại", e);
    return null;
  }
}

/** Gọi TRƯỚC khi đăng xuất, lúc token còn hợp lệ. */
export async function unregisterPushToken(): Promise<void> {
  if (!cachedToken) return;
  try {
    await apiClient.delete(`/notification/device-tokens/${encodeURIComponent(cachedToken)}`);
  } catch {
    // Không chặn đăng xuất vì lý do này.
  } finally {
    cachedToken = null;
  }
}
```

> **Thứ tự của `unregisterPushToken` và `signOut` rất quan trọng:** phải xóa token **trước** khi
> xóa access token, nếu không request `DELETE` sẽ 401. Nghe hiển nhiên, nhưng đây là lỗi ai cũng
> mắc một lần.
>
> `Device.isDevice` chặn trường hợp chạy máy ảo — `getExpoPushTokenAsync` sẽ ném lỗi ở đó, và một
> exception lúc khởi động app là cách tệ nhất để phát hiện mình đang dùng nhầm máy.

### Bước 14.2 — Bản đồ deep link, port từ web (50 phút)

`src/lib/notificationRoutes.ts` — đây là chỗ giải quyết mục ⚠️ #2. Không có trường `deepLink`;
đường đi suy ra từ `resourceType` + `resourceId` + role, **đúng như
`frontend/src/features/notification/notificationRoutes.ts` đang làm**:

```ts
import type { UserRole } from "@/store/authStore";

interface RoutableNotification {
  type?: string | null;
  resourceType?: string | null;
  resourceId?: number | null;
}

const HR_ROLES: UserRole[] = ["RECRUITER", "COMPANY_ADMIN"];

/**
 * Port từ frontend/src/features/notification/notificationRoutes.ts.
 * Khác web ở chỗ mobile có route riêng theo role, nên bản đồ không giống hệt — nhưng
 * quy tắc suy luận thì giống: resourceType quyết định loại màn, role quyết định phiên bản màn.
 */
export function resolveNotificationRoute(
  n: RoutableNotification,
  role?: UserRole
): string {
  const kind = (n.resourceType ?? "").toUpperCase();
  const id = n.resourceId;
  const isCandidate = role === "CANDIDATE";
  const isHm = role === "HIRING_MANAGER";
  const isHr = !!role && HR_ROLES.includes(role);

  switch (kind) {
    case "INTERVIEW":
      if (isCandidate) return "/(candidate)/interviews";
      if (isHm) return id ? `/(hm)/evaluations/${id}` : "/(hm)/interviews";
      return "/notifications";

    case "OFFER":
      if (isCandidate) return id ? `/(candidate)/offers/${id}` : "/(candidate)/offers";
      if (isHr) return id ? `/(hr)/offers/${id}` : "/(hr)";
      return "/notifications";

    case "APPLICATION":
      if (isCandidate) return id ? `/(candidate)/applications/${id}` : "/(candidate)/applications";
      return id ? `/applications/${id}` : "/notifications";

    case "REQUISITION":
      if (isHr) return id ? `/(hr)/requisitions/${id}` : "/(hr)";
      if (isHm) return id ? `/(hm)/requisitions/${id}` : "/(hm)/requisitions";
      return "/notifications";

    default:
      // Không nhận ra thì về màn thông báo — người dùng vẫn đọc được nội dung,
      // không bao giờ rơi vào màn trắng.
      return "/notifications";
  }
}
```

> **Nhánh `default` không phải cho có.** Backend có 15 `NotificationType` và có thể thêm nữa.
> Push của một loại app chưa biết vẫn phải mở được cái gì đó có nghĩa. Đưa về A4 là lựa chọn
> luôn đúng.
>
> Lưu ý `INTERVIEW` với HM dẫn thẳng tới **form chấm đánh giá** (C4), không phải danh sách. Đó là
> toàn bộ lý do tồn tại của app theo mục 0 của kế hoạch: `EVALUATION_INCOMPLETE_REMINDER` → một
> chạm → đang chấm điểm.

### Bước 14.3 — Nối push vào điều hướng (50 phút)

`src/lib/usePushNavigation.ts`:

```ts
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { resolveNotificationRoute } from "./notificationRoutes";

export function usePushNavigation() {
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    // (1) Push đến lúc app đang chạy → chỉ làm mới dữ liệu, KHÔNG tự nhảy màn.
    //     Kéo người dùng đi khỏi màn họ đang xem là hành vi thù địch.
    const received = Notifications.addNotificationReceivedListener(() => {
      void qc.invalidateQueries();
    });

    // (2) Người dùng CHẠM vào thông báo → lúc này mới điều hướng.
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const route = resolveNotificationRoute(
        {
          type: String(data.type ?? ""),
          resourceType: String(data.resourceType ?? ""),
          resourceId: Number(data.resourceId) || null,
        },
        roleRef.current
      );
      router.push(route as never);
    });

    // (3) App bị giết hẳn, mở lại bằng cách chạm push → không listener nào bắt được,
    //     phải hỏi lại "thông báo nào đã mở app này".
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      router.push(resolveNotificationRoute({
        type: String(data.type ?? ""),
        resourceType: String(data.resourceType ?? ""),
        resourceId: Number(data.resourceId) || null,
      }, roleRef.current) as never);
    });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [router, qc]);
}
```

Thêm refetch khi app quay lại foreground — mục 3 của kế hoạch chọn cách này **thay cho WebSocket**:

`src/lib/useRefetchOnForeground.ts`:

```ts
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

export function useRefetchOnForeground() {
  const qc = useQueryClient();
  const state = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (state.current.match(/inactive|background/) && next === "active") {
        void qc.invalidateQueries();
      }
      state.current = next;
    });
    return () => sub.remove();
  }, [qc]);
}
```

Gắn cả hai vào `AuthGate` trong `app/_layout.tsx`, và đăng ký token sau khi đăng nhập:

```tsx
function AuthGate() {
  const { hydrated, user, hydrate } = useAuthStore();
  usePushNavigation();
  useRefetchOnForeground();

  useEffect(() => { void hydrate(); }, [hydrate]);

  // Đăng ký push token mỗi khi có phiên đăng nhập (kể cả khi khôi phục từ SecureStore),
  // vì token Expo có thể đổi sau khi cập nhật app.
  useEffect(() => {
    if (user) void registerPushToken();
  }, [user?.sub]);

  // ... phần điều hướng giữ nguyên
}
```

### Bước 14.4 — A4 Màn thông báo (60 phút)

`src/features/notifications/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { NotificationResponse } from "@/types/api";

export const notificationsApi = {
  list: () =>
    apiClient.get<NotificationResponse[]>("/notification/notifications").then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notification/notifications/unread-count")
      .then((r) => r.data.count),
  markRead: (id: number) =>
    apiClient.patch(`/notification/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    apiClient.patch("/notification/notifications/read-all").then((r) => r.data),
};
```

`app/notifications.tsx`:

```tsx
export default function NotificationsScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = (query.data ?? []).filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1 }}>
      {unread > 0 ? (
        <View style={styles.bar}>
          <Text variant="bodyMedium">{unread} thông báo chưa đọc</Text>
          <Button
            compact
            onPress={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        </View>
      ) : null}

      <QueryScreen
        query={query}
        scrollable={false}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: "bell-outline",
          title: "Chưa có thông báo nào",
          description: "Thông báo về lịch phỏng vấn, thư mời và công việc cần xử lý sẽ hiện ở đây.",
        }}
      >
        {(items) => (
          <FlatList
            data={items}
            keyExtractor={(n) => String(n.id)}
            refreshControl={
              <RefreshControl refreshing={query.isRefetching}
                              onRefresh={() => void query.refetch()} />
            }
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <List.Item
                title={item.title}
                description={item.message}
                descriptionNumberOfLines={2}
                style={!item.read ? styles.unread : undefined}
                titleStyle={!item.read ? { fontWeight: "700" } : undefined}
                left={(p) => <List.Icon {...p} icon={iconOf(item.resourceType)} />}
                right={() => (
                  <Text variant="bodySmall" style={styles.time}>
                    {formatRelative(item.createdAt)}
                  </Text>
                )}
                onPress={() => {
                  if (!item.read) markRead.mutate(item.id);
                  router.push(resolveNotificationRoute(item, role) as never);
                }}
              />
            )}
          />
        )}
      </QueryScreen>
    </View>
  );
}

const iconOf = (resourceType?: string | null) => {
  switch ((resourceType ?? "").toUpperCase()) {
    case "INTERVIEW": return "calendar-clock";
    case "OFFER": return "email-outline";
    case "APPLICATION": return "file-document-outline";
    case "REQUISITION": return "clipboard-text-outline";
    default: return "bell-outline";
  }
};
```

**Điểm vào A4 cho cả 3 role** — nút chuông kèm badge ở header:

```tsx
// src/components/ui/NotificationBell.tsx
export function NotificationBell() {
  const router = useRouter();
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,       // đỡ phải chờ push để badge đúng
  });

  return (
    <View>
      <IconButton icon="bell-outline" onPress={() => router.push("/notifications")} />
      {count > 0 ? (
        <Badge style={{ position: "absolute", top: 4, right: 4 }}>
          {count > 99 ? "99+" : count}
        </Badge>
      ) : null}
    </View>
  );
}
```

Gắn vào `headerRight` của cả 3 layout role.

### Bước 14.5 — 🎯 DEMO MỐC AN TOÀN (60 phút)

**Đây là bài kiểm tra quan trọng nhất của hai tuần đầu.** Chuẩn bị: điện thoại cài dev build, đăng
nhập tài khoản ứng viên; máy tính mở web với tài khoản HR.

| # | Việc | Làm ở | Kỳ vọng — kiểm cho đủ |
|---|---|---|---|
| 1 | Ứng viên lướt tin, mở job, nộp đơn kèm nguồn tuyển dụng | Điện thoại | Snackbar xanh, đơn hiện ở B3 |
| 2 | HR chuyển hồ sơ qua các giai đoạn tới vòng phỏng vấn | Web | **Điện thoại kêu push** "Cập nhật hồ sơ" |
| 3 | Chạm vào push | Điện thoại | App mở đúng **B4 chi tiết đơn** |
| 4 | HR tạo lịch phỏng vấn, HM xác nhận | Web | **Điện thoại kêu push** "Lịch phỏng vấn đã được chốt" |
| 5 | Chạm push | Điện thoại | Mở **B5**, buổi PV hiện với nút xác nhận |
| 6 | Bấm xác nhận tham dự | Điện thoại | Chip đổi, web thấy `CANDIDATE_CONFIRMED` |
| 7 | HR tạo offer, submit, duyệt | Web | **Điện thoại kêu push** "Thư đề nghị" |
| 8 | Chạm push | Điện thoại | Mở thẳng **B7 chi tiết offer** |
| 9 | Xem PDF | Điện thoại | PDF mở bằng app đọc PDF của máy |
| 10 | Bấm "Đồng ý nhận việc" | Điện thoại | Web: offer `ACCEPTED`, hồ sơ `HIRED` |

**Thêm ba phép thử về push mà dễ quên:**

- [ ] **App đang mở** khi push tới → hiện banner, dữ liệu tự làm mới, **không** tự nhảy màn
- [ ] **App chạy nền** → chạm push → mở đúng màn
- [ ] **App bị giết hẳn** (vuốt khỏi danh sách gần đây) → chạm push → mở app rồi vào đúng màn
      (nhánh `getLastNotificationResponseAsync`)

**Nếu push không tới** — chẩn đoán theo thứ tự này, đừng đoán lung tung:

| Kiểm tra | Cách | Nếu sai |
|---|---|---|
| 1. Có dòng trong `device_token` không? | `SELECT * FROM device_token;` | `registerPushToken` chưa chạy, hoặc quyền bị từ chối |
| 2. Token có dạng đúng không? | Phải là `ExponentPushToken[...]` | Sai `projectId` trong `app.json` |
| 3. Backend có gọi Expo không? | Xem log notification-service | `mobile-push-enabled` đang false, hoặc `tokensOf` trả rỗng |
| 4. Expo có nhận không? | Log `handleReceipts` | Mạng chặn `exp.host` → thử mạng khác |
| 5. Máy có nhận không? | [expo.dev/notifications](https://expo.dev/notifications) gửi thử tay vào token đó | Nhận được ở đây mà không nhận từ backend → lỗi ở backend; không nhận ở đây → lỗi ở máy/quyền |
| 6. Đang dùng Expo Go? | Kiểm tra lại | **Push không chạy trong Expo Go.** Phải là dev build |

### ✅ Định nghĩa "TUẦN 2 đã xong" — MỐC AN TOÀN

- [ ] **8 màn Candidate** (B1–B8) chạy dữ liệu thật, đủ 7 điều kiện mục 11
- [ ] **A4** chạy cho cả 3 role, badge chuông đúng số
- [ ] **4 thay đổi backend** xong, web **không bị ảnh hưởng** (kiểm tra lại chuông web!)
- [ ] **Push tới máy thật** với đủ 3 loại: `APPLICATION_STAGE_CHANGED`,
      `INTERVIEW_HM_CONFIRMED`, `OFFER_READY_FOR_CANDIDATE`
- [ ] **Deep link** mở đúng màn ở cả 3 tình huống (đang mở / chạy nền / bị giết)
- [ ] **Chạy trọn 10 bước demo không vấp**
- [ ] Đã commit cả `mobile/` lẫn `notification-service/`

```powershell
cd E:\ATS
git add mobile notification-service docs/mobile
git commit -m "feat(mobile): tuan 2 - B5-B8, mobile push, deep link, man thong bao"
```

> **Nếu tới cuối ngày 14 mà chưa đạt mốc an toàn, đừng sang tuần 3.** Dùng ngày 15 để dứt điểm.
> Mục 9 của kế hoạch đặt mốc này ở đây chính vì lý do đó: một vòng nghiệp vụ hoàn chỉnh kèm push
> đã đủ làm một bài bảo vệ. Ba màn HR thì không.

---

## Phụ lục — Tra nhanh tuần 2

### Sự thật backend đã dùng trong tuần

| Việc | Sự thật | Nguồn |
|---|---|---|
| Ứng viên thấy buổi PV nào | Từ `HM_CONFIRMED` trở đi, backend lọc sẵn | `InterviewStatus.visibleToCandidate()` |
| `EVALUATION_PENDING` hiện gì với ứng viên | "Đã diễn ra" | Javadoc của `visibleToCandidate()` |
| Upload CV tên trường | `file` | `CandidatePortalController:43` |
| PDF offer | `byte[]`, cần header Authorization | `OfferController:56` |
| Notification deep link | Không có trường riêng — suy từ `resourceType`+`resourceId` | `NotificationResponse.java` |
| Số `NotificationType` | **15** (kế hoạch ghi 14 — đếm lại `NotificationType.java`) | `NotificationType.java` |
| Điểm chèn push | `NotificationService.createAndPush()` | `NotificationService.java` |

### Lỗi hay gặp trong tuần

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| PDF mở ra trang trắng / ký tự rác | Dùng `Linking.openURL`, hoặc không kiểm tra `result.status` | Dùng `downloadAndOpen` |
| Upload CV lỗi 400 | Sai tên trường, hoặc thiếu `type` trong FormData | Tên phải là `file`, object đủ `{uri, name, type}` |
| Upload timeout | Timeout mặc định 15 giây | Đặt `timeout: 60_000` cho request upload |
| Push im lặng trên Android | Chưa tạo notification channel | `setNotificationChannelAsync("default", ...)` |
| Chạm push không mở đúng màn khi app đã bị giết | Thiếu `getLastNotificationResponseAsync` | Thêm nhánh (3) trong `usePushNavigation` |
| `DELETE device-tokens` trả 401 lúc đăng xuất | Xóa access token trước khi gọi | Gọi `unregisterPushToken()` **trước** `signOut()` |
| Web mất thông báo sau khi sửa backend | Lỗi push lan ra ngoài | Kiểm tra try/catch quanh `mobilePushService.send` |

---

**Tiếp theo:** [`MOBILE_WEEK_3.md`](./MOBILE_WEEK_3.md) — 5 màn HM (gồm C4, lý do tồn tại của cả app) và 3 màn HR.
