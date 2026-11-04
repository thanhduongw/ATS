package iuh.fit.se.application.application;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Bộ lọc giai đoạn nhận một loại hoặc danh sách (giao diện gộp 6 giai đoạn cố định). */
class ApplicationStageTypeFilterTest {

    @Test
    void singleTypeStaysSingle() {
        assertThat(ApplicationSpecifications.parseStageTypes("CV_SCREENING"))
                .containsExactly("CV_SCREENING");
    }

    @Test
    void commaListIsSplitTrimmedAndDeduplicated() {
        List<String> types = ApplicationSpecifications.parseStageTypes(
                " TECHNICAL_INTERVIEW, HR_INTERVIEW ,FINAL_INTERVIEW,,HR_INTERVIEW");
        assertThat(types).containsExactly("TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW");
    }

    @Test
    void blankPartsAreIgnored() {
        assertThat(ApplicationSpecifications.parseStageTypes(" , ")).isEmpty();
    }
}
