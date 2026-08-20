import { useCallback, useState } from "react";

export interface SavedFilter<F> {
    name: string;
    filters: F;
}

function readStore<F>(storageKey: string): SavedFilter<F>[] {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as SavedFilter<F>[]) : [];
    } catch {
        return [];
    }
}

/** Lưu/áp dụng lại bộ lọc theo tên, riêng cho từng trang (storageKey). */
export function useSavedFilters<F>(storageKey: string) {
    const [savedFilters, setSavedFilters] = useState<SavedFilter<F>[]>(() => readStore<F>(storageKey));

    const persist = useCallback((list: SavedFilter<F>[]) => {
        setSavedFilters(list);
        localStorage.setItem(storageKey, JSON.stringify(list));
    }, [storageKey]);

    const saveFilter = useCallback((name: string, filters: F) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        persist([...savedFilters.filter((f) => f.name !== trimmed), { name: trimmed, filters }]);
    }, [savedFilters, persist]);

    const deleteFilter = useCallback((name: string) => {
        persist(savedFilters.filter((f) => f.name !== name));
    }, [savedFilters, persist]);

    return { savedFilters, saveFilter, deleteFilter };
}
