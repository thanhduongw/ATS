package iuh.fit.se.recruitment.posting;

public enum PostingStatus {
    DRAFT,          // Mới tạo, đang soạn
    EDITING,        // HR đang chỉnh sửa lại sau khi tạo/bị yêu cầu sửa
    APPROVED,       // HR xác nhận nội dung đã sẵn sàng, chờ bấm đăng
    OPEN,           // = "Published" — đã đăng công khai
    PAUSED,
    CLOSED
}
