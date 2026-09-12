package com.paradoxbh.gameplannerserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GameplannerserverApplication {

	public static void main(String[] args) {
		SpringApplication.run(GameplannerserverApplication.class, args);
	}

}
