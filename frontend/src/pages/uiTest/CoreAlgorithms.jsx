import { Box, Stack, Typography } from "@mui/material";
import { meterColors } from "../../theme/meterTheme";

const ALGORITHMS = [
  {
    title: "적재량 변화 분석 및 예측 알고리즘",
    tags: ["Time-Series", "Threshold Classification", "Fill-Rate Estimation"],
    summary:
      "MQTT 기반 heightCm 시계열 텔레메트리를 분석하여 모듈별 적재 상태를 정량화하고, 수거 시점을 사전 예측합니다.",
    bullets: [
      "Piecewise Threshold Model — heightCm 구간별 FULL(≤10cm) · 주의(≤30cm) · 여유(≤50cm) 상태 분류",
      "Fill-Rate Estimation — Δheight/Δt 기반 적재 소진 속도(depletion velocity) 산출 및 잔여 수명(Remaining Capacity) 추정",
      "Moving Average / Exponential Smoothing — 초음파 센서 노이즈 억제 및 단기·중기 추세(trend) 분리",
      "Anomaly Detection — 급격한 heightCm 이상치(outlier) 탐지로 센서 오류·외부 간섭 구분",
      "Forecasting Pipeline — 시계열 회귀·감쇠 모델을 활용한 N시간 후 FULL 도달 시점 예측 (운영 의사결정 지원)",
    ],
    impl: "구현: ModuleIotMqttHandler(HEIGHT) → fillLevelFromHeight() · MeterChatService DB 스냅샷 집계",
  },
  {
    title: "최적 수거 경로 추천 알고리즘",
    tags: ["VRP", "TSP Heuristic", "Multi-Criteria Sort"],
    summary:
      "다중 거점 모듈에 대한 Capacitated Vehicle Routing Problem(C-VRP) 변형을 적용하고, 우선순위 기반 방문 순서를 산출합니다.",
    bullets: [
      "Multi-Criteria Urgency Cost — cost=dist×(1+((100−fill)/100)²×3); 만재일수록 방문 우선",
      "Eligibility Gate — 활성 신호 · 좌표 유효 · fillPercent≥50% 만 후보",
      "Exact TSP (n≤8) / NN+2-opt — 동일 urgency 비용으로 전순열 또는 국소 개선",
      "Road Network Geometry — OSRM driving 경로로 도로를 따라가는 폴리라인 (직선 금지)",
      "Kakao Map Overlay — 검정 본선+흰 외곽선으로 밝은 지도 위 가독성 확보",
    ],
    impl: "구현: collectionRoute.js — urgency TSP(≤8 완전탐색 / NN+2-opt) · OSRM 도로망 폴리라인 · Kakao Map 검정 선 시각화",
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
