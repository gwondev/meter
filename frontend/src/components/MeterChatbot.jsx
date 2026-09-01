import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "../services/api";
import { meterColors } from "../theme/meterTheme";

const SUGGESTIONS = [
  "지금 수거해야 하는 모듈은?",
  "적재율이 가장 높은 모듈은?",
  "신호 대기중인 모듈 몇 개?",
];

const spring = { type: "spring", stiffness: 420, damping: 32, mass: 0.85 };

/** 서버에서 한 번 걸러내지만, 모델이 규칙을 어긴 응답이 화면에 그대로 나오지 않게 막는다. */
function stripMarkdown(text) {
  if (!text) return "";
  return String(text)
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/^\s*[*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** docked=true 이면 지도 하단 바에 인라인 배치(내 위치·AI 카메라와 같은 높이). */
export default function MeterChatbot({ docked = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "모듈 적재율·신호 상태를 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (!open) setOpen(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      setMessages((prev) => [...prev, { role: "bot", text: stripMarkdown(res?.reply) || "응답 없음" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "bot", text: e?.message || "챗봇 오류" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: docked ? "relative" : "fixed",
        right: docked ? "auto" : { xs: 12, sm: 16 },
        bottom: docked ? "auto" : { xs: 88, sm: 92 },
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
      }}
    >
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.45, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.45, y: 24 }}
            transition={spring}
            style={{ transformOrigin: "bottom right", width: "100%" }}
          >
            <Paper
              elevation={8}
              sx={{
                position: docked ? "absolute" : "relative",
                right: docked ? 0 : "auto",
                bottom: docked ? "calc(100% + 10px)" : "auto",
                width: { xs: "min(94vw, 440px)", sm: 480 },
                height: { xs: "min(76dvh, 620px)", sm: 640 },
                display: "flex",
                flexDirection: "column",
                bgcolor: meterColors.bgElevated,
                border: `1px solid ${meterColors.borderStrong}`,
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  px: 1.5,
                  py: 1,
                  borderBottom: `1px solid ${meterColors.border}`,
                  bgcolor: "rgba(255,255,255,0.03)",
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: `1px solid ${meterColors.border}`,
                  }}
                >
                  <SmartToyRoundedIcon sx={{ fontSize: 24, color: meterColors.primaryMuted }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", lineHeight: 1.2 }}>METER AI</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: meterColors.secondary }}>모듈 데이터 기반 상담</Typography>
                </Box>
                <IconButton size="small" onClick={() => setOpen(false)} aria-label="챗봇 닫기">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}>
                <Stack spacing={1}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, delay: i === messages.length - 1 ? 0.05 : 0 }}
                    >
                      <Box
                        sx={{
                          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                          maxWidth: "92%",
                          px: 1.5,
                          py: 1.1,
                          borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          bgcolor: m.role === "user" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${meterColors.border}`,
                          ml: m.role === "user" ? "auto" : 0,
                          mr: m.role === "user" ? 0 : "auto",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.text}</Typography>
                      </Box>
                    </motion.div>
                  ))}
                  {loading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                      <CircularProgress size={16} sx={{ color: meterColors.primaryMuted }} />
                      <Typography sx={{ fontSize: "0.78rem", color: meterColors.secondary }}>분석 중…</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={0.6} sx={{ px: 1.5, pb: 0.8 }}>
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    size="small"
                    onClick={() => send(s)}
                    sx={{
                      fontSize: "0.76rem",
                      textTransform: "none",
                      borderRadius: 999,
                      color: meterColors.secondary,
                      border: `1px solid ${meterColors.border}`,
                      px: 1.2,
                      py: 0.4,
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </Stack>

              <Stack direction="row" spacing={0.8} sx={{ p: 1.2, borderTop: `1px solid ${meterColors.border}` }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="모듈 데이터에 대해 질문…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button size="small" onClick={() => send()} disabled={loading || !input.trim()}>
                          <SendRoundedIcon fontSize="small" />
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { color: meterColors.primary, fontSize: "0.95rem", py: 0.4 },
                  }}
                />
              </Stack>
            </Paper>
          </motion.div>
        ) : (
          <motion.div
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
          >
            <IconButton
              onClick={() => setOpen(true)}
              aria-label="METER AI 챗봇 열기"
              sx={{
                width: docked ? 48 : 64,
                height: docked ? 48 : 64,
                bgcolor: meterColors.primary,
                color: meterColors.bg,
                border: `2px solid ${meterColors.borderStrong}`,
                boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
                "&:hover": { bgcolor: "#fff", color: meterColors.bg },
              }}
            >
              <SmartToyRoundedIcon sx={{ fontSize: docked ? 24 : 28 }} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
