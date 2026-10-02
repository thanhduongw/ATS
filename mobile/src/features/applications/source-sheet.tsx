import { BottomSheet } from "@/components/ui/bottom-sheet";
import { RadioList } from "@/components/ui/radio-list";
import { useRecruitmentSources } from "@/features/masterdata/hooks";
import { STRINGS } from "@/lib/strings";

const S = STRINGS.jobDetail;

/**
 * Sheet chọn nguồn tuyển dụng ("Bạn biết tin này từ đâu?") — `recruitmentSourceId` là trường
 * BẮT BUỘC khi nộp đơn (@NotNull ở ApplicationCreateRequest). Chọn xong là đóng sheet.
 */
export function SourceSheet({
  visible,
  onDismiss,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onDismiss: () => void;
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const sources = useRecruitmentSources();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={S.sourceSheetTitle} subtitle={S.sourceSheetSubtitle}>
      <RadioList
        options={(sources.data ?? []).map((s) => ({ id: s.id!, label: s.name ?? "" }))}
        value={selectedId}
        onChange={onSelect}
        loading={sources.isPending}
        error={sources.isError}
        errorText={S.sourcesError}
        onRetry={() => void sources.refetch()}
      />
    </BottomSheet>
  );
}
