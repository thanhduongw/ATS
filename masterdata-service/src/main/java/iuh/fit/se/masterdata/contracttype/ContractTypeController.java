package iuh.fit.se.masterdata.contracttype;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.contracttype.dto.ContractTypeRequest;
import iuh.fit.se.masterdata.contracttype.dto.ContractTypeResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/contract-types")
@RequiredArgsConstructor
public class ContractTypeController {

    private final ContractTypeService service;

    @GetMapping
    public ResponseEntity<List<ContractTypeResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<ContractTypeResponse> create(
            @Valid @RequestBody ContractTypeRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContractTypeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ContractTypeRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}
