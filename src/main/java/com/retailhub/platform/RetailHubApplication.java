package com.retailhub.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableAsync
@SpringBootApplication
public class RetailHubApplication {

	public static void main(String[] args) {
		SpringApplication.run(RetailHubApplication.class, args);
	}

}
