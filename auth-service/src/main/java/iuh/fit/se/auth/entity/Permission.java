package iuh.fit.se.auth.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permission")
@Getter
@Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Permission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;

    private String description;
}
