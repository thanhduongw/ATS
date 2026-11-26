import { useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useMyAccount, useMyProfile, useRequestDeletion, useUploadResume } from "@/features/profile/hooks";
import { useMyOffers } from "@/features/offers/hooks";
import { usePublicCompany } from "@/features/company/hooks";
import { apiErrorMessage } from "@/api/client";
import { CandidateAppBar } from "@/components/app-bar";
import { PageTitle } from "@/components/ui/screen-chrome";
import { Card, CardTitle, IconTile, KeyValueRow } from "@/components/ui/surfaces";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ToneTag } from "@/components/ui/status-chip";
import { Icon, type IconName } from "@/components/ui/icon";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { cvFileName, formatDate, initials } from "@/lib/format";
import { useSignOut } from "@/lib/use-sign-out";
import { ChangePasswordSheet } from "@/features/account/change-password-sheet";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING, STATUS_TONES } from "@/theme";
import type { CandidateSelf } from "@/types/api";

const S = STRINGS.profile;
const MAX_CV_BYTES = 10 * 1024 * 1024;
const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Cá nhân — Redesign-Final `views.profile`: thẻ đầu (ảnh/chữ cái, tên, email, "Ứng viên", % hoàn thiện), thẻ CV,
 * thẻ thông tin cá nhân (KHÔNG còn kỹ năng — chốt 19/11/2026), danh sách liên kết (thư mời, thông báo, quyền riêng tư,
 * đăng xuất). Chỉnh sửa hồ sơ là màn riêng (`/profile-edit`).
 */
export default function ProfileScreen() {
  const profile = useMyProfile();

  return (
    <View style={styles.root}>
      <CandidateAppBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching}
            onRefresh={() => void profile.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <PageTitle eyebrow={S.eyebrow} title={S.title} />
        {profile.isPending ? (
          <SkeletonList count={3} />
        ) : profile.isError ? (
          <ErrorState message={apiErrorMessage(profile.error, "")} onRetry={() => void profile.refetch()} />
        ) : (
          <>
            <IdentityCard profile={profile.data} />
            <CvCard profile={profile.data} />
            <InfoCard profile={profile.data} />
          </>
        )}
        <LinksCard />
        <Footer />
      </ScrollView>
    </View>
  );
}

const editProfile = () => router.push("/profile-edit");

/** Tỉ lệ hoàn thiện: 8 mục có/không (không tính kỹ năng) — đủ để nhắc ứng viên điền nốt, không phải điểm số. */
function completion(p: CandidateSelf): number {
  const checks = [p.fullName, p.phone, p.dateOfBirth, p.gender, p.address, p.currentPosition, p.educationLevelId, p.resumeUploaded];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function IdentityCard({ profile }: { profile: CandidateSelf }) {
  const pct = completion(profile);
  const avatarUrl = useMyAccount().data?.avatarUrl;
  return (
    <Card>
      <View style={styles.identity}>
        {avatarUrl ? (
          <Avatar uri={avatarUrl} name={profile.fullName} size={AVATAR} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.fullName)}</Text>
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={2}>
            {profile.fullName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {profile.email}
          </Text>
          <ToneTag label={S.roleTag} tone="brand" />
        </View>
        <IconButton icon="edit" label={S.editProfile} onPress={editProfile} />
      </View>
      <View style={styles.completionRow}>
        <Text style={styles.completionLabel}>{S.completionTitle}</Text>
        <Text style={styles.completionValue}>{S.completion(pct)}</Text>
      </View>
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.sub}>{pct < 100 ? S.completionHint : S.completionDone}</Text>
    </Card>
  );
}

function CvCard({ profile }: { profile: CandidateSelf }) {
  const notify = useSnackbar();
  const upload = useUploadResume();
  const has = !!profile.resumeUploaded;

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: CV_TYPES, copyToCacheDirectory: true });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    if (asset.size != null && asset.size > MAX_CV_BYTES) return notify(S.cvTooLarge);
    upload.mutate(
      {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        webFile: Platform.OS === "web" ? asset.file : undefined,
      },
      {
        onSuccess: () => notify(S.cvUploaded),
        onError: (e) => notify(apiErrorMessage(e, S.cvFailed)),
      }
    );
  };

  return (
    <Card>
      <CardTitle right={<ToneTag label={has ? S.cvUploadedTag : S.cvMissingTag} tone={has ? "success" : "warning"} />}>
        {S.cv}
      </CardTitle>
      <View style={styles.cvRow}>
        <IconTile icon="file" tone={has ? "brand" : "neutral"} size={SIZES.iconButton} />
        <View style={styles.flex}>
          <Text style={styles.cvName} numberOfLines={1}>
            {has ? cvFileName(profile.resumeUrl) : S.uploadCv}
          </Text>
          <Text style={styles.sub}>
            {has ? (profile.resumeUploadedAt ? S.cvUpdatedOn(formatDate(profile.resumeUploadedAt)) : S.cvInUse) : S.noCvHint}
          </Text>
        </View>
        <PillButton
          label={has ? S.replaceCv : S.uploadCv}
          variant={has ? "tonal" : "primary"}
          size="sm"
          loading={upload.isPending}
          onPress={() => void pick()}
        />
      </View>
    </Card>
  );
}

