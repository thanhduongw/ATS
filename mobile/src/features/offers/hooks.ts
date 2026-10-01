import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationKeys } from "@/features/applications/hooks";
import type { OfferDeclineRequest } from "@/types/api";
import { offersApi } from "./api";

export const offerKeys = {
  all: ["offers"] as const,
  my: () => [...offerKeys.all, "my"] as const,
  detail: (id: number) => [...offerKeys.all, "detail", id] as const,
};

export const useMyOffers = () => useQuery({ queryKey: offerKeys.my(), queryFn: offersApi.myList });

export const useMyOffer = (id: number) =>
  useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: () => offersApi.myDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

/** Nhận/từ chối xong thì làm mới offer + danh sách đơn (vòng của đơn đổi theo). */
function useInvalidateAfterResponse() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: offerKeys.all });
    void qc.invalidateQueries({ queryKey: applicationKeys.all });
  };
}

export const useAcceptOffer = () => {
  const done = useInvalidateAfterResponse();
  return useMutation({ mutationFn: offersApi.accept, onSuccess: done });
};

export const useDeclineOffer = () => {
  const done = useInvalidateAfterResponse();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: OfferDeclineRequest }) => offersApi.decline(id, body),
    onSuccess: done,
  });
};

export const useDownloadOfferPdf = () => useMutation({ mutationFn: offersApi.downloadPdf });
