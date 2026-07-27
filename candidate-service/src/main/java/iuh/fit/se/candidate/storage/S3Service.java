package iuh.fit.se.candidate.storage;

import iuh.fit.se.candidate.exception.BusinessException;
import lombok.RequiredArgsConstructor;
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

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.region}")
    private String region;

    public String uploadFile(MultipartFile file, String keyPrefix) {
        if (file.isEmpty()) {
            throw new BusinessException("File tải lên không được để trống");
        }

        String safeFileName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String key = keyPrefix + "/" + UUID.randomUUID() + "-" + safeFileName;

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
        } catch (IOException e) {
            throw new BusinessException("Tải file lên S3 thất bại: " + e.getMessage());
        }

        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}