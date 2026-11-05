import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { PillButton } from "@/components/ui/buttons";
import { useSnackbar } from "@/components/ui/snackbar";
import { apiErrorMessage } from "@/api/client";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { SPACING } from "@/theme";
import type { CandidateInterview } from "@/types/api";
import { DeclineInterviewSheet } from "./decline-sheet";
import { useConfirmInterview } from "./hooks";

const S = STRINGS.interviews;

/**
 * Nút hành động của một buổi phỏng vấn phía ứng viên (UC08, M09) — lịch 1 giờ cố định (04/11/2026):
 * - phòng ban đã chốt giờ, ứng viên chưa trả lời → "Từ chối" · "Đồng ý"
 * - đã đồng ý, chưa tới giờ → "Từ chối" (bận đột xuất) · "Vào phòng" nếu họp trực tuyến
 * Không có gì để làm thì không vẽ gì.
 */
export function InterviewAction({
  interview,
  size = "sm",
  fullWidth,
}: {
  interview: CandidateInterview;
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const notify = useSnackbar();
  const confirm = useConfirmInterview();
  const now = useNow();
  const [declining, setDeclining] = useState(false);

  const id = interview.id;
  const future = new Date(interview.scheduledAt ?? 0).getTime() > now;
  const waiting = interview.status === "HM_CONFIRMED";
  const accepted = interview.status === "CANDIDATE_CONFIRMED";
  const link = accepted && interview.format === "ONLINE" ? interview.meetingLink : undefined;
  if (id == null || (!waiting && !(accepted && (future || link)))) return null;

  const grow = fullWidth ? styles.grow : undefined;
  return (
    <View style={[styles.row, fullWidth && styles.full]}>
      {(waiting || accepted) && future ? (
        <PillButton label={S.decline.action} variant="danger" size={size} style={grow} onPress={() => setDeclining(true)} />
      ) : null}
      {waiting ? (
        <PillButton
          label={S.confirm}
          size={size}
          style={grow}
          loading={confirm.isPending}
          onPress={() =>
            confirm.mutate(id, {
              onSuccess: () => notify(S.confirmed),
              onError: (e) => notify(apiErrorMessage(e, S.confirmFailed)),
            })
          }
        />
      ) : link ? (
        <PillButton
          label={S.openMeeting}
          icon={size === "md" ? "video" : undefined}
          variant={size === "md" ? "primary" : "tonal"}
          size={size}
          style={grow}
          onPress={() => Linking.openURL(link).catch(() => notify(S.meetingFailed))}
        />
      ) : null}
      {interview.applicationId != null ? (
        <DeclineInterviewSheet
          visible={declining}
          onDismiss={() => setDeclining(false)}
          interviewId={id}
          applicationId={interview.applicationId}
        />
      ) : null}
    </View>
  );
}

/** "Trực tuyến" hoặc tên nơi làm việc (buổi PV chỉ trả `workLocationId`). */
export function interviewPlace(iv: CandidateInterview, locations: Map<number, string>): string {
  if (iv.format === "ONLINE") return S.online;
  return (iv.workLocationId != null && locations.get(iv.workLocationId)) || S.offline;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  full: { alignSelf: "stretch" },
  grow: { flex: 1 },
});
