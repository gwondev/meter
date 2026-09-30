import { useRef, useState } from "react";
import { Box, Button, ButtonBase, IconButton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { keyframes } from "@emotion/react";
import { motion, AnimatePresence } from "framer-motion";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import CheckroomRoundedIcon from "@mui/icons-material/CheckroomRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import { getUser } from "../services/auth";
import { apiFetchMultipart } from "../services/api";
import { compressImage } from "../utils/compressImage";
import { meterColors } from "../theme/meterTheme";

const HELD_KEY = "meter.finalWasteType";

const TYPE_LABELS = {
  CLOTHING: "의류",
  PLASTIC: "플라스틱",
  CAN: "캔",
  MEDICINE: "폐의약품",
};

const TYPE_META = {
  CLOTHING: { icon: <CheckroomRoundedIcon />, color: meterColors.pointPink },
  PLASTIC: { icon: <LocalDrinkRoundedIcon />, color: meterColors.pointSky },
  CAN: { icon: <DeleteSweepRoundedIcon />, color: meterColors.pointGreen },
  MEDICINE: { icon: <MedicalServicesRoundedIcon />, color: meterColors.pointPurple },
};

const scan = keyframes`
  0% { top: 0%; }
  50% { top: calc(100% - 3px); }
  100% { top: 0%; }
`;

const cornerBase = { position: "absolute", width: 26, height: 26, borderColor: "rgba(255,255,255,0.85)", borderStyle: "solid", pointerEvents: "none" };
const CORNERS = [
  { top: 12, left: 12, borderWidth: "3px 0 0 3px", borderTopLeftRadius: 10 },
  { top: 12, right: 12, borderWidth: "3px 3px 0 0", borderTopRightRadius: 10 },
  { bottom: 12, left: 12, borderWidth: "0 0 3px 3px", borderBottomLeftRadius: 10 },
  { bottom: 12, right: 12, borderWidth: "0 3px 3px 0", borderBottomRightRadius: 10 },
];

function StepDot({ index, label, state }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 900,
          color: done ? "#000" : active ? meterColors.primary : meterColors.secondary,
          bgcolor: done ? "#fff" : "transparent",
          border: `1.5px solid ${done || active ? "#fff" : "rgba(255,255,255,0.25)"}`,
          transition: "all 0.25s ease",
        }}
      >
        {index}
      </Box>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: done || active ? meterColors.primary : meterColors.secondary, whiteSpace: "nowrap" }}>
        {label}
      </Typography>
    </Stack>
  );
}

