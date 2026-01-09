package com.buildmyhome.common.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final Key key;
    private final long expiration;


    // 시크릿 키 암호화 및 만료 시간 설정
    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration){
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expiration = expiration;
    }

//    // 토큰 생성
//    public String createToken(String email) {
//        Date now = new Date();
//        Date expireDate = new Date(now.getTime() + expiration);
//
//        return Jwts.builder()
//                .setSubject(email)
//                .claim("role", role)
//                .setIssuedAt(now)
//                .setExpiration(expireDate)
//                .signWith(key, SignatureAlgorithm.HS256)
//                .compact();
//    }

    public String createToken(String email, String role) { // 1. 여기서 String role을 추가로 받아야 합니다.
        Claims claims = Jwts.claims().setSubject(email);
        // claims.put("role", role); // jjwt 버전에 따라 이 방식을 쓰기도 합니다.

        Date now = new Date();
        Date validity = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .setClaims(claims)
                .claim("role", role) // 2. 이제 여기서 외부에서 받은 role 변수를 사용할 수 있습니다.
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(SignatureAlgorithm.HS256, key)
                .compact();
    }

    // 토큰에서 이메일 추출
    public String getEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
