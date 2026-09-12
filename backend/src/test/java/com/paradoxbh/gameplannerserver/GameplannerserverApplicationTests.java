package com.paradoxbh.gameplannerserver;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.PostgisIntegrationTest;

class GameplannerserverApplicationTests extends PostgisIntegrationTest {

	/**
	 * Vale mais do que parece: subir o contexto executa as migrations do Flyway e
	 * roda a validação do Hibernate contra o schema resultante. Qualquer divergência
	 * entre entidade e migration quebra aqui.
	 */
	@Test
	void contextLoads() {
	}

}
