package iuh.fit.se.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.config.GatewayProperties;
import org.springframework.cloud.gateway.route.RouteDefinition;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Route la nguon duy nhat trong application.yml; docker-compose chi bom SERVICES_*_URL.
 * Test nay chot lai hop dong do: dung 9 downstream service, route /ws dung lai URL
 * notification-service, va khong route nao StripPrefix (downstream phai nhan nguyen path).
 */
@SpringBootTest(properties = {
        "SERVICES_AUTH_SERVICE_URL=http://auth-service:8081",
        "SERVICES_MASTERDATA_SERVICE_URL=http://masterdata-service:8082",
        "SERVICES_RECRUITMENT_SERVICE_URL=http://recruitment-service:8083",
        "SERVICES_CANDIDATE_SERVICE_URL=http://candidate-service:8084",
        "SERVICES_INTERVIEW_SERVICE_URL=http://interview-service:8085",
        "SERVICES_NOTIFICATION_SERVICE_URL=http://notification-service:8086",
        "SERVICES_DASHBOARD_SERVICE_URL=http://dashboard-service:8087",
        "SERVICES_APPLICATION_SERVICE_URL=http://application-service:8089",
        "SERVICES_OFFER_SERVICE_URL=http://offer-service:8090"
})
class GatewayRouteConfigurationTest {

    @Autowired
    private GatewayProperties gatewayProperties;

    private Map<String, RouteDefinition> routesById() {
        return gatewayProperties.getRoutes().stream()
                .collect(Collectors.toMap(RouteDefinition::getId, route -> route));
    }

    @Test
    void everyRouteResolvesToTheDockerServiceNameWhenServiceUrlsAreProvided() {
        List<RouteDefinition> routes = gatewayProperties.getRoutes();

        assertThat(routes).isNotEmpty();
        assertThat(routes)
                .allSatisfy(route -> assertThat(route.getUri().getHost())
                        .as("route %s must not fall back to localhost inside a container", route.getId())
                        .isNotEqualTo("localhost"));
    }

    @Test
    void exposesExactlyTheNineDownstreamServicesPlusTheWebSocketRoute() {
        assertThat(routesById()).containsOnlyKeys(
                "auth-service",
                "masterdata-service",
                "recruitment-service",
                "candidate-service",
                "interview-service",
                "notification-service",
                "dashboard-service",
                "application-service",
                "offer-service",
                "notification-websocket");
    }

    @Test
    void webSocketRouteReusesTheNotificationServiceUri() {
        Map<String, RouteDefinition> routes = routesById();
        RouteDefinition websocket = routes.get("notification-websocket");

        assertThat(websocket.getUri())
                .isEqualTo(routes.get("notification-service").getUri())
                .isEqualTo(URI.create("http://notification-service:8086"));
        assertThat(websocket.getPredicates())
                .singleElement()
                .satisfies(predicate -> assertThat(predicate.getArgs().values()).containsExactly("/ws/**"));
    }

    @Test
    void googleOauth2PathsAreServedByTheExistingAuthRouteWithoutPrefixStripping() {
        RouteDefinition authRoute = routesById().get("auth-service");

        assertThat(authRoute.getUri()).isEqualTo(URI.create("http://auth-service:8081"));
        assertThat(authRoute.getPredicates())
                .singleElement()
                .satisfies(predicate -> assertThat(predicate.getArgs().values()).containsExactly("/api/auth/**"));

        // /api/auth/oauth2/** va /api/auth/login/oauth2/code/** deu khop predicate tren,
        // nen chung phai toi auth-service voi nguyen path — bat ky filter nao cung se pha vo dieu do.
        assertThat(gatewayProperties.getRoutes())
                .allSatisfy(route -> assertThat(route.getFilters())
                        .as("route %s must forward the original path (no StripPrefix)", route.getId())
                        .isEmpty());
        assertThat(gatewayProperties.getDefaultFilters()).isEmpty();
    }
}
