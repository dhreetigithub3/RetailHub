package com.retailhub.platform.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.retailhub.platform.dto.AddressResponse;
import com.retailhub.platform.dto.AddressRequest;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.service.AddressService;
import com.retailhub.platform.repository.UserRepository;

@RestController
@RequestMapping("/customer/addresses")
public class AddressController {

    private final AddressService addressService;
    private final UserRepository userRepository;

    public AddressController(AddressService addressService, UserRepository userRepository) {
        this.addressService = addressService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<AddressResponse>> getMyAddresses() {
        return ResponseEntity.ok(addressService.getAddressesByUser(getCurrentUser()));
    }

    @PostMapping
    public ResponseEntity<AddressResponse> addAddress(@RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.addAddress(getCurrentUser(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AddressResponse> updateAddress(
            @PathVariable Long id,
            @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.updateAddress(getCurrentUser(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddress(@PathVariable Long id) {
        addressService.deleteAddress(getCurrentUser(), id);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
