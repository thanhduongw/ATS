package iuh.fit.se.auth.client;

import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class DepartmentDirectoryClient {

    private final RestClient restClient;

    public DepartmentDirectoryClient(
            RestClient.Builder builder,
            @Value("${services.masterdata-service.url}") String masterdataServiceUrl
    ) {
        this.restClient = builder.baseUrl(masterdataServiceUrl).build();
    }

    public boolean existsActive(Long departmentId, CurrentUser actor) {
        try {
            DepartmentExistsResponse response = restClient.get()
                    .uri("/api/masterdata/departments/{id}/exists", departmentId)
                    .header("X-User-Id", actor.userId().toString())
                    .header("X-User-Email", actor.email())
                    .header("X-User-Role", actor.role())
                    .retrieve()
                    .body(DepartmentExistsResponse.class);
            return response != null && response.exists();
        } catch (RestClientException ex) {
            throw new BusinessException("Khong the xac minh department");
        }
    }

    private record DepartmentExistsResponse(boolean exists) {}
}
