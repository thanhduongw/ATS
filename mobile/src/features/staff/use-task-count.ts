import { useMemo } from "react";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import {
  useMyId,
  useStaffApplications,
  useStaffInterviews,
  useStaffOffers,
  useStaffRequisitions,
} from "./hooks";
import { managerTasks, recruiterTasks } from "./tasks";

/** Số việc cần làm "Của tôi" — huy hiệu trên tab "Việc của tôi" (canvas UR01 "7", UH01 "4"). */
export function useStaffTaskCount(): number {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const me = useMyId();
  const now = useNow();
  const apps = useStaffApplications();
  const ivs = useStaffInterviews();
  const offers = useStaffOffers({ enabled: isHr });
  const reqs = useStaffRequisitions();
  return useMemo(() => {
    const d = {
      applications: apps.data ?? [],
      interviews: ivs.data ?? [],
      offers: offers.data ?? [],
      requisitions: reqs.data ?? [],
    };
    return (
      isHr
        ? recruiterTasks(d, me, now).filter((t) => t.mine)
        : managerTasks(d, me, now)
    ).length;
  }, [apps.data, ivs.data, offers.data, reqs.data, isHr, me, now]);
}
