import { useState, useEffect } from "react";
import { Box, Container, TextField, Button, Typography, Stack, InputAdornment } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { keyframes } from "@emotion/react";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { getUser, saveUser, ensureSession, clearAuth, needsNickname } from "../services/auth";
import { apiFetch } from "../services/api";
import { meterColors } from "../theme/meterTheme";

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const NicknamePage = () => {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user?.oauthId) {
        navigate("/");
        return;
      }

      const result = await ensureSession();
      if (cancelled) return;

      if (result.status === "deleted" || result.status === "unauthenticated") {
        clearAuth();
        navigate("/");
        return;
      }
      if (result.status === "ok" && !needsNickname(result.user)) {
        navigate("/map");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.oauthId, navigate]);

  const handleSubmit = async () => {
    if (!user?.oauthId) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!nickname.trim()) {
      alert("사용하실 별명을 입력해주세요.");
      return;
    }

    try {
      const response = await apiFetch("/auth/nickname", {
        method: "PUT",
        body: JSON.stringify({
          oauthId: user.oauthId,
          nickname: nickname.trim(),
        }),
      });
      const updatedUser = response?.user || { ...user, nickname: nickname.trim() };
      saveUser(updatedUser);
      navigate("/map");
    } catch {
      alert("이미 사용 중인 별명이거나 에러가 발생했습니다.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: meterColors.bg,
        color: meterColors.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={5} alignItems="center" sx={{ animation: `${fadeInUp} 0.8s ease-out` }}>
          <Box
            component="img"
            src="/meter-logo.png"
            alt="METER"
            sx={{ width: 56, height: 56, objectFit: "contain", mixBlendMode: "screen", opacity: 0.9 }}
          />

          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: meterColors.primary,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${meterColors.border}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <AccountCircleRoundedIcon sx={{ fontSize: 48 }} />
          </Box>

          <Stack spacing={1.5}>
            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
              METER 시작하기
            </Typography>
            <Typography sx={{ color: meterColors.secondary, fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 420 }}>
              환영합니다! 서비스에서 사용할 별명을 설정해 주세요.
            </Typography>
          </Stack>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="별명 입력 (예: meter_user)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircleRoundedIcon sx={{ color: "rgba(255,255,255,0.3)" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 400,
              "& .MuiOutlinedInput-root": {
                color: meterColors.primary,
                backgroundColor: "rgba(255,255,255,0.03)",
                fontSize: "1.1rem",
                fontWeight: 600,
                "& fieldset": {
                  borderColor: meterColors.border,
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                },
                "&:hover fieldset": { borderColor: meterColors.borderStrong },
                "&.Mui-focused fieldset": {
                  borderColor: meterColors.primary,
                  borderWidth: "1.5px",
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,0.3)",
                opacity: 1,
              },
            }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              maxWidth: 320,
              height: 60,
              borderRadius: 999,
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#000",
              backgroundColor: meterColors.primary,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#e8e8e8",
                transform: "translateY(-2px)",
              },
            }}
          >
            METER 입장
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default NicknamePage;
