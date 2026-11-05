-- A09/A10: trang tuyển dụng công khai — bản nháp (lưu tự động) và bản đã xuất bản, dạng JSON.
CREATE TABLE IF NOT EXISTS careers_page (
    id               BIGINT PRIMARY KEY,
    draft_config     TEXT,
    published_config TEXT,
    draft_updated_at TIMESTAMP WITHOUT TIME ZONE,
    published_at     TIMESTAMP WITHOUT TIME ZONE,
    published_by     BIGINT
);
