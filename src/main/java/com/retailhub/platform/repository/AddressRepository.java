package com.retailhub.platform.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.retailhub.platform.entity.Address;
import com.retailhub.platform.entity.User;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUser(User user);

    long countByUser(User user);

    @Modifying
    @Query("DELETE FROM Address a WHERE a.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
