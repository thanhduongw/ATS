package iuh.fit.se.notification.notification;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailLayoutTest {

    @Test
    void wrapsParagraphsEscapesTextAndAddsButton() {
        EmailLayout.Brand brand = new EmailLayout.Brand("Công ty <A>", null, "#0F6E66");
        String html = EmailLayout.html(brand, "Thư mời phỏng vấn",
                "Xin chào An,\n\nBạn có lịch <b>phỏng vấn</b>\nlúc 9:00.", "http://localhost/my-interviews?highlightId=5",
                "Xem lịch phỏng vấn");

        assertThat(html).contains("Công ty &lt;A&gt;");
        assertThat(html).contains("&lt;b&gt;phỏng vấn&lt;/b&gt;<br>lúc 9:00.");
        assertThat(html.split("<p style=\"margin:0 0 16px").length - 1).isEqualTo(2);
        assertThat(html).contains("background:#0F6E66").contains("href=\"http://localhost/my-interviews?highlightId=5\"")
                .contains(">Xem lịch phỏng vấn</a>");
    }

    @Test
    void invalidColorAndMissingCompanyFallBackToDefaults() {
        EmailLayout.Brand brand = new EmailLayout.Brand(null, "http://not-https/logo.png", "red");
        assertThat(brand.companyName()).isEqualTo("Bộ phận Tuyển dụng");
        assertThat(brand.color()).isEqualTo(EmailLayout.DEFAULT_COLOR);
        assertThat(brand.logoUrl()).isNull();
        assertThat(EmailLayout.html(brand, "S", "Nội dung", null, null)).doesNotContain("<a href");
    }

    @Test
    void linksFollowTheWebNotificationRoutes() {
        assertThat(EmailLinks.target("APPLICATION", 7L, NotificationType.APPLICATION_RECEIVED, true).path())
                .isEqualTo("/my-applications/7");
        assertThat(EmailLinks.target("APPLICATION", 7L, NotificationType.APPLICATION_CREATED, false).path())
                .isEqualTo("/applications?highlightId=7");
        assertThat(EmailLinks.target("OFFER", 3L, NotificationType.OFFER_READY_FOR_CANDIDATE, true).path())
                .isEqualTo("/my-offers/3");
        assertThat(EmailLinks.target(null, 9L, NotificationType.INTERVIEW_REMINDER, false).path())
                .isEqualTo("/interviews?highlightId=9");
    }
}
