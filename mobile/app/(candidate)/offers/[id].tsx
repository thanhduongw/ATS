import { useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAcceptOffer, useDeclineOffer, useDownloadOfferPdf, useMyOffer } from "@/features/offers/hooks";
import { useRejectionReasons } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, Divider, Eyebrow, KeyValueRow } from "@/components/ui/surfaces";
import { StatusChip, ToneTag } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { RadioList } from "@/components/ui/radio-list";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { FormTextField } from "@/components/form-text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { STRINGS } from "@/lib/strings";
import { offerStatus } from "@/lib/status";
import { formatCountdown, formatDate, formatMoney } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LETTER_SPACING, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateOffer } from "@/types/api";

const S = STRINGS.offerDetail;

const declineSchema = z.object({
  declineReasonId: z.number({ error: S.reasonRequired }).int().positive(S.reasonRequired),
  note: z.string().trim().max(500).optional(),
});
type DeclineValues = z.infer<typeof declineSchema>;

/**
 * Chi tiết thư mời — Redesign-Final `views.offerDetail`: khối đầu (vị trí, hợp đồng · ngày bắt đầu, trạng thái), thẻ
 * "Đề nghị thu nhập" (lương lớn + các điều khoản), quyền lợi & ghi chú, thẻ thời hạn phản hồi kèm nút tải PDF; dưới đáy
 * "Từ chối" · "Chấp nhận thư mời". Bản HTML hỏi lại bằng `confirm()` — app thay bằng ô "Tôi đồng ý…" (cấm confirm()).
 */
export default function OfferDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const offer = useMyOffer(id);
  const insets = useSafeAreaInsets();
  const awaiting = offer.data?.status === "APPROVED";
  // Trạng thái ô đồng ý: là bước xác nhận của giao diện, không phải dữ liệu gửi lên backend.
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.title} />
      {offer.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : offer.isError ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(offer.error, "")} onRetry={() => void offer.refetch()} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + (awaiting ? BOTTOM_BAR_SPACE : SPACING.xl) },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={offer.isRefetching}
                onRefresh={() => void offer.refetch()}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            <OfferBody offer={offer.data} />
            {awaiting ? (
              <Card>
                <CardTitle>{S.confirmTitle}</CardTitle>
                <Checkbox checked={agreed} onChange={setAgreed} label={S.agree} />
              </Card>
            ) : null}
          </ScrollView>
          {awaiting ? <RespondBar offerId={id} agreed={agreed} jobTitle={offer.data.jobTitle ?? ""} /> : null}
        </>
      )}
    </View>
  );
}

