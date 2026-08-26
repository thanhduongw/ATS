package iuh.fit.se.recruitment.common;

import org.springframework.data.domain.Page;

import java.util.List;

public record PageResponse<T>(
        List<T> content,
        long totalItems,
        int totalPages,
        int pageNumber,
        int pageSize
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize()
        );
    }

    public static <T> PageResponse<T> unpaged(List<T> all) {
        return new PageResponse<>(all, all.size(), 1, 0, all.size());
    }
}
