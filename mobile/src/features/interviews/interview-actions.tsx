import { Linking } from "react-native";
import { PillButton } from "@/components/ui/buttons";
import { useSnackbar } from "@/components/ui/snackbar";
import { apiErrorMessage } from "@/api/client";
import { STRINGS } from "@/lib/strings";
import type { CandidateInterview } from "@/types/api";
import { useConfirmInterview } from "./hooks";

const S = STRINGS.interviews;

/**
 * Nút hành động của một buổi phỏng vấn phía ứng viên (M09, M10):
 * - HM đã xác nhận, ứng viên chưa → "Xác nhận"
 * - Đã xác nhận, phỏng vấn trực tuyến có link → "Mở phòng họp"
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

  if (interview.status === "HM_CONFIRMED" && interview.id != null) {
    const id = interview.id;
    return (
      <PillButton
        label={S.confirm}
        size={size}
        fullWidth={fullWidth}
        loading={confirm.isPending}
        onPress={() =>
          confirm.mutate(id, {
            onSuccess: () => notify(S.confirmed),
            onError: (e) => notify(apiErrorMessage(e, S.confirmFailed)),
          })
        }
      />
    );
  }

  const link = interview.meetingLink;
  if (interview.status === "CANDIDATE_CONFIRMED" && interview.format === "ONLINE" && link) {
    return (
      <PillButton
        label={S.openMeeting}
        icon={size === "md" ? "video" : undefined}
        variant={size === "md" ? "primary" : "tonal"}
        size={size}
        fullWidth={fullWidth}
        onPress={() => Linking.openURL(link).catch(() => notify(S.meetingFailed))}
      />
    );
  }

  return null;
}

/** "Trực tuyến" hoặc tên nơi làm việc (buổi PV chỉ trả `workLocationId`). */
export function interviewPlace(iv: CandidateInterview, locations: Map<number, string>): string {
  if (iv.format === "ONLINE") return S.online;
  return (iv.workLocationId != null && locations.get(iv.workLocationId)) || S.offline;
}
