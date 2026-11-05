package iuh.fit.se.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Trang tuyển dụng công khai (A09, A10): một dòng duy nhất, giữ HAI bản cấu hình JSON —
 * bản nháp (lưu tự động khi Quản trị sửa) và bản đã xuất bản (trang công khai đọc bản này).
 * Cấu trúc khối do frontend quản lý (`frontend/src/features/admin/careersPage.ts`); backend chỉ kiểm tra
 * JSON hợp lệ và kích thước (nợ kỹ thuật: chưa kiểm tra theo lược đồ).
 */
@Entity
@Table(name = "careers_page")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareersPage {

    @Id
    private Long id;

    @Column(name = "draft_config", columnDefinition = "TEXT")
    private String draftConfig;

    @Column(name = "published_config", columnDefinition = "TEXT")
    private String publishedConfig;

    @Column(name = "draft_updated_at")
    private LocalDateTime draftUpdatedAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by")
    private Long publishedBy;
}