function InfoCard({ profile }: { profile: CandidateSelf }) {
  const gender = profile.gender?.toUpperCase() as keyof typeof S.genders | undefined;
  const rows: [string, string | undefined][] = [
    [S.fullName, profile.fullName],
    [S.phone, profile.phone],
    [S.dateOfBirth, profile.dateOfBirth ? formatDate(profile.dateOfBirth) : undefined],
    [S.gender, gender ? (S.genders[gender] ?? profile.gender) : undefined],
    [S.address, profile.address],
    [S.currentPosition, profile.currentPosition],
    [S.education, profile.educationLevelName],
  ];

  return (
    <Card style={styles.infoCard}>
      <CardTitle right={<PillButton label={S.edit} variant="text" size="sm" onPress={editProfile} />}>{S.info}</CardTitle>
      <View>
        {rows.map(([label, value], i) => (
          <KeyValueRow
            key={label}
            label={label}
            value={value ? value : <Text style={styles.notSet}>{S.notSet}</Text>}
            last={i === rows.length - 1}
          />
        ))}
      </View>
    </Card>
  );
}

function LinksCard() {
  const offers = useMyOffers();
  const signOut = useSignOut();
  const [deleting, setDeleting] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const list = offers.data ?? [];
  const awaiting = list.filter((o) => o.status === "APPROVED").length;

  return (
    <>
      <Card style={styles.linksCard}>
        <LinkRow
          icon="mail"
          label={S.offers}
          subtitle={awaiting ? S.offersAwaiting(awaiting) : S.offersCount(list.length)}
          count={awaiting}
          onPress={() => router.push("/offers")}
        />
        <LinkRow icon="bell" label={S.notifications} subtitle={S.notificationsSub} onPress={() => router.push("/notifications")} />
        <LinkRow icon="lock" label={S.changePassword} subtitle={S.changePasswordSub} onPress={() => setChangingPw(true)} />
        <LinkRow icon="lock" label={S.privacy} subtitle={S.privacySub} onPress={() => setDeleting(true)} />
        <LinkRow icon="logout" label={S.signOut} subtitle={S.signOutSub} danger last onPress={() => void signOut()} />
      </Card>
      <DeleteProfileSheet visible={deleting} onDismiss={() => setDeleting(false)} />
      <ChangePasswordSheet visible={changingPw} onDismiss={() => setChangingPw(false)} />
    </>
  );
}

function Footer() {
  const company = usePublicCompany();
  return <Text style={styles.footer}>{S.footer(company.data?.name?.trim() || STRINGS.brand.name)}</Text>;
}

/**
 * Xóa hồ sơ ứng viên. Backend XÓA MỀM NGAY (`deletedAt = now`), không hoàn tác — nên phải tích
 * ô xác nhận mới bấm được, và đăng xuất ngay sau khi xóa.
 */
function DeleteProfileSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const notify = useSnackbar();
  const remove = useRequestDeletion();
  const signOut = useSignOut();
  const [agreed, setAgreed] = useState(false);

  const close = () => {
    setAgreed(false);
    onDismiss();
  };

  return (
    <BottomSheet
      visible={visible}
      onDismiss={close}
      title={S.deleteTitle}
      footer={
        <PillButton
          label={S.deleteConfirm}
          variant="danger"
          fullWidth
          disabled={!agreed}
          loading={remove.isPending}
          onPress={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                close();
                notify(S.deleted);
                void signOut();
              },
              onError: (e) => notify(apiErrorMessage(e, S.deleteFailed)),
            })
          }
        />
      }
    >
      <Text style={styles.body}>{S.deleteMessage}</Text>
      <Checkbox checked={agreed} onChange={setAgreed} label={S.deleteAgree} />
    </BottomSheet>
  );
}

function LinkRow({
  icon,
  label,
  subtitle,
  count,
  danger,
  last,
  onPress,
}: {
  icon: IconName;
  label: string;
  subtitle?: string;
  count?: number;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label} (${count})` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, !last && styles.divider, pressed && styles.pressed]}
    >
      <View style={[styles.linkIcon, danger && styles.linkIconDanger]}>
        <Icon name={icon} size={SIZES.iconSm} color={danger ? COLORS.errorText : COLORS.primaryDark} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.linkLabel, danger && styles.danger]}>{label}</Text>
        {subtitle ? <Text style={styles.small}>{subtitle}</Text> : null}
      </View>
      {count ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
      <Icon name="chevronRight" size={SIZES.iconSm} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const AVATAR = SIZES.otpHeight;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, paddingBottom: SPACING.xl, gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  small: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  identity: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  // `.profilehead .avatar`: ô vuông bo lớn, chữ cái đầu màu thương hiệu.
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADIUS.hero,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.section, color: COLORS.primaryDark },
  name: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  completionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.xs },
  completionLabel: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary },
  completionValue: { fontFamily: FONT.bold, fontSize: FONT_SIZE.caption, color: COLORS.primary },
  progressTrack: { height: SIZES.progress, borderRadius: RADIUS.full, backgroundColor: COLORS.fillStrong },
  progressFill: { height: "100%", borderRadius: RADIUS.full, backgroundColor: COLORS.primary },

  cvRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  cvName: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },

  infoCard: { gap: 0 },
  notSet: { fontFamily: FONT.regular, fontSize: FONT_SIZE.md, color: COLORS.textMuted },

  linksCard: { paddingVertical: SPACING.xs, gap: 0 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.sm2 },
  divider: { borderBottomWidth: SIZES.hairline, borderBottomColor: COLORS.divider },
  pressed: { opacity: 0.7 },
  linkIcon: {
    width: SIZES.iconButton - SPACING.xs,
    height: SIZES.iconButton - SPACING.xs,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkIconDanger: { backgroundColor: STATUS_TONES.danger.bg },
  linkLabel: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  danger: { color: COLORS.errorText },
  count: {
    minWidth: SIZES.tag,
    height: SIZES.tag,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.errorText,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.xs, color: COLORS.textOnPrimary },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  footer: { textAlign: "center", fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, paddingTop: SPACING.xs },
});
