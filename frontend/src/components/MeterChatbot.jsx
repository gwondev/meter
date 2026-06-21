import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { apiFetch } from "../services/api";
import { meterColors } from "../theme/meterTheme";

const SUGGESTIONS = [
  "이번 주 집중 관리가 필요한 모듈은?",
  "적재량이 가장 높은 모듈은?",
  "오프라인 모듈이 몇 개인가요?",
];

export default function MeterChatbot() {
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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
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
    <Paper
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: meterColors.bgElevated,
        border: `1px solid ${meterColors.border}`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${meterColors.border}` }}>
        <SmartToyRoundedIcon sx={{ fontSize: 20, color: meterColors.primaryMuted }} />
        <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>METER AI 챗봇</Typography>
      </Stack>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        <Stack spacing={1}>
          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                px: 1.2,
                py: 0.9,
                borderRadius: 2,
                bgcolor: m.role === "user" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${meterColors.border}`,
              }}
            >
              <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.text}</Typography>
            </Box>
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
  );
}
