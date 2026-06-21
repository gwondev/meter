package com.meter.backend.repository;

import com.meter.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 구글 고유 ID로 사용자 찾기입니다.
    Optional<User> findByOauthId(String oauthId);
    
    // 닉네임 중복 체크용
    Optional<User> findByNickname(String nickname);
}