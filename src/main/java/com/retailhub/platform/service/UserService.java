package com.retailhub.platform.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.retailhub.platform.dto.UserRequest;
import com.retailhub.platform.dto.UserResponse;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.UserRepository;

import com.retailhub.platform.exception.UserAlreadyExistsException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UserAlreadyExistsException("Username already exists");
        }

        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Password is required for new users");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setName(request.name());
        user.setRole(request.role());

        // Save to database
        User savedUser = userRepository.save(user);

        // Convert to response DTO
        return new UserResponse(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail(), savedUser.getName(),
                savedUser.getRole());
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + id));

        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName(), user.getRole());
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName(),
                        user.getRole()))
                .toList();
    }

    public UserResponse updateUser(Long id, UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + id));

        // Check if username is being changed and if it's already taken
        if (!user.getUsername().equals(request.username()) && 
            userRepository.existsByUsername(request.username())) {
            throw new UserAlreadyExistsException("Username is already taken by another user");
        }

        user.setUsername(request.username());
        user.setEmail(request.email());

        // Update password only if provided
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        user.setName(request.name());
        user.setRole(request.role());

        User updatedUser = userRepository.save(user);

        return new UserResponse(updatedUser.getId(), updatedUser.getUsername(), updatedUser.getEmail(),
                updatedUser.getName(), updatedUser.getRole());
    }

    public String deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found with ID: " + id);
        }
        userRepository.deleteById(id);
        return "User deleted successfully";
    }
}
