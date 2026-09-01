import { Box, Typography, Container, Stack, Button } from "@mui/material";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithGoogleCredential,
  saveAuth,
  getUser,
  isDevBypass,
  saveUser,
  DEV_OAUTH_ID,
  ensureSession,
} from "../services/auth";
import { GoogleLogin } from "@react-oauth/google";
import meterLogo from "../assets/meter-logo.png";

const floatSlow = keyframes`
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -8px, 0); }
  100% { transform: translate3d(0, 0, 0); }
`;

const glowPulse = keyframes`
  0% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.08); }
  100% { opacity: 0.45; transform: scale(1); }
`;

const featureItems = [
  {
    title: "AI 카메라",
    subtitle: "유형 판별 · 거점 안내",
    icon: <PhotoCameraRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/smart-disposal",
  },
  {
    title: "IoT 실시간 적재 측정",
    subtitle: "초음파 · MQTT · LED",
    icon: <SensorsRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/iot",
  },
  {
    title: "데이터 분석 & 수거 동선",
    subtitle: "만재 우선 · 최적 경로",
    icon: <InsightsRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/reward",
  },
  {
    title: "통합 관제 플랫폼",
    subtitle: "지도 · DB · 모듈 점검",
    icon: <DashboardRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/operations",
  },
];

const Root = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser());
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getUser()?.oauthId) {
        setUser(null);
        return;
      }

      const result = await ensureSession();
      if (cancelled) return;

      if (result.status === "deleted" || result.status === "unauthenticated") {
        setUser(null);
        return;
      }
      if (result.status === "needs_nickname") {
        setUser(result.user);
        navigateRef.current("/nickname");
        return;
      }
      if (result.user) {
        setUser(result.user);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLocalDevLogin = () => {
    saveUser({
      oauthId: DEV_OAUTH_ID,
      nickname: "gwon",
      role: "ADMIN",
      status: "ACTIVE",
    });
    navigate("/map");
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) throw new Error("Google credential is missing");

      const loginResponse = await loginWithGoogleCredential(credential);
      const user = loginResponse?.user;
      const oauthId = user?.oauthId ?? user?.oauth_id;
      if (!oauthId) throw new Error("로그인 응답의 oauthId가 없습니다.");

      saveAuth({
        ...loginResponse,
        user: { ...user, oauthId },
      });

      if (loginResponse?.isNewUser) {
        navigateRef.current("/nickname");
      } else {
        navigateRef.current("/map");
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || "로그인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleGoogleError = () => {
    alert("구글 로그인에 실패했습니다.");
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "#0a0a0a",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "-8%",
          left: "-10%",
          width: { xs: 220, md: 420 },
          height: { xs: 220, md: 420 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0) 72%)",
          filter: "blur(24px)",
          animation: `${glowPulse} 6s ease-in-out infinite`,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          right: "-12%",
          bottom: "-10%",
          width: { xs: 260, md: 460 },
          height: { xs: 260, md: 460 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 34%, rgba(255,255,255,0) 72%)",
          filter: "blur(30px)",
          animation: `${glowPulse} 7.5s ease-in-out infinite`,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: { xs: "28px 28px", md: "40px 40px" },
          maskImage:
            "radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.1) 100%)",
          opacity: 0.12,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          spacing={{ xs: 4, md: 5 }}
          alignItems="center"
          textAlign="center"
          sx={{ py: { xs: 6, md: 8 } }}
        >
          <Stack
            spacing={1.5}
            alignItems="center"
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Box
              component="img"
              src={meterLogo}
              alt="METER"
              sx={{
                width: { xs: 56, md: 72 },
                height: "auto",
                display: "block",
                mixBlendMode: "screen",
                opacity: 0.95,
              }}
            />
            <Typography
              sx={{
                fontSize: { xs: "2.7rem", sm: "4.3rem", md: "5.5rem" },
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "0.18em",
                color: "#ffffff",
                textTransform: "uppercase",
                textShadow: "0 0 40px rgba(255,255,255,0.12)",
                animation: `${floatSlow} 6s ease-in-out infinite`,
              }}
            >
              METER
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "0.88rem", sm: "1.05rem", md: "1.15rem" },
                color: "rgba(255,255,255,0.74)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                maxWidth: 820,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              탈부착형 AIoT 모듈 기반 적재 자원 통합관리 플랫폼
            </Typography>
          </Stack>

          <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
            }}
            sx={{
              width: "100%",
              maxWidth: 620,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: { xs: 1.2, sm: 1.6 },
            }}
          >
            {featureItems.map((item) => (
              <motion.div
                key={item.path}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                style={{ width: "100%", minWidth: 0 }}
              >
                <Button
                  fullWidth
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: { xs: 100, sm: 110, md: 118 },
                    px: { xs: 1.2, sm: 1.8 },
                    py: 1.8,
                    borderRadius: 3,
                    color: "#fff",
                    justifyContent: "flex-start",
                    textTransform: "none",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.35)",
                      boxShadow: "0 0 24px rgba(255,255,255,0.08)",
                      transform: "translateY(-4px)",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                    },
                  }}
                >
                  <Stack direction="row" spacing={{ xs: 1, sm: 1.4 }} alignItems="center" sx={{ textAlign: "left" }}>
                    <Box
                      sx={{
                        width: { xs: 38, sm: 44 },
                        height: { xs: 38, sm: 44 },
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: "0.76rem", sm: "0.95rem", md: "1rem" },
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.3,
                          wordBreak: "keep-all",
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: "0.68rem", sm: "0.78rem" },
                          color: "rgba(255,255,255,0.55)",
                          lineHeight: 1.35,
                          wordBreak: "keep-all",
                        }}
                      >
                        {item.subtitle}
                      </Typography>
                    </Stack>
                  </Stack>
                </Button>
              </motion.div>
            ))}
          </Box>

          {!user ? (
            isDevBypass() ? (
              <Button
                onClick={handleLocalDevLogin}
                sx={{
                  mt: 1,
                  minWidth: 220,
                  height: 52,
                  borderRadius: 999,
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 800,
                  border: "1px solid rgba(255,255,255,0.22)",
                }}
              >
                개발용 로그인
              </Button>
            ) : (
              <Box sx={{ mt: 1, mx: "auto", width: "100%", maxWidth: 280, display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  size="large"
                  shape="pill"
                  text="signin_with"
                  ux_mode="popup"
                  width={280}
                />
              </Box>
            )
          ) : (
            <Button
              onClick={() => navigate("/map")}
              sx={{
                mt: 1,
                minWidth: { xs: 220, sm: 250 },
                height: 54,
                px: 3.5,
                borderRadius: 999,
                color: "#fff",
                textTransform: "none",
                fontWeight: 800,
                fontSize: "1rem",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "linear-gradient(90deg, rgba(20,20,20,0.96), rgba(16,16,16,0.98), rgba(20,20,20,0.96))",
                "&:hover": {
                  boxShadow: "0 0 24px rgba(255,255,255,0.12)",
                  background: "linear-gradient(90deg, rgba(28,28,28,1), rgba(22,22,22,1), rgba(28,28,28,1))",
                },
              }}
            >
              서비스 시작
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default Root;
