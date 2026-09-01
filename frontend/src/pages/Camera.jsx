import { useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import { getUser } from "../services/auth";
import { apiFetchMultipart } from "../services/api";
import { compressImage } from "../utils/compressImage";

const HELD_KEY = "meter.finalWasteType";

const TYPE_LABELS = {
  CLOTHING: "의류",
  PLASTIC: "플라스틱",
  CAN: "캔",
  MEDICINE: "폐의약품",
};

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

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        minHeight: "100dvh",
        bgcolor: "#030403",
        color: "#fff",
        py: { xs: 2, sm: 3.5 },
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowX: "hidden",
      }}
    >
      <Container maxWidth={false} sx={{ display: "flex", justifyContent: "center", px: { xs: 1.25, sm: 2 } }}>
        <Stack
          spacing={{ xs: 2.1, sm: 3 }}
          alignItems="stretch"
          textAlign="center"
          sx={{ width: "min(100%, 520px)", mx: "auto" }}
        >
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
            AI 카메라
          </Typography>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.72)",
              fontSize: { xs: "0.82rem", sm: "0.92rem" },
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            촬영하면 자원 유형을 판별하고 맞는 거점을 안내합니다.
          </Typography>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onFileChosen}
          />
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChosen} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%", justifyContent: "center", alignItems: "stretch" }}>
            <Button
              variant="contained"
              startIcon={<PhotoCameraRoundedIcon />}
              onClick={() => cameraInputRef.current?.click()}
              sx={{ bgcolor: "#ffffff", color: "#000", fontWeight: 800, py: 1.2, width: { xs: "100%", sm: "calc(50% - 6px)" } }}
            >
              카메라 / 촬영
            </Button>
            <Button
              variant="outlined"
              startIcon={<ImageRoundedIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.45)", fontWeight: 700, width: { xs: "100%", sm: "calc(50% - 6px)" } }}
            >
              파일에서 선택
            </Button>
          </Stack>

          {preview && (
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                alignSelf: "stretch",
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.25)",
                bgcolor: "rgba(0,0,0,0.45)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                minHeight: { xs: 200, sm: 220 },
                maxHeight: { xs: "42vh", sm: "40vh" },
                p: { xs: 1, sm: 1.25 },
              }}
            >
              <Box
                component="img"
                src={preview}
                alt="선택한 폐기물 미리보기"
                sx={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: { xs: "calc(42vh - 24px)", sm: "calc(40vh - 32px)" },
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  objectPosition: "center center",
                  margin: "0 auto",
                }}
              />
            </Paper>
          )}

          <Button
            disabled={loading || !file}
            variant="contained"
            onClick={analyze}
            sx={{ bgcolor: "#1a1a1a", color: "#ffffff", border: "1px solid rgba(255,255,255,0.35)", fontWeight: 800, minWidth: 220 }}
          >
            {loading ? "분석 중…" : "분석"}
          </Button>

              {result && (
            <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", width: "100%", textAlign: "left" }}>
              <Typography sx={{ color: "#ffffff", fontWeight: 800, mb: 1, textAlign: "center" }}>
                AI 예측: {TYPE_LABELS[result.predictedType] ?? result.predictedType}
              </Typography>
              {result.recognizedItem && (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mb: 1, textAlign: "center" }}>
                  인식: {result.recognizedItem}
                </Typography>
              )}
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 700, display: "block", mb: 0.5 }}>
                  투입 안내
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6, textAlign: "center" }}>
                  {TYPE_LABELS[finalType] ?? finalType} 모듈이 있는 가까운 거점을 지도에서 확인하세요.
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", display: "block", mt: 1, textAlign: "center" }}>
                {result.rateLimitBypassed
                  ? "오늘 남은 분석: 무제한 (관리자)"
                  : `오늘 남은 분석: ${result.remainingToday ?? "-"}회`}
              </Typography>
            </Paper>
          )}

          <Box sx={{ width: "100%" }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: "rgba(255,255,255,0.9)", textAlign: "center" }}>
              직접 선택 (부가 확인)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" useFlexGap>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  onClick={() => setOverride(key)}
                  sx={{
                    borderColor: override === key ? "#ffffff" : "rgba(255,255,255,0.2)",
                    color: override === key ? "#000" : "#fff",
                    bgcolor: override === key ? "#ffffff" : "rgba(255,255,255,0.06)",
                    fontWeight: 700,
                    "&:hover": { bgcolor: override === key ? "#e0e0e0" : "rgba(255,255,255,0.12)" },
                  }}
                  variant={override === key ? "filled" : "outlined"}
                />
              ))}
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", mt: 1.5, display: "block", textAlign: "center" }}>
              선택 후 「지도로」해주세요.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%", justifyContent: "center", pt: 1, alignItems: "stretch" }}>
            <Button
              variant="contained"
              disabled={!finalType}
              onClick={confirmAndGoMap}
              sx={{ bgcolor: "#ffffff", color: "#000", fontWeight: 900, flex: 1, width: { xs: "100%", sm: "calc(50% - 6px)" } }}
            >
              분류 확정 후 지도로
            </Button>
            <Button
              variant="outlined"
              sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.35)", width: { xs: "100%", sm: "calc(50% - 6px)" } }}
              onClick={() => navigate("/map", { state: { focusMyLocation: true } })}
            >
              지도로 (저장 안 함)
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Camera;