const Camera = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [override, setOverride] = useState(null);

  const oauthId = getUser()?.oauthId;

  const onFileChosen = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setOverride(null);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const analyze = async () => {
    if (!oauthId) {
      alert("로그인이 필요합니다.");
      navigate("/");
      return;
    }
    if (!file) {
      alert("사진을 선택하거나 촬영해 주세요.");
      return;
    }

    try {
      setLoading(true);
      const uploadFile = await compressImage(file);
      const fd = new FormData();
      fd.append("image", uploadFile);
      fd.append("oauthId", oauthId);
      if (override) {
        fd.append("userSelectedType", override);
      }
      const data = await apiFetchMultipart("/ai/analyze", fd);
      setResult(data);
    } catch (e) {
      alert(e.message || "분석 실패");
    } finally {
      setLoading(false);
    }
  };

  const finalType = override || result?.finalType || result?.predictedType;
  const confirmAndGoMap = () => {
    if (finalType) {
      sessionStorage.setItem(HELD_KEY, finalType);
    }
    navigate("/map", { state: { focusMyLocation: true } });
  };

  const stepState = (n) => {
    const current = !file ? 1 : !result ? 2 : 3;
    if (n < current) return "done";
    if (n === current) return "active";
    return "idle";
  };

  const primaryAction = !file
    ? { label: "사진 촬영", onClick: () => cameraInputRef.current?.click(), disabled: false }
    : !result
      ? { label: loading ? "분석 중…" : "AI 분석 시작", onClick: analyze, disabled: loading }
      : { label: "지도로 돌아가기", onClick: confirmAndGoMap, disabled: !finalType };

  const predictedMeta = result ? TYPE_META[result.predictedType] : null;

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, pb: { xs: result ? 22 : 16, md: 4 } }}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFileChosen} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChosen} />

      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          bgcolor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Box sx={{ maxWidth: 1040, mx: "auto", px: { xs: 1.5, sm: 3 }, py: 1.2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={() => navigate("/map")} sx={{ color: meterColors.primary }} aria-label="지도로">
                <ArrowBackRoundedIcon />
              </IconButton>
              <Box>
                <Typography sx={{ fontSize: "0.62rem", letterSpacing: "0.2em", fontWeight: 800, color: meterColors.point }}>WASTE SCANNER</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", lineHeight: 1.2 }}>AI 분류</Typography>
              </Box>
            </Stack>
            {result && (
              <Box
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  px: 1.2,
                  py: 0.5,
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: meterColors.primaryMuted,
                  whiteSpace: "nowrap",
                }}
              >
                {result.rateLimitBypassed ? "남은 분석 무제한" : `오늘 남은 분석 ${result.remainingToday ?? "-"}회`}
              </Box>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, px: 0.5 }}>
            <StepDot index={1} label="사진" state={stepState(1)} />
            <Box sx={{ flex: 1, height: "1px", bgcolor: "rgba(255,255,255,0.15)" }} />
            <StepDot index={2} label="분석" state={stepState(2)} />
            <Box sx={{ flex: 1, height: "1px", bgcolor: "rgba(255,255,255,0.15)" }} />
            <StepDot index={3} label="결과" state={stepState(3)} />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1040,
          mx: "auto",
          px: { xs: 1.5, sm: 3 },
          pt: { xs: 2, sm: 3 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.15fr 1fr" },
          gap: { xs: 2, md: 3 },
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            position: "relative",
            aspectRatio: { xs: "4 / 3", md: "4 / 3.4" },
            borderRadius: "22px",
            overflow: "hidden",
            bgcolor: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundImage: preview
              ? "none"
              : "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {preview ? (
            <Box component="img" src={preview} alt="선택한 폐기물 미리보기" sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1.2} sx={{ position: "absolute", inset: 0, px: 3, textAlign: "center" }}>
              <CenterFocusStrongRoundedIcon sx={{ fontSize: 46, color: "rgba(255,255,255,0.35)" }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>분류할 물건을 프레임에 담아주세요</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: meterColors.secondary }}>의류, 플라스틱, 캔, 폐의약품</Typography>
            </Stack>
          )}

          {CORNERS.map((c, i) => (
            <Box key={i} sx={{ ...cornerBase, ...c }} />
          ))}

          {loading && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "3px",
                background: `linear-gradient(90deg, transparent, ${meterColors.point}, transparent)`,
                boxShadow: `0 0 16px ${meterColors.point}`,
                animation: `${scan} 1.8s ease-in-out infinite`,
              }}
            />
          )}

          <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" }}>
            <Button
              onClick={() => cameraInputRef.current?.click()}
              startIcon={<PhotoCameraRoundedIcon />}
              sx={{
                borderRadius: "999px",
                px: 2,
                bgcolor: "rgba(255,255,255,0.92)",
                color: "#000",
                fontWeight: 800,
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              {preview ? "다시 촬영" : "촬영"}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              startIcon={preview ? <RefreshRoundedIcon /> : <CollectionsRoundedIcon />}
              sx={{
                borderRadius: "999px",
                px: 2,
                bgcolor: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                fontWeight: 700,
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
              }}
            >
              앨범
            </Button>
          </Stack>
        </Box>

        <Stack spacing={2}>
          <AnimatePresence mode="wait">
            {result ? (
              <Box
                key="result"
                component={motion.div}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                sx={{
                  p: 2.2,
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.01))",
                }}
              >
                <Stack direction="row" spacing={1.8} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: predictedMeta?.color ?? meterColors.primary,
                      bgcolor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      "& svg": { fontSize: 30 },
                    }}
                  >
                    {predictedMeta?.icon ?? <CenterFocusStrongRoundedIcon />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.12em", color: meterColors.secondary }}>AI 판별 결과</Typography>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.2 }}>
                      {TYPE_LABELS[result.predictedType] ?? result.predictedType}
                    </Typography>
                    {result.recognizedItem && (
                      <Typography sx={{ fontSize: "0.82rem", color: meterColors.primaryMuted, wordBreak: "keep-all" }}>{result.recognizedItem}</Typography>
                    )}
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Box
                key="guide"
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                sx={{ p: 2.2, borderRadius: "18px", border: "1px dashed rgba(255,255,255,0.18)" }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>{file ? "사진이 준비됐습니다" : "사진을 먼저 올려주세요"}</Typography>
                <Typography sx={{ fontSize: "0.82rem", color: meterColors.secondary, mt: 0.5, wordBreak: "keep-all" }}>
                  {file ? "AI 분석을 시작하면 폐기물 유형을 알려드립니다." : "촬영하거나 앨범에서 고르면 AI가 유형을 판별합니다."}
                </Typography>
              </Box>
            )}
          </AnimatePresence>

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: meterColors.primaryMuted }}>유형 직접 지정</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: meterColors.secondary }}>AI 결과와 다르면 선택</Typography>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
              {Object.entries(TYPE_LABELS).map(([key, label]) => {
                const selected = override === key;
                const isAi = result?.predictedType === key;
                const meta = TYPE_META[key];
                return (
                  <ButtonBase
                    key={key}
                    onClick={() => setOverride(selected ? null : key)}
                    sx={{
                      position: "relative",
                      flexDirection: "column",
                      gap: 0.6,
                      py: 1.4,
                      borderRadius: "14px",
                      border: `1px solid ${selected ? "#fff" : "rgba(255,255,255,0.12)"}`,
                      bgcolor: selected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                      transition: "all 0.2s ease",
                      "&:hover": { borderColor: "rgba(255,255,255,0.4)" },
                    }}
                  >
                    {isAi && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 5,
                          right: 6,
                          fontSize: "0.56rem",
                          fontWeight: 900,
                          color: meterColors.point,
                        }}
                      >
                        AI
                      </Box>
                    )}
                    <Box sx={{ color: meta.color, display: "flex" }}>{meta.icon}</Box>
                    <Typography sx={{ fontSize: "0.76rem", fontWeight: 700 }}>{label}</Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          <Box
            sx={{
              position: { xs: "fixed", md: "static" },
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 6,
              p: { xs: 1.5, md: 0 },
              bgcolor: { xs: "rgba(0,0,0,0.9)", md: "transparent" },
              backdropFilter: { xs: "blur(12px)", md: "none" },
              borderTop: { xs: "1px solid rgba(255,255,255,0.1)", md: "none" },
            }}
          >
            <Stack spacing={1} sx={{ maxWidth: 1040, mx: "auto" }}>
              <Button
                fullWidth
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                sx={{
                  height: 50,
                  borderRadius: "14px",
                  bgcolor: "#fff",
                  color: "#000",
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  "&:hover": { bgcolor: "#e8e8e8" },
                  "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.25)", color: "rgba(0,0,0,0.6)" },
                }}
              >
                {primaryAction.label}
              </Button>
              {result && (
                <Button
                  fullWidth
                  onClick={analyze}
                  disabled={loading}
                  sx={{ height: 40, borderRadius: "12px", color: meterColors.primaryMuted, border: "1px solid rgba(255,255,255,0.2)", fontWeight: 700 }}
                >
                  {loading ? "분석 중…" : "다시 분석"}
                </Button>
              )}
              <Button
                fullWidth
                onClick={() => navigate("/map", { state: { focusMyLocation: true } })}
                sx={{ height: 34, color: meterColors.secondary, fontWeight: 600, fontSize: "0.8rem" }}
              >
                저장하지 않고 지도로
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Camera;
