package iuh.fit.se.recruitment.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Dùng chung để nhận response từ các endpoint danh mục đơn giản bên masterdata-service
// (EmploymentType, WorkLocation...) — bỏ qua các field thừa không cần dùng ở đây
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogItemResponse(Long id, String name, boolean active) {}