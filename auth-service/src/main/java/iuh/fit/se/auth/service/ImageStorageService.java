package iuh.fit.se.auth.service;

import iuh.fit.se.auth.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.Set;
import java.util.UUID;

/**
 * Tải ảnh công khai lên S3 (ảnh bìa, ảnh đời sống trên trang tuyển dụng; logo; ảnh đại diện).
 * Chỉ nhận JPG / PNG / WEBP (không nhận SVG vì SVG chứa được mã script), tối đa 5MB (giới hạn multipart trong application.yml).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageStorageService {

    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    public static final String TYPE_ERROR = "Chỉ nhận ảnh JPG, PNG hoặc WEBP";
    private static final Set<String> FOLDERS = Set.of("careers", "logo", "avatars");

    private final S3Client s3Client;

    @Value("${aws.s3.bucket:ats-bucket}")
    private String bucket;

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Value("${aws.s3.public-url:}")
    private String publicUrl;

    public String upload(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) throw new BusinessException("Chưa chọn ảnh");
        if (!TYPES.contains(file.getContentType()) || !isRealImage(file)) throw new BusinessException(TYPE_ERROR);
        String dir = FOLDERS.contains(folder) ? folder : "careers";
        String name = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename().replaceAll("[^A-Za-z0-9._-]", "_");
        String key = "company/" + dir + "/" + UUID.randomUUID() + "-" + name;
        try {
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).contentType(file.getContentType()).build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (Exception e) {
            log.error("Tải ảnh lên S3 thất bại: bucket={} key={}", bucket, key, e);
            throw new BusinessException("Không tải được ảnh lên, vui lòng thử lại");
        }
        return baseUrl() + key;
    }

    /** Kiểm tra chữ ký đầu file (PNG / JPEG / WEBP) — không tin Content-Type do client gửi. */
    static boolean isRealImage(MultipartFile file) {
        byte[] h = new byte[12];
        int n;
        try (java.io.InputStream in = file.getInputStream()) {
            n = in.readNBytes(h, 0, h.length);
        } catch (java.io.IOException e) {
            return false;
        }
        boolean png = n >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
        boolean jpeg = n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
        boolean webp = n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
        return png || jpeg || webp;
    }

    /** Đường dẫn có phải ảnh do hệ thống tải lên vào `folder` (chặn gán ảnh từ nguồn ngoài). */
    public boolean isStoredImage(String url, String folder) {
        return url != null && url.startsWith(baseUrl() + "company/" + folder + "/") && !url.contains("..");
    }

    private String baseUrl() {
        if (publicUrl != null && !publicUrl.isBlank()) {
            return String.format("%s/%s/", publicUrl.replaceAll("/+$", ""), bucket);
        }
        if (endpoint != null && !endpoint.isBlank()) {
            return String.format("%s/%s/", endpoint.replaceAll("/+$", ""), bucket);
        }
        return String.format("https://%s.s3.%s.amazonaws.com/", bucket, region);
    }
}
