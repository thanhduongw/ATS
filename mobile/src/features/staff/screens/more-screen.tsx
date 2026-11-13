import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/buttons";
import { Icon, type IconName } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card } from "@/components/ui/surfaces";
import { WEB_URL } from "@/config";
import { useUnreadCount } from "@/features/notifications/hooks";
import { STRINGS } from "@/lib/strings";
import { useSignOut } from "@/lib/use-sign-out";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import { useCompanyName, useMe, useMyId, useStaffOffers, useStaffPostings, useStaffRequisitions } from "../hooks";
import { areaOf } from "../tasks";

const S = STRINGS.staff;
const L = S.more;

/**
 * UR10 / UH09 · MÀN CHÍNH · Thêm. Chuyên viên tuyển dụng: Yêu cầu tuyển dụng (số chờ duyệt), Thư mời (nháp ·
 * chờ phản hồi). Đại diện phòng ban: Yêu cầu tuyển dụng (cần sửa · bản nháp), Kết quả tuyển dụng (vị trí của
 * phòng). Chung: Tài khoản & cài đặt · Mở bản web (tạo tin, lên lịch, soạn thư mời làm trên máy tính) · Đăng xuất.
 */
export function StaffMoreScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const unread = useUnreadCount();
  const profile = useMe();
  const company = useCompanyName();
  const reqs = useStaffRequisitions();
  const offers = useStaffOffers({ enabled: isHr });
  const postings = useStaffPostings();
  const signOut = useSignOut();

  const reqList = reqs.data ?? [];
  const pending = reqList.filter((r) => r.status === "PENDING_APPROVAL").length;
  const mineReqs = reqList.filter((r) => r.requesterId === me);
  const fix = mineReqs.filter((r) => r.status === "CHANGES_REQUESTED").length;
  const draft = mineReqs.filter((r) => r.status === "DRAFT").length;
  const offerList = offers.data ?? [];
  const offerDraft = offerList.filter((o) => o.status === "DRAFT").length;
  const offerWaiting = offerList.filter((o) => o.status === "APPROVED").length;
  const openPostings = (postings.data ?? []).filter((p) => p.status === "OPEN");
  const dept = openPostings.find((p) => p.departmentName)?.departmentName ?? "";
  const roleName = role ? STRINGS.roles[role] : "";

  return (
    <>
      <ScreenHeader
        title={L.title}
        actions={<IconButton icon="bell" label={S.bell} badge={unread} onPress={() => router.push(`/${area}/notifications`)} />}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.profile}>
            <Avatar name={profile.data?.fullName} size={SIZES.iconTile + SPACING.sm} />
            <View style={styles.flex}>
              <Text style={styles.name}>{profile.data?.fullName ?? ""}</Text>
              <Text style={styles.sub}>{L.roleAt(roleName, isHr ? (company.data ?? "") : dept)}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.section}>{L.features}</Text>
        <Card>
          <Row icon="document" title={L.requisitions} sub={isHr ? L.reqPending(pending) : L.reqHm(fix, draft)}
            onPress={() => router.push(`/${area}/requisitions` as Href)} />
          {isHr ? (
            <Row icon="mail" title={L.offers} sub={L.offersSub(offerDraft, offerWaiting)} last
              onPress={() => router.push("/hr/offers" as Href)} />
          ) : (
            <Row icon="clipboardCheck" title={L.results} sub={L.resultsSub(openPostings.length, dept)} last
              onPress={() => router.push("/hm/results" as Href)} />
          )}
        </Card>

        <Text style={styles.section}>{L.other}</Text>
        <Card>
          <Row icon="settings" title={L.settings} sub={L.settingsSub} onPress={() => router.push(`/${area}/settings` as Href)} />
          {WEB_URL ? (
            <Row icon="link" title={L.web} sub={L.webSub} onPress={() => void Linking.openURL(WEB_URL)} />
          ) : null}
          <Row icon="logout" title={L.signOut} danger last onPress={() => void signOut()} />
        </Card>
      </ScrollView>
    </>
  );
}

function Row({ icon, title, sub, onPress, last, danger }: {
  icon: IconName; title: string; sub?: string; onPress: () => void; last?: boolean; danger?: boolean;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      <Icon name={icon} color={danger ? COLORS.errorText : COLORS.textSecondary} />
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, danger && styles.danger]}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {!danger ? <Icon name="chevronRight" size={FONT_SIZE.md} color={COLORS.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  profile: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  section: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.sm2 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  pressed: { opacity: 0.7 },
  rowTitle: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  danger: { color: COLORS.errorText },
});
