package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.enums.RoleName;
import jakarta.persistence.*;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(unique = true, nullable = false)
    private RoleName name;

    public Role() {}

    public Role(Long id, RoleName name) {
        this.id = id;
        this.name = name;
    }

    public static RoleBuilder builder() {
        return new RoleBuilder();
    }

    public static class RoleBuilder {
        private Long id;
        private RoleName name;

        public RoleBuilder id(Long id) { this.id = id; return this; }
        public RoleBuilder name(RoleName name) { this.name = name; return this; }

        public Role build() {
            return new Role(id, name);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public RoleName getName() { return name; }
    public void setName(RoleName name) { this.name = name; }
}