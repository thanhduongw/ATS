package iuh.fit.se.candidate.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${aws.access-key-id:minioadmin}")
    private String accessKeyId;

    @Value("${aws.secret-access-key:minioadmin}")
    private String secretAccessKey;

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Bean
    public S3Client s3Client() {
        String keyId = (accessKeyId == null || accessKeyId.isBlank()) ? "minioadmin" : accessKeyId;
        String secretKey = (secretAccessKey == null || secretAccessKey.isBlank()) ? "minioadmin" : secretAccessKey;
        String reg = (region == null || region.isBlank()) ? "us-east-1" : region;

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(reg))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(keyId, secretKey)));

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint))
                    .forcePathStyle(true);
        }

        return builder.build();
    }
}