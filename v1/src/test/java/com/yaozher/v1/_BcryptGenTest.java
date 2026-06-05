package com.yaozher.v1;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class _BcryptGenTest {

    @Test
    void printBcrypt() {
        System.out.println(new BCryptPasswordEncoder().encode("123456"));
    }
}
