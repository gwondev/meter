import { Box, Typography, Container, Stack, Button } from "@mui/material";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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
import { meterColors } from "../theme/meterTheme";

const floatSlow = keyframes`
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
  100% { transform: translate3d(0, 0, 0); }
`;

const pulseGlow = keyframes`
  0% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.12); }
  100% { opacity: 0.35; transform: scale(1); }
`;

const textShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const featureItems = [
  {
    title: "AI 자원순환 안내",
    subtitle: "품목 판별, 거점 안내",
    icon: <PhotoCameraRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/smart-disposal",
    color: meterColors.pointSky,
  },
  {
    title: "사각지대 감시",
    subtitle: "D모듈, R모듈 IoT",
    icon: <SensorsRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/iot",
    color: meterColors.pointPurple,
  },
  {
    title: "최적 수거 경로",
    subtitle: "만재 우선, 도로망",
    icon: <InsightsRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/reward",
    color: meterColors.pointGreen,
  },
  {
    title: "통합 관제",
    subtitle: "지도, 챗봇, 진단",
    icon: <DashboardRoundedIcon sx={{ fontSize: 26 }} />,
    path: "/features/operations",
    color: meterColors.pointAmber,
  },
];

const Root = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser());
  const navigateRef = useRef(navigate);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

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
      onMouseMove={handleMouseMove}
      sx={{
        minHeight: "100dvh",
        bgcolor: meterColors.bg,
        color: meterColors.primary,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: `radial-gradient(560px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.07), transparent 75%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: { xs: 340, md: 620 },
          height: { xs: 340, md: 620 },
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 45%, transparent 70%)",
          filter: "blur(40px)",
          animation: `${pulseGlow} 8s ease-in-out infinite`,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: "-10%",
          bottom: "-15%",
          width: { xs: 380, md: 660 },
          height: { xs: 380, md: 660 },
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.07) 0%, rgba(255,255,255,0.02) 45%, transparent 70%)",
          filter: "blur(50px)",
          animation: `${pulseGlow} 10s ease-in-out infinite alternate`,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.1) 85%, transparent 100%)",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 2.5, md: 0 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 3, md: 8 }}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Stack
            spacing={{ xs: 1.5, md: 2.5 }}
            component={motion.div}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            sx={{ flex: 1.15, textAlign: { xs: "center", md: "left" }, alignItems: { xs: "center", md: "flex-start" } }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src={meterLogo}
                alt="METER"
                sx={{
                  width: { xs: 44, md: 54 },
                  height: "auto",
                  mixBlendMode: "screen",
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.22em",
                  color: meterColors.primaryMuted,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  bgcolor: "rgba(255,255,255,0.06)",
                  px: 1.8,
                  py: 0.6,
                  borderRadius: "20px",
                  border: `1px solid ${meterColors.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 14 }} /> ICT BUILDUP CAMP 2026
              </Typography>
            </Stack>

            <Typography
              sx={{
                fontSize: { xs: "3rem", sm: "5rem", md: "6.2rem" },
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "0.1em",
                background: "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.45) 30%, #FFFFFF 50%, rgba(255,255,255,0.45) 70%, #FFFFFF 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: `${textShimmer} 8s linear infinite, ${floatSlow} 6s ease-in-out infinite`,
                filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.7))",
              }}
            >
              METER
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "0.62rem", sm: "0.82rem", md: "0.92rem" },
                color: meterColors.secondary,
                letterSpacing: { xs: "0.02em", sm: "0.05em" },
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              Multi-resource Environment Tracking &amp; Efficiency Reporter
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "0.86rem", sm: "1.05rem", md: "1.25rem" },
                color: "rgba(255,255,255,0.75)",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                lineHeight: 1.65,
                whiteSpace: "nowrap",
              }}
            >
              사각지대 감시와 최적 수거를 잇는{" "}
              <Box component="span" sx={{ color: meterColors.primary, fontWeight: 800 }}>
                자원순환 AIoT 플랫폼
              </Box>
            </Typography>
          </Stack>

          <Stack spacing={{ xs: 1.6, md: 2.5 }} sx={{ flex: 1, minWidth: 0 }}>
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
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: { xs: 1.2, md: 1.8 },
              }}
            >
              {featureItems.map((item) => (
                <motion.div
                  key={item.path}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                  }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", minWidth: 0 }}
                >
                  <Button
                    fullWidth
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: { xs: 96, sm: 130 },
                      px: 2.2,
                      py: { xs: 1.5, sm: 2.2 },
                      borderRadius: "18px",
                      color: meterColors.primary,
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      textTransform: "none",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))",
                      backdropFilter: "blur(14px)",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: item.color,
                        boxShadow: `0 10px 30px ${item.color}33, inset 0 0 15px ${item.color}22`,
                      },
                      "&:hover .feature-icon": {
                        borderColor: `${item.color}66`,
                        boxShadow: `0 0 12px ${item.color}33`,
                      },
                    }}
                  >
                    <Stack spacing={{ xs: 1, sm: 1.5 }} sx={{ textAlign: "left", width: "100%" }}>
                      <Box
                        className="feature-icon"
                        sx={{
                          width: { xs: 38, sm: 44 },
                          height: { xs: 38, sm: 44 },
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: item.color,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.16)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Stack spacing={0.3} sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: { xs: "0.92rem", sm: "1.05rem" },
                            fontWeight: 800,
                            lineHeight: 1.3,
                            wordBreak: "keep-all",
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color: meterColors.secondary,
                            lineHeight: 1.4,
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

            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              sx={{
                px: { xs: 2.2, sm: 2.8 },
                py: { xs: 1.6, sm: 2.8 },
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(180deg, rgba(24,24,24,0.9) 0%, rgba(8,8,8,0.95) 100%)",
                backdropFilter: "blur(16px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: { xs: 1.2, sm: 1.8 },
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  letterSpacing: "0.18em",
                  color: meterColors.secondary,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {user ? "SYSTEM ACCESS GRANTED" : "GOOGLE ACCOUNT AUTHENTICATION"}
              </Typography>

              {!user ? (
                isDevBypass() ? (
                  <Button
                    onClick={handleLocalDevLogin}
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{
                      minWidth: 250,
                      height: { xs: 46, sm: 52 },
                      borderRadius: "14px",
                      color: meterColors.primary,
                      textTransform: "none",
                      fontWeight: 800,
                      fontSize: "0.98rem",
                      border: "1px solid rgba(255,255,255,0.3)",
                      bgcolor: "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.5)" },
                    }}
                  >
                    개발용 로그인
                  </Button>
                ) : (
                  <Box sx={{ mx: "auto", width: "100%", maxWidth: 280, display: "flex", justifyContent: "center" }}>
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
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    minWidth: { xs: 250, sm: 280 },
                    height: { xs: 46, sm: 52 },
                    px: 4,
                    borderRadius: "14px",
                    color: "#000000",
                    textTransform: "none",
                    fontWeight: 900,
                    fontSize: "1.05rem",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 0 25px rgba(255,255,255,0.25)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: "#FFFFFF",
                      boxShadow: `0 0 30px ${meterColors.pointBorder}`,
                      transform: "scale(1.02)",
                    },
                  }}
                >
                  서비스 시작
                </Button>
              )}
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Root;
