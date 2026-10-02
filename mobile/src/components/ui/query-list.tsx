import type { ReactElement, ReactNode } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from "react-native";
import { COLORS, SPACING } from "@/theme";
import { apiErrorMessage } from "@/api/client";
import { EmptyState, ErrorState, SkeletonList } from "./feedback";

/** Phần tối thiểu của một kết quả `useQuery` mà danh sách cần. */
type ListQuery = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  refetch: () => unknown;
};

/**
 * Danh sách chuẩn của app: gói sẵn 4 trạng thái (quy tắc 3) và kéo-để-làm-mới (quy tắc 4),
 * để màn hình không phải tự nhớ. Mọi màn danh sách nên dùng cái này.
 *
 * - đang tải lần đầu → `SkeletonList`
 * - lỗi và chưa có dữ liệu → `ErrorState` + nút thử lại
 * - rỗng → `EmptyState` (bắt buộc truyền `empty`)
 * - có dữ liệu → FlatList, kéo xuống để tải lại
 *
 * `data` là mảng ĐÃ LỌC (tìm kiếm/chip ở client) — rỗng vì lọc thì `empty` nên nói rõ.
 */
export function QueryList<T>({
  query,
  data,
  renderItem,
  keyExtractor,
  empty,
  header,
  bottomInset = 0,
  hideEmpty = false,
}: {
  query: ListQuery;
  data: readonly T[] | undefined;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  empty: { title: string; message: string; action?: { label: string; onPress: () => void } };
  /** Ô tìm kiếm, chip lọc… — nằm trong vùng cuộn, phía trên thẻ đầu tiên. */
  header?: ReactElement;
  /** Chừa chỗ cho thanh hành động dưới đáy nếu có. */
  bottomInset?: number;
  /** Không vẽ EmptyState dù danh sách rỗng — khi phần `header` đã tự dẫn việc. */
  hideEmpty?: boolean;
}) {
  const refreshControl = (
    <RefreshControl
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      colors={[COLORS.primary]}
      tintColor={COLORS.primary}
    />
  );

  let body: ReactNode = null;
  if (query.isPending) body = <SkeletonList />;
  else if (query.isError && !data?.length)
    body = <ErrorState message={apiErrorMessage(query.error, "")} onRetry={() => void query.refetch()} />;

  return (
    <FlatList
      data={body ? [] : data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshControl={refreshControl}
      ListHeaderComponent={
        header || body ? (
          <View style={styles.header}>
            {header}
            {body}
          </View>
        ) : null
      }
      ListEmptyComponent={body || hideEmpty ? null : <EmptyState {...empty} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={[styles.content, { paddingBottom: SPACING.lg + bottomInset }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      style={styles.list}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.body },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, flexGrow: 1 },
  header: { gap: SPACING.sm2, marginBottom: SPACING.sm2 },
  separator: { height: SPACING.sm2 },
});
