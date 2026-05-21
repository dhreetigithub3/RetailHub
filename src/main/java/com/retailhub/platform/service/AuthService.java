package com.retailhub.platform.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.retailhub.platform.dto.UserResponse;
import com.retailhub.platform.dto.UserRequest;

import com.retailhub.platform.dto.AuthResponse;
import com.retailhub.platform.dto.LoginRequest;
import com.retailhub.platform.dto.RegisterRequest;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.UserRepository;

import com.retailhub.platform.exception.UserAlreadyExistsException;
import com.retailhub.platform.exception.UserNotFoundException;

@Service
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;

        public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JwtService jwtService) {
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.authenticationManager = authenticationManager;
                this.jwtService = jwtService;
        }

        public String register(RegisterRequest request) {
                if (userRepository.existsByUsername(request.username())) {
                        throw new UserAlreadyExistsException("Username already exists");
                }

                User user = new User(
                                request.name(),
                                request.username(),
                                request.email(),
                                passwordEncoder.encode(request.password()),
                                "USER");

                userRepository.save(user);
                return "User registered successfully";
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.username(),
                                                request.password()));

                User user = userRepository.findByUsername(request.username())
                                .orElseThrow(() -> new UserNotFoundException("User not found"));

                String token = jwtService.generateToken(
                                org.springframework.security.core.userdetails.User.builder()
                                                .username(user.getUsername())
                                                .password(user.getPassword())
                                                .authorities("ROLE_" + user.getRole())
                                                .build());

                return new AuthResponse(token, "Bearer", user.getUsername(), user.getRole(), user.getName());
        }

        public UserResponse getCurrentUser() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName(), user.getRole());
        }

        public AuthResponse updateCurrentUser(UserRequest request) {
                String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(currentUsername)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                // Check if username is being changed and if it's already taken
                if (!user.getUsername().equals(request.username()) && 
                    userRepository.existsByUsername(request.username())) {
                        throw new UserAlreadyExistsException("Username is already taken by another user");
                }

                user.setName(request.name());
                user.setEmail(request.email());
                user.setUsername(request.username());

                if (request.password() != null && !request.password().isBlank()) {
                        user.setPassword(passwordEncoder.encode(request.password()));
                }

                User updatedUser = userRepository.save(user);
                String token = jwtService.generateToken(
                                org.springframework.security.core.userdetails.User.builder()
                                                .username(updatedUser.getUsername())
                                                .password(updatedUser.getPassword())
                                                .authorities("ROLE_" + updatedUser.getRole())
                                                .build());

                return new AuthResponse(token, "Bearer", updatedUser.getUsername(), updatedUser.getRole(),
                                updatedUser.getName());
        }

        public void deleteCurrentUser() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                userRepository.delete(user);
                SecurityContextHolder.clearContext();
        }
}
