import { useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useAcceptOffer,
  useDeclineOffer,
  useDownloadOfferPdf,
  useMyOffer,
} from "@/features/offers/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { useRejectionReasons } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { BrandMark, Card, CardTitle, KeyValueRow } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { RadioList } from "@/components/ui/radio-list";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { FormTextField } from "@/components/form-text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { STRINGS } from "@/lib/strings";
import { offerStatus } from "@/lib/status";
import { formatCountdown, formatDate, formatMoney } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from "@/theme";
import type { CandidateOffer } from "@/types/api";

const S = STRINGS.offerDetail;

const declineSchema = z.object({
  declineReasonId: z.number({ error: S.reasonRequired }).int().positive(S.reasonRequired),
  note: z.string().trim().max(500).optional(),
});
type DeclineValues = z.infer<typeof declineSchema>;

/**
 * Thư mời nhận việc (B7) — giao diện canvas Mobile v2 N34: xem đề nghị, tải PDF, chấp nhận hoặc
 * từ chối có lý do. Canvas có ô chữ ký điện tử — backend không có, nên chỉ giữ ô "Tôi đồng ý…"
 * làm bước xác nhận trước khi chấp nhận (không hoàn tác được).
 */
export default function OfferDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const offer = useMyOffer(id);
  const notify = useSnackbar();
  const pdf = useDownloadOfferPdf();
  const insets = useSafeAreaInsets();

  const onPdf = () => {
    if (Platform.OS === "web") return notify(S.pdfWebUnsupported);
    pdf.mutate(id, {
      onSuccess: (uri) =>
        void Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" }).catch(() =>
          notify(S.pdfFailed)
        ),
      onError: (e) => notify(apiErrorMessage(e, S.pdfFailed)),
    });
  };

  const awaiting = offer.data?.status === "APPROVED";
  // Trạng thái ô đồng ý: là bước xác nhận của giao diện, không phải dữ liệu gửi lên backend.
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader
        variant="compact"
        back
        title={S.title}
        actions={offer.data ? <IconButton icon="download" label={S.downloadPdf} onPress={onPdf} /> : undefined}
      />
      {offer.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : offer.isError ? (
        <ErrorState message={apiErrorMessage(offer.error, "")} onRetry={() => void offer.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + (awaiting ? BOTTOM_BAR_SPACE : SPACING.lg) },
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
          {awaiting ? (
            <RespondBar offerId={id} agreed={agreed} jobTitle={offer.data.jobTitle ?? ""} />
          ) : null}
        </>
      )}
    </View>
  );
}

function OfferBody({ offer }: { offer: CandidateOffer }) {
  const profile = useMyProfile();
  const name = (profile.data?.fullName ?? offer.candidateName ?? "").trim().split(/\s+/).slice(-2).join(" ");
  const awaiting = offer.status === "APPROVED";
  const countdown = formatCountdown(offer.responseDeadline);
  // Phúc lợi là văn bản tự do (HR gõ, cách nhau bằng xuống dòng, ";" hoặc "·") → gạch đầu dòng.
  // Không tách theo dấu phẩy: phẩy nằm ngay trong một ý ("Bảo hiểm xã hội, y tế").
  const benefits = (offer.benefits ?? "")
    .split(/\r?\n|;|·/)
    .map((b) => b.replace(/^[-•*+]\s*/, "").trim())
    .filter(Boolean);

  return (
    <>
      <Card style={styles.hero}>
        <View style={styles.heroHead}>
          <BrandMark />
          <StatusChip {...offerStatus(offer.status, "CANDIDATE")} />
        </View>
        <Text style={styles.congrats}>{S.congrats(name)}</Text>
        <Text style={styles.intro}>{S.intro(offer.jobTitle ?? "")}</Text>
        {awaiting && offer.responseDeadline ? (
          <View style={[styles.countdown, !countdown && styles.countdownExpired]}>
            <Text style={[styles.countdownValue, !countdown && styles.countdownExpiredText]}>
              {countdown ? S.deadlineLeft(countdown) : S.expired}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.detailCard}>
        <CardTitle>{S.details}</CardTitle>
        <View>
          <KeyValueRow label={S.salary} value={`${formatMoney(offer.salaryOffered)}${S.perMonth}`} />
          {offer.contractTypeName ? <KeyValueRow label={S.contract} value={offer.contractTypeName} /> : null}
          <KeyValueRow label={S.startDate} value={formatDate(offer.startDate)} />
          {offer.probationMonths != null ? (
            <KeyValueRow label={S.probation} value={S.probationMonths(offer.probationMonths)} />
          ) : null}
          {offer.allowance ? (
            <KeyValueRow label={S.allowance} value={`${formatMoney(offer.allowance)}${S.perMonth}`} last={!benefits.length} />
          ) : null}
          {benefits.length ? (
            <View style={styles.benefits}>
              <Text style={styles.benefitsLabel}>{S.benefits}</Text>
              {benefits.map((b) => (
                <View key={b} style={styles.bulletRow}>
                  <Text style={styles.body}>•</Text>
                  <Text style={[styles.body, styles.flex]}>{b}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Card>

      {offer.candidateVisibleNote ? (
        <Card>
          <CardTitle>{S.note}</CardTitle>
          <Text style={styles.body}>{offer.candidateVisibleNote}</Text>
        </Card>
      ) : null}

      {offer.status === "DECLINED" && (offer.declineReasonName || offer.declineNote) ? (
        <Card>
          <CardTitle>{S.declinedReason}</CardTitle>
          {offer.declineReasonName ? <Text style={styles.body}>{offer.declineReasonName}</Text> : null}
          {offer.declineNote ? <Text style={styles.muted}>{offer.declineNote}</Text> : null}
        </Card>
      ) : null}
    </>
  );
}

/**
 * Thanh "Từ chối / Chấp nhận" dính đáy (canvas N34). Cả hai không hoàn tác được:
 * - Chấp nhận: phải tích "Tôi đồng ý…" trước; xong chuyển sang màn chào mừng (N36).
 * - Từ chối: mở sheet bắt buộc chọn lý do (`declineReasonId` @NotNull).
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
        <PillButton label={S.decline} variant="danger" style={styles.flex} fullWidth onPress={() => setSheet("decline")} />
        <PillButton
          label={S.acceptSign}
          icon="check"
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

  hero: { padding: SPACING.md2 },
  heroHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  congrats: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h2, color: COLORS.textPrimary },
  intro: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm2,
    paddingHorizontal: SPACING.sm2 + SPACING.xxs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft,
  },
  countdownValue: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.primaryDark },
  countdownExpired: { backgroundColor: COLORS.fill },
  countdownExpiredText: { color: COLORS.textSecondary },
  bulletRow: { flexDirection: "row", gap: SPACING.sm },

  detailCard: { gap: 0 },
  benefits: { gap: SPACING.sm, paddingTop: SPACING.sm2 },
  benefitsLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },

  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  muted: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  fieldLabel: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
});
