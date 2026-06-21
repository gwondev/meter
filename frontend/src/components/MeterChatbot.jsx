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
  "이번 주 집중 관리가 필요한 모듈은?",
  "적재량이 가장 높은 모듈은?",
  "오프라인 모듈이 몇 개인가요?",
];

const spring = { type: "spring", stiffness: 420, damping: 32, mass: 0.85 };

export default function MeterChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "METER AI입니다. 모듈 DB 적재·연결·투입 데이터를 바탕으로 질문해 주세요.",
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
      setMessages((prev) => [...prev, { role: "bot", text: res?.reply || "응답 없음" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "bot", text: e?.message || "챗봇 오류" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 16 },
        bottom: { xs: 88, sm: 92 },
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
                width: { xs: "min(92vw, 360px)", sm: 380 },
                height: { xs: "min(62dvh, 520px)", sm: 500 },
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
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: `1px solid ${meterColors.border}`,
                  }}
                >
                  <SmartToyRoundedIcon sx={{ fontSize: 20, color: meterColors.primaryMuted }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2 }}>METER AI</Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary }}>모듈 데이터 기반 상담</Typography>
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
                          px: 1.2,
                          py: 0.9,
                          borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          bgcolor: m.role === "user" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${meterColors.border}`,
                          ml: m.role === "user" ? "auto" : 0,
                          mr: m.role === "user" ? 0 : "auto",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.text}</Typography>
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
                      fontSize: "0.68rem",
                      textTransform: "none",
                      color: meterColors.secondary,
                      border: `1px solid ${meterColors.border}`,
                      py: 0.2,
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
                    "& .MuiOutlinedInput-root": { color: meterColors.primary, fontSize: "0.85rem" },
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
                width: 56,
                height: 56,
                bgcolor: meterColors.primary,
                color: meterColors.bg,
                border: `2px solid ${meterColors.borderStrong}`,
                boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
                "&:hover": { bgcolor: "#fff", color: meterColors.bg },
              }}
            >
              <SmartToyRoundedIcon />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