function OfferBody({ offer }: { offer: CandidateOffer }) {
  const notify = useSnackbar();
  const pdf = useDownloadOfferPdf();
  const awaiting = offer.status === "APPROVED";
  const countdown = formatCountdown(offer.responseDeadline);
  // Phúc lợi là văn bản tự do (HR gõ, cách nhau bằng xuống dòng, ";" hoặc "·") → gạch đầu dòng.
  // Không tách theo dấu phẩy: phẩy nằm ngay trong một ý ("Bảo hiểm xã hội, y tế").
  const benefits = (offer.benefits ?? "")
    .split(/\r?\n|;|·/)
    .map((b) => b.replace(/^[-•*+]\s*/, "").trim())
    .filter(Boolean);
  const terms: [string, string | null][] = [
    [S.contract, offer.contractTypeName ?? null],
    [S.probation, offer.probationMonths != null ? S.probationMonths(offer.probationMonths) : null],
    [S.startDate, offer.startDate ? formatDate(offer.startDate) : null],
    // Giờ có mặt ngày đầu tiên do HR nhập (không bắt buộc).
    [S.startTime, offer.startTime ? offer.startTime.slice(0, 5) : null],
    [S.allowance, offer.allowance ? `${formatMoney(offer.allowance)}${S.perMonth}` : null],
  ];
  const shownTerms = terms.filter((t): t is [string, string] => !!t[1]);

  const onPdf = () => {
    if (Platform.OS === "web") return notify(S.pdfWebUnsupported);
    if (offer.id == null) return;
    pdf.mutate(offer.id, {
      onSuccess: (uri) =>
        void Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" }).catch(() =>
          notify(S.pdfFailed)
        ),
      onError: (e) => notify(apiErrorMessage(e, S.pdfFailed)),
    });
  };

  return (
    <>
      {/* `.offerbanner`: nền phớt màu thương hiệu. */}
      <View style={styles.banner}>
        <Eyebrow tone="brand">{S.bannerKicker}</Eyebrow>
        <Text style={styles.bannerTitle} accessibilityRole="header">
          {offer.jobTitle}
        </Text>
        <Text style={styles.sub}>
          {[offer.contractTypeName, offer.startDate ? S.startOn(formatDate(offer.startDate)) : S.startTbd]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <StatusChip {...offerStatus(offer.status, "CANDIDATE")} />
      </View>

      <Card style={styles.terms}>
        <Eyebrow>{S.incomeKicker}</Eyebrow>
        <Text style={styles.money}>
          {offer.salaryOffered != null ? `${formatMoney(offer.salaryOffered)}${S.perMonth}` : STRINGS.offers.negotiable}
        </Text>
        {shownTerms.length ? (
          <>
            <Divider />
            <View>
              {shownTerms.map(([label, value], i) => (
                <KeyValueRow key={label} label={label} value={value} last={i === shownTerms.length - 1} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      {benefits.length || offer.candidateVisibleNote ? (
        <Card>
          <CardTitle>{S.benefitsNote}</CardTitle>
          {benefits.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={[styles.body, styles.flex]}>{b}</Text>
            </View>
          ))}
          {offer.candidateVisibleNote ? <Text style={styles.body}>{offer.candidateVisibleNote}</Text> : null}
        </Card>
      ) : null}

      {offer.status === "DECLINED" && (offer.declineReasonName || offer.declineNote) ? (
        <Card>
          <CardTitle>{S.declinedReason}</CardTitle>
          {offer.declineReasonName ? <Text style={styles.body}>{offer.declineReasonName}</Text> : null}
          {offer.declineNote ? <Text style={styles.sub}>{offer.declineNote}</Text> : null}
        </Card>
      ) : null}

      <Card>
        <CardTitle
          right={
            <ToneTag
              label={
                offer.responseDeadline
                  ? awaiting
                    ? countdown
                      ? S.deadlineLeft(countdown)
                      : S.expired
                    : formatDate(offer.responseDeadline)
                  : S.deadlineHr
              }
              tone={awaiting && offer.responseDeadline && !countdown ? "neutral" : "warning"}
            />
          }
        >
          {S.deadlineTitle}
        </CardTitle>
        <Text style={styles.sub}>{S.deadlineNote}</Text>
        <PillButton
          label={S.downloadPdf}
          icon="download"
          variant="outline"
          size="sm"
          fullWidth
          loading={pdf.isPending}
          onPress={onPdf}
        />
      </Card>
    </>
  );
}

/**
 * Thanh "Từ chối / Chấp nhận thư mời" dính đáy. Cả hai không hoàn tác được:
 * - Chấp nhận: phải tích "Tôi đồng ý…" trước; xong chuyển sang màn chúc mừng.
 * - Từ chối: mở sheet chọn lý do (danh mục lý do từ chối của công ty, giống web) + ghi chú.
 */
function RespondBar({ offerId, agreed, jobTitle }: { offerId: number; agreed: boolean; jobTitle: string }) {
  const notify = useSnackbar();
  const accept = useAcceptOffer();
  const decline = useDeclineOffer();
  const reasons = useRejectionReasons();
  const [sheet, setSheet] = useState<"decline" | null>(null);

  const { control, handleSubmit, setValue, reset, formState } = useForm<DeclineValues>({
    resolver: zodResolver(declineSchema),
    defaultValues: { note: "" },
  });
  const reasonId = useWatch({ control, name: "declineReasonId" });

  const close = () => {
    setSheet(null);
    reset({ note: "" });
  };

  const onAccept = () => {
    if (!agreed) return notify(S.agreeRequired);
    accept.mutate(offerId, {
      onSuccess: () =>
        router.replace({ pathname: "/offers/welcome", params: { offerId: String(offerId), job: jobTitle } }),
      onError: (e) => notify(apiErrorMessage(e, S.failed)),
    });
  };

  const onDecline = handleSubmit((v) =>
    decline.mutate(
      { id: offerId, body: { declineReasonId: v.declineReasonId, note: v.note || undefined } },
      {
        onSuccess: () => {
          close();
          notify(S.declined);
          router.back();
        },
        onError: (e) => notify(apiErrorMessage(e, S.failed)),
      }
    )
  );

  return (
    <>
      <BottomActionBar>
        <PillButton label={S.decline} variant="danger" onPress={() => setSheet("decline")} />
        <PillButton
          label={S.acceptSign}
          style={styles.flex}
          fullWidth
          // Mờ khi chưa tích đồng ý nhưng vẫn bấm được để báo lý do (onAccept tự kiểm tra).
          variant={agreed ? "primary" : "tonal"}
          loading={accept.isPending}
          onPress={onAccept}
        />
      </BottomActionBar>

      <BottomSheet
        visible={sheet === "decline"}
        onDismiss={close}
        title={S.declineTitle}
        subtitle={S.declineMessage}
        footer={
          <PillButton label={S.declineConfirm} variant="danger" fullWidth loading={decline.isPending} onPress={onDecline} />
        }
      >
        <Text style={styles.fieldLabel}>{S.reason}</Text>
        <RadioList
          options={(reasons.data ?? []).map((r) => ({ id: r.id!, label: r.name ?? "" }))}
          value={reasonId}
          onChange={(rid) => setValue("declineReasonId", rid, { shouldValidate: true })}
          loading={reasons.isPending}
          error={reasons.isError}
          errorText={S.reasonsError}
          onRetry={() => void reasons.refetch()}
        />
        {formState.errors.declineReasonId ? (
          <Text style={styles.error}>{formState.errors.declineReasonId.message}</Text>
        ) : null}
        <FormTextField control={control} name="note" label={S.declineNote} multiline maxLength={500} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  flex: { flex: 1 },

  banner: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: SIZES.border,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryFaint,
  },
  bannerTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    lineHeight: FONT_SIZE.h3 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  terms: { gap: SPACING.sm },
  money: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    letterSpacing: LETTER_SPACING.title,
    color: COLORS.primary,
  },
  bulletRow: { flexDirection: "row", gap: SPACING.sm2 },
  bulletDot: {
    width: SIZES.dot,
    height: SIZES.dot,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: (FONT_SIZE.base * LINE_HEIGHT.body - SIZES.dot) / 2,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  fieldLabel: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
});
