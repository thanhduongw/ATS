import { useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useMyProfile, useRequestDeletion, useUploadResume } from "@/features/profile/hooks";
import { EditProfileSheet } from "@/features/profile/edit-profile-sheet";
import { useMyOffers } from "@/features/offers/hooks";
import { apiErrorMessage } from "@/api/client";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, IconTile, KeyValueRow } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon, type IconName } from "@/components/ui/icon";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { cvFileName, formatDate, initials } from "@/lib/format";
import { useSignOut } from "@/lib/use-sign-out";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateSelf } from "@/types/api";

const S = STRINGS.profile;
const MAX_CV_BYTES = 10 * 1024 * 1024;
const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Tôi — hồ sơ & CV (B8), giao diện canvas Mobile v2 N35. */
export default function ProfileScreen() {
  const profile = useMyProfile();
  const [editing, setEditing] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader title={S.title} />
      {profile.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={3} />
        </View>
      ) : profile.isError ? (
        <ErrorState message={apiErrorMessage(profile.error, "")} onRetry={() => void profile.refetch()} />
      ) : (
        <>
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
            <IdentityCard profile={profile.data} />
            <CvCard profile={profile.data} />
            <InfoCard profile={profile.data} onEdit={() => setEditing(true)} />
            <LinksCard />
          </ScrollView>
          <EditProfileSheet visible={editing} onDismiss={() => setEditing(false)} profile={profile.data} />
        </>
      )}
    </View>
  );
}

/** Tỉ lệ hoàn thiện: 9 mục có/không — đủ để nhắc ứng viên điền nốt, không phải điểm số. */
function completion(p: CandidateSelf): number {
  const checks = [
    p.fullName,
    p.phone,
    p.dateOfBirth,
    p.gender,
    p.address,
    p.currentPosition,
    p.educationLevelId,
    p.skillNames?.length,
    p.resumeUploaded,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function IdentityCard({ profile }: { profile: CandidateSelf }) {
  const pct = completion(profile);
  return (
    <Card>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile.fullName)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.sub}>{profile.email}</Text>
        </View>
      </View>
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.sub}>{S.completion(pct)}</Text>
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
      <CardTitle>{S.cv}</CardTitle>
      <View style={styles.cvRow}>
        <IconTile icon="file" tone={has ? "brand" : "neutral"} />
        <View style={styles.flex}>
          <Text style={styles.cvName} numberOfLines={1}>
            {has ? cvFileName(profile.resumeUrl) : S.noCv}
          </Text>
          <Text style={styles.sub}>{has ? S.cvInUse : S.noCvHint}</Text>
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

function InfoCard({ profile, onEdit }: { profile: CandidateSelf; onEdit: () => void }) {
  const gender = profile.gender?.toUpperCase() as keyof typeof S.genders | undefined;
  const rows: [string, string | undefined][] = [
    [S.phone, profile.phone],
    [S.dateOfBirth, profile.dateOfBirth ? formatDate(profile.dateOfBirth) : undefined],
    [S.gender, gender ? (S.genders[gender] ?? profile.gender) : undefined],
    [S.currentPosition, profile.currentPosition],
    [S.address, profile.address],
    [S.education, profile.educationLevelName],
    [S.skills, profile.skillNames?.length ? profile.skillNames.join(", ") : undefined],
  ];

  return (
    <Card style={styles.infoCard}>
      <CardTitle right={<PillButton label={S.edit} icon="edit" variant="text" size="sm" onPress={onEdit} />}>
        {S.info}
      </CardTitle>
      <View>
        {rows.map(([label, value], i) => (
          <KeyValueRow
            key={label}
            label={label}
            value={
              value ? (
                value
              ) : (
                <Text style={styles.notSet}>{S.notSet}</Text>
              )
            }
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
  const awaiting = (offers.data ?? []).filter((o) => o.status === "APPROVED").length;

  return (
    <>
      <Card style={styles.linksCard}>
        <LinkRow icon="mail" label={S.offers} count={awaiting} onPress={() => router.push("/offers")} />
        <LinkRow icon="lock" label={S.privacy} onPress={() => setDeleting(true)} />
        <LinkRow icon="logout" label={S.signOut} danger last onPress={() => void signOut()} />
      </Card>
      <DeleteProfileSheet visible={deleting} onDismiss={() => setDeleting(false)} />
    </>
  );
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
  count,
  danger,
  last,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const color = danger ? COLORS.errorText : COLORS.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label} (${count})` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, !last && styles.divider, pressed && styles.pressed]}
    >
      <Icon name={icon} color={color} />
      <Text style={[styles.linkLabel, { color }]}>{label}</Text>
      {count ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
      {!danger ? <Icon name="chevronRight" size={SIZES.iconSm} color={COLORS.textSecondary} /> : null}
    </Pressable>
  );
}

const AVATAR = SIZES.otpHeight;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, paddingBottom: SPACING.lg, gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },

  identity: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h3, color: COLORS.primaryDark },
  name: { fontFamily: FONT.bold, fontSize: FONT_SIZE.section, color: COLORS.textPrimary },
  progressTrack: { height: SIZES.progress, borderRadius: RADIUS.full, backgroundColor: COLORS.fillStrong },
  progressFill: { height: "100%", borderRadius: RADIUS.full, backgroundColor: COLORS.primary },

  cvRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  cvName: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },

  infoCard: { gap: 0 },
  notSet: { fontFamily: FONT.regular, fontSize: FONT_SIZE.md, color: COLORS.textMuted },

  linksCard: { paddingVertical: SPACING.xs, gap: 0 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
    minHeight: SIZES.control + SPACING.sm,
  },
  divider: { borderBottomWidth: SIZES.hairline, borderBottomColor: COLORS.divider },
  pressed: { opacity: 0.7 },
  linkLabel: { flex: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.lg },
  count: {
    minWidth: SIZES.tag,
    height: SIZES.tag,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  countText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.xs, color: COLORS.primaryDark },
});
