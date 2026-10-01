import type { IconName } from "@/components/ui/icon";
import type { StatusTone } from "@/theme";
import type { NotificationResponse, Role } from "@/types/api";

/**
 * Notification KHÔNG có trường deepLink — định tuyến suy từ `resourceType` + `resourceId` +
 * role, giống bản web (`frontend/src/features/notification/notificationRoutes.ts`).
 * Đợt này mới có nhánh CANDIDATE; HR/HM thêm khi làm khu vực của họ.
 */
export function notificationHref(n: NotificationResponse, role?: Role): string | null {
  const type = (n.resourceType ?? "").toUpperCase() || (n.type?.includes("OFFER") ? "OFFER" : "");
  const id = n.resourceId;

  if (role === "CANDIDATE") {
    switch (type) {
      case "APPLICATION":
        return id != null ? `/applications/${id}` : "/applications";
      case "INTERVIEW":
        // Không có màn chi tiết buổi PV riêng: mở tab lịch phỏng vấn.
        return "/interviews";
      case "OFFER":
        return id != null ? `/offers/${id}` : "/offers";
      default:
        return null;
    }
  }
  return null;
}

/** Icon + sắc độ ô tròn đầu dòng theo loại tài nguyên (canvas M14). */
export function notificationVisual(n: NotificationResponse): { icon: IconName; tone: StatusTone } {
  switch ((n.resourceType ?? "").toUpperCase()) {
    case "INTERVIEW":
      return { icon: "calendar", tone: "interview" };
    case "OFFER":
      return { icon: "mail", tone: "success" };
    case "APPLICATION":
      return n.type === "APPLICATION_REJECTED" ? { icon: "document", tone: "danger" } : { icon: "document", tone: "brand" };
    case "REQUISITION":
      return { icon: "clipboardCheck", tone: "warning" };
    default:
      return { icon: "bell", tone: "neutral" };
  }
}
