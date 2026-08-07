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
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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

        // Attempt S3 / MinIO upload
        try {
            ensureBucketExists();
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            if (publicUrl != null && !publicUrl.isBlank()) {
                return String.format("%s/%s/%s", publicUrl.replaceAll("/+$", ""), bucket, key);
            }
            if (endpoint != null && !endpoint.isBlank()) {
                String clientEndpoint = endpoint.replace("http://minio:9000", "http://localhost:9000");
                return String.format("%s/%s/%s", clientEndpoint.replaceAll("/+$", ""), bucket, key);
            }
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);

        } catch (Exception e) {
            log.warn("S3/MinIO upload failed ({}), falling back to local file storage...", e.getMessage());
            return saveLocally(file, safeFileName);
        }
    }

    private String saveLocally(MultipartFile file, String fileName) {
        try {
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            Path filePath = uploadDir.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return "http://localhost:8080/api/candidate/candidates/cv-file/" + fileName;
        } catch (IOException ioException) {
            throw new BusinessException("Lưu file cục bộ thất bại: " + ioException.getMessage());
        }
    }

    private void ensureBucketExists() {
        try {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } catch (Exception ignored) {
            // Bucket already exists or no permission to create
        }
    }
}