package iuh.fit.se.candidate.storage;

import iuh.fit.se.candidate.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3Service {

    private static final Logger log = LoggerFactory.getLogger(S3Service.class);

    private final S3Client s3Client;

    @Value("${aws.s3.bucket:ats-bucket}")
    private String bucket;

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Value("${aws.s3.public-url:}")
    private String publicUrl;

    public String uploadFile(MultipartFile file, String keyPrefix) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File tải lên không được để trống");
        }

        String originalFileName = file.getOriginalFilename() == null ? "file.pdf" : file.getOriginalFilename();
        String safeFileName = UUID.randomUUID() + "-" + originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = keyPrefix + "/" + safeFileName;

        // CV chỉ lưu trên S3 (ai-service đọc CV từ đây để chấm điểm). Upload lỗi thì báo lỗi,
        // không lưu tạm ra đĩa cục bộ như trước.
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
        } catch (IOException | RuntimeException e) {
            log.error("Tải file lên S3 thất bại: bucket={} key={}", bucket, key, e);
            throw new BusinessException("Không tải được file lên kho lưu trữ, vui lòng thử lại");
        }

        if (publicUrl != null && !publicUrl.isBlank()) {
            return String.format("%s/%s/%s", publicUrl.replaceAll("/+$", ""), bucket, key);
        }
        if (endpoint != null && !endpoint.isBlank()) {
            return String.format("%s/%s/%s", endpoint.replaceAll("/+$", ""), bucket, key);
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}