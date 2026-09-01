import { Box, Stack, Typography } from "@mui/material";
import { meterColors } from "../../theme/meterTheme";

const ALGORITHMS = [
  {
    title: "적재량 변화 분석 및 예측 알고리즘",
    tags: ["Time-Series", "Threshold Classification", "Fill-Rate Estimation"],
    summary:
      "보드가 보낸 fillPercent(0~100) 텔레메트리를 기준으로 모듈별 수거 필요도를 정량화하고, 챗봇·지도 표시에 반영합니다.",
    bullets: [
      "Board-Computed Fill — D/R 모듈이 자체 산출한 fillPercent만 사용 (서버는 환산하지 않음)",
      "Piecewise Display — ≥80 수거 필요 · ≥50 주의 · 그 외 여유 (지도·목록 공통)",
      "Signal Window — D 90초 / R 12분 미수신 시 「신호 대기중」",
      "Legacy Compat — 구형 heightCm 페이로드만 서버에서 fill%로 환산",
    ],
    impl: "구현: ModuleIotMqttHandler(fillPercent) → moduleDisplayState() · MeterChatService DB 스냅샷",
  },
  {
    title: "최적 수거 경로 추천 알고리즘",
    tags: ["VRP", "TSP Heuristic", "Multi-Criteria Sort"],
    summary:
      "화면 안 모듈 전부를 방문. 만재 우선 정렬 + 도로망 경로. 도로가 모듈 앞에서 끊기면 직선 링크·진행 방향 화살표.",
    bullets: [
      "Visit All Visible — 적재율 필터 없음 (화면 좌표 유효 모듈 전부 후보)",
      "Multi-Criteria Urgency Cost — cost=dist×(1+((100−fill)/100)²×3); 만재일수록 방문 우선",
      "Exact TSP (n≤8) / NN+2-opt — urgency 비용으로 전순열 또는 국소 개선",
      "Road Network + Snap Gap — OSRM driving + 도로 끝↔모듈 직선 연결",
      "Direction Arrows — 진행 방향 화살표 오버레이",
    ],
    impl: "구현: collectionRoute.js — urgency TSP · OSRM · 직선 링크 · 화살표",
  },
  {
    title: "생성형 AI 기반 NLU & Vision 품목 분류",
    tags: ["RAG", "Gemini Vision", "Multimodal LLM"],
    summary:
      "Gemini API 기반 Multimodal LLM으로 자연어 질의응답(NLU)과 이미지 인식(Vision) 품목 분류를 통합 제공합니다.",
    bullets: [
      "Context-Augmented Generation — Module DB 스냅샷을 system prompt에 주입하는 RAG-lite 구조 (환각·추측 최소화)",
      "Zero-Shot Vision Classification — CLOTHING · PLASTIC · CAN · MEDICINE 4-class taxonomy 자원 유형 분류",
      "Structured Output Parsing — Gemini Vision 응답 → predictedType · recognizedItem JSON 역직렬화",
      "Semantic Query over Telemetry — 「이번 주 관리 필요 구역」 등 자연어 → 정형 텔레메트리 기반 인사이트 생성",
      "Rate-Limited Inference — 일일 호출 quota · 관리자 bypass로 API 비용·남용 제어",
    ],
    impl: "구현: MeterChatService.chat() · AiController /analyze · Gemini 2.5 Flash",
  },
];

function AlgoCard({ title, tags, summary, bullets, impl }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${meterColors.border}`,
        bgcolor: "rgba(255,255,255,0.02)",
      }}
    >
      <Stack spacing={1.2}>
        <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", color: meterColors.primary }}>{title}</Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.6}>
          {tags.map((t) => (
            <Box
              key={t}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: meterColors.primaryMuted,
                border: `1px solid ${meterColors.border}`,
                bgcolor: "rgba(255,255,255,0.04)",
              }}
            >
              {t}
            </Box>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.8rem", color: meterColors.secondary, lineHeight: 1.6 }}>{summary}</Typography>
        <Stack spacing={0.6}>
          {bullets.map((b) => (
            <Typography key={b} sx={{ fontSize: "0.76rem", color: meterColors.primaryMuted, lineHeight: 1.55, pl: 1.2 }}>
              · {b}
            </Typography>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary, fontStyle: "italic", pt: 0.5, borderTop: `1px dashed ${meterColors.border}` }}>
          {impl}
        </Typography>
      </Stack>
    </Box>
  );
}

/** 핵심 알고리즘 — UI TEST 하단 (신청서 고도화) */
export default function CoreAlgorithms() {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${meterColors.border}`,
        bgcolor: meterColors.bg,
        px: { xs: 2, sm: 3 },
        py: 3,
      }}
    >
      <Stack spacing={2.5} sx={{ maxWidth: 900, mx: "auto" }}>
        <Stack spacing={0.8}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>❍ 핵심 알고리즘 및 활용 기술</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: meterColors.secondary, lineHeight: 1.65 }}>
            신청서 「핵심 알고리즘 및 활용 기술」 항목 고도화 — IoT 텔레메트리 · 경로 최적화 · 생성형 AI를 전문 용어로 정리합니다.
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          {ALGORITHMS.map((algo) => (
            <AlgoCard key={algo.title} {...algo} />
          ))}
        </Stack>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${meterColors.border}`,
            bgcolor: meterColors.bgElevated,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: meterColors.secondary, mb: 0.8 }}>
            활용 기술 스택
          </Typography>
          <Typography sx={{ fontSize: "0.74rem", color: meterColors.primaryMuted, lineHeight: 1.65 }}>
            IoT: ESP32 · HC-SR04 · MQTT(Publish/Subscribe) · Backend: Spring Boot · JPA · Mosquitto Broker ·
            AI: Google Gemini 2.5 Flash(Vision + Text) · Frontend: React · Kakao Map API ·
            Optimization: Multi-Criteria Decision Making(MCDM) · TSP Heuristic · VRP 변형
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
