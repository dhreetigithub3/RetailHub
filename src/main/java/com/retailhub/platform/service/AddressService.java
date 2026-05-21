package com.retailhub.platform.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.retailhub.platform.dto.AddressRequest;
import com.retailhub.platform.dto.AddressResponse;
import com.retailhub.platform.entity.Address;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.AddressRepository;

@Service
public class AddressService {

    private final AddressRepository addressRepository;

    public AddressService(AddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    public List<AddressResponse> getAddressesByUser(User user) {
        return addressRepository.findByUser(user)
                .stream()
                .map(this::mapToAddressResponse)
                .toList();
    }

    @Transactional
    public AddressResponse addAddress(User user, AddressRequest request) {
        Address address = new Address(
                user,
                request.street(),
                request.city(),
                request.state(),
                request.zipCode(),
                request.country());
        Address saved = addressRepository.save(address);
        return mapToAddressResponse(saved);
    }

    @Transactional
    public AddressResponse updateAddress(User user, Long addressId, AddressRequest request) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Address not found"));

        if (!address.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to address");
        }

        address.setStreet(request.street());
        address.setCity(request.city());
        address.setState(request.state());
        address.setZipCode(request.zipCode());
        address.setCountry(request.country());

        Address saved = addressRepository.save(address);
        return mapToAddressResponse(saved);
    }

    @Transactional
    public void deleteAddress(User user, Long addressId) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Address not found"));

        if (!address.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to address");
        }

        addressRepository.delete(address);
    }

    private AddressResponse mapToAddressResponse(Address a) {
        return new AddressResponse(
                a.getId(),
                a.getStreet(),
                a.getCity(),
                a.getState(),
                a.getZipCode(),
                a.getCountry());
    }
}
