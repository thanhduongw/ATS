package iuh.fit.se.application.application;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationListScopeSpecificationTest {

    @Test
    void hiringManagerPipelineIsRestrictedToOwnDepartment() {
        Specification<Application> specification = scope(10L, null, true);
        CriteriaFixture fixture = new CriteriaFixture();

        specification.toPredicate(fixture.root, fixture.query, fixture.criteriaBuilder);

        verify(fixture.criteriaBuilder).equal(fixture.departmentPath, 10L);
        verify(fixture.root, never()).get("assignedRecruiterId");
    }

    @Test
    void recruiterPipelineAllowsOwnDepartmentOrExplicitAssignment() {
        Specification<Application> specification = scope(10L, 2L, true);
        CriteriaFixture fixture = new CriteriaFixture();
        Predicate department = mock(Predicate.class);
        Predicate assignment = mock(Predicate.class);
        when(fixture.criteriaBuilder.equal(fixture.departmentPath, 10L)).thenReturn(department);
        when(fixture.criteriaBuilder.equal(fixture.assignedRecruiterPath, 2L)).thenReturn(assignment);

        specification.toPredicate(fixture.root, fixture.query, fixture.criteriaBuilder);

        verify(fixture.criteriaBuilder).or(department, assignment);
    }

    @Test
    void companyAdminPipelineHasNoDepartmentOrAssignmentScope() {
        Specification<Application> specification = scope(null, null, false);
        CriteriaFixture fixture = new CriteriaFixture();

        specification.toPredicate(fixture.root, fixture.query, fixture.criteriaBuilder);

        verify(fixture.root, never()).get("departmentId");
        verify(fixture.root, never()).get("assignedRecruiterId");
        verify(fixture.criteriaBuilder, never()).disjunction();
    }

    @Test
    void internalActorWithoutDepartmentScopeFailsClosedInsteadOfSeeingEverything() {
        Specification<Application> specification = scope(null, null, true);
        CriteriaFixture fixture = new CriteriaFixture();

        specification.toPredicate(fixture.root, fixture.query, fixture.criteriaBuilder);

        verify(fixture.criteriaBuilder).disjunction();
        verify(fixture.root, never()).get("departmentId");
        verify(fixture.root, never()).get("assignedRecruiterId");
    }

    private Specification<Application> scope(Long departmentId, Long recruiterId, boolean restrictToScope) {
        return ApplicationSpecifications.build(
                null, null, null, null, null, null, null,
                departmentId, recruiterId, restrictToScope);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static final class CriteriaFixture {
        private final Root<Application> root = mock(Root.class);
        private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
        private final CriteriaBuilder criteriaBuilder = mock(CriteriaBuilder.class);
        private final Path<Object> deletedAtPath = mock(Path.class);
        private final Path<Object> departmentPath = mock(Path.class);
        private final Path<Object> assignedRecruiterPath = mock(Path.class);

        private CriteriaFixture() {
            when(root.get("deletedAt")).thenReturn((Path) deletedAtPath);
            when(root.get("departmentId")).thenReturn((Path) departmentPath);
            when(root.get("assignedRecruiterId")).thenReturn((Path) assignedRecruiterPath);
            when(criteriaBuilder.isNull(deletedAtPath)).thenReturn(mock(Predicate.class));
            when(criteriaBuilder.disjunction()).thenReturn(mock(Predicate.class));
            when(criteriaBuilder.and(any(Predicate[].class))).thenReturn(mock(Predicate.class));
        }
    }
}
