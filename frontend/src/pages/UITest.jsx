import { Box, Stack, Typography, Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { meterColors } from "../theme/meterTheme";
import { WIREFRAME_MAP } from "./uiTest/wireframes";
import SystemDfd from "./uiTest/SystemDfd";
import CoreAlgorithms from "./uiTest/CoreAlgorithms";

const SCREEN_GROUPS = [
  {
    label: "시작",
    items: [
      { id: "main", label: "메인", route: "/" },
      { id: "nickname", label: "별명", route: "/nickname" },
    ],
  },
  {
    label: "서비스",
    items: [
      { id: "map", label: "지도", route: "/map" },
      { id: "overview", label: "서비스개요", route: "/map/overview" },
      { id: "camera", label: "AI 카메라", route: "/camera" },
      { id: "input", label: "투입", route: "/input" },
      { id: "db", label: "DB", route: "/db" },
      { id: "mypage", label: "마이", route: "/mypage" },
    ],
  },
  {
    label: "관리",
    items: [{ id: "manage", label: "관리자", route: "/manage" }],
  },
  {
    label: "기능 소개",
    items: [
      { id: "feature-smart", label: "AI", route: "/features/smart-disposal" },
      { id: "feature-iot", label: "IoT", route: "/features/iot" },
      { id: "feature-reward", label: "분석", route: "/features/reward" },
      { id: "feature-ops", label: "관제", route: "/features/operations" },
    ],
  },
];

const ALL_SCREENS = SCREEN_GROUPS.flatMap((g) => g.items);

/** 화면별 UI 설계 설명 (제안서 문체) */
const SCREEN_DESCRIPTIONS = {
  main: [
    "팀 로고와 프로젝트명(METER)을 상단 중앙에 배치합니다.",
    "그 아래에 서비스 주제·한 줄 소개 문구를 적습니다.",
    "상세 기능을 설명하는 소개 페이지로 이동하는 버튼 4개를 2×2 그리드로 배치합니다.",
    "하단에는 Google OAuth로 로그인하는 버튼이 있습니다. 로그인 후에는 「서비스 시작」 버튼으로 전환됩니다.",
  ],
  nickname: [
    "로고와 환영 아이콘으로 첫 진입 분위기를 만듭니다.",
    "「METER 시작하기」 제목과 별명 설정 안내 문구를 표시합니다.",
    "별명을 입력하는 텍스트 필드를 중앙에 배치합니다.",
    "입력 완료 후 지도 화면으로 이동하는 「METER 입장」 버튼이 있습니다.",
  ],
  map: [
    "화면 전체를 지도 영역으로 사용합니다. (KAKAO MAP 활용)",
    "상단에는 로고, 서비스명, 사용자 별명, 계정 메뉴를 배치합니다.",
    "지도 위에 모듈 마커와 사용자 현재 위치를 표시합니다.",
    "하단 툴바에 서비스개요·AI 카메라·최적경로·DB 조회·관리자 버튼을 둡니다.",
    "좌측 하단에 「내 위치」 버튼, 우측에 AI 챗봇 버튼을 배치합니다.",
  ],
  overview: [
    "「서비스개요」 제목과 지도로 돌아가는 버튼을 상단에 둡니다.",
    "프로젝트 소개·팀 소개·핵심 기능 탭 3개로 콘텐츠를 전환합니다.",
    "선택한 탭에 맞는 소개 본문이 아래 영역에 표시됩니다.",
  ],
  camera: [
    "「AI 카메라」 제목과 서비스 설명 문구를 상단에 배치합니다.",
    "카메라 촬영·파일 선택 버튼으로 이미지를 업로드합니다.",
    "선택한 사진 미리보기와 「분석」 버튼으로 AI 유형 판별을 실행합니다.",
    "결과 영역에 예측 유형·투입 안내·남은 분석 횟수를 표시합니다.",
    "직접 유형 선택 칩과 「분류 확정 후 지도로」 버튼으로 지도 연동을 마칩니다.",
  ],
  input: [
    "모듈 투입 대기 상태를 안내하는 제목과 설명 문구를 중앙에 둡니다.",
    "※ 신청서 핵심 흐름이 아닌, TRESS 프로토타입 기반 READY→CHECK 보조 화면입니다.",
    "IoT IR 감지 시 CHECK MQTT → 서버 PENDING 완료 처리를 폴링합니다.",
  ],
  db: [
    "「모듈 DB 조회」 제목과 지도 복귀 버튼을 상단에 배치합니다.",
    "유형별로 그룹화된 모듈 목록 테이블을 표시합니다.",
    "시리얼 번호·적재량·연결 상태·좌표 등 모듈 정보를 한눈에 조회할 수 있습니다.",
  ],
  route: [
    "「최적 수거 경로」 제목과 지도 복귀 버튼을 상단에 둡니다.",
    "만재·적재 위험 모듈을 우선, 오프라인 모듈을 후순위로 정렬한 수거 순서 목록을 표시합니다.",
    "각 항목에 모듈명·유형·적재 상태·위치 정보를 함께 보여줍니다.",
  ],
  mypage: [
    "「마이페이지」 제목 아래에 사용자 정보 카드를 배치합니다.",
    "별명·이메일·역할·계정 상태를 항목별로 나열합니다.",
    "하단에 지도로 돌아가는 버튼이 있습니다.",
  ],
  manage: [
    "관리자 전용 콘솔 화면입니다. 상단에 제목과 지도 복귀 버튼을 둡니다.",
    "사용자 관리·모듈 관리·MQTT 로그 탭으로 기능을 구분합니다.",
    "테이블과 폼을 통해 사용자·모듈 CRUD 및 상태 변경을 수행합니다.",
  ],
  "feature-smart": [
    "메인에서 진입하는 AI 카메라 기능 소개 페이지입니다.",
    "로고·배지·제목·부제·설명 문구로 기능 개요를 전달합니다.",
    "지원 자원 유형 칩과 핵심 기능 bullet 목록을 배치합니다.",
    "하단 「메인으로」 버튼으로 랜딩 페이지에 돌아갑니다.",
  ],
  "feature-iot": [
    "IoT 실시간 적재 측정 기능을 소개하는 페이지입니다.",
    "초음파 센서·MQTT·LED 상태 연동 내용을 설명합니다.",
    "핵심 키워드 칩과 상세 bullet로 기술 구성을 보여줍니다.",
  ],
  "feature-reward": [
    "데이터 분석 및 수거 동선 기능 소개 페이지입니다.",
    "만재 우선 정렬·최적 경로·리워드 연동을 설명합니다.",
    "수거 우선순위 로직과 사용자 보상 흐름을 bullet로 정리합니다.",
  ],
  "feature-ops": [
    "통합 관제 플랫폼 기능 소개 페이지입니다.",
    "지도·DB·관리자 콘솔이 하나의 플랫폼으로 연결됨을 설명합니다.",
    "Kakao Map 기반 모니터링과 모듈·사용자 운영 흐름을 안내합니다.",
  ],
};

function DesignNote({ lines }) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderBottom: `1px solid ${meterColors.border}`,
        bgcolor: "rgba(255,255,255,0.03)",
      }}
    >
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.1em", mb: 1 }}>
        UI 설계
      </Typography>
      <Stack spacing={0.8}>
        {lines.map((line) => (
          <Typography key={line} sx={{ fontSize: "0.84rem", color: meterColors.primaryMuted, lineHeight: 1.65 }}>
            · {line}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

/** /test — 제안서용 UI 설계서 (툴바로 화면 전환) */
export default function UITest() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = searchParams.get("screen") || "main";

  const active = ALL_SCREENS.find((s) => s.id === screen) ?? ALL_SCREENS[0];
  const Wireframe = WIREFRAME_MAP[active.id] ?? WIREFRAME_MAP.main;
  const isFullBleed = active.id === "map";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, display: "flex", flexDirection: "column" }}>
      {/* 툴바 */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${meterColors.border}`,
          bgcolor: "rgba(10,10,10,0.96)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: { xs: 1.5, sm: 2 }, py: 1, gap: 1, flexWrap: "wrap" }}
        >
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: "0.95rem" }}>UI TEST</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: meterColors.secondary }}>제안서용 화면 설계</Typography>
          </Stack>
          <Button
            size="small"
            endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "1rem !important" }} />}
            onClick={() => navigate(active.route)}
            sx={{ color: meterColors.secondary, textTransform: "none", fontSize: "0.78rem" }}
          >
            실제 페이지
          </Button>
        </Stack>

        <Box sx={{ overflowX: "auto", px: { xs: 1.5, sm: 2 }, pb: 1.5 }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: "max-content" }}>
            {SCREEN_GROUPS.map((group) => (
              <Stack key={group.label} spacing={0.6}>
                <Typography sx={{ fontSize: "0.65rem", color: meterColors.secondary, letterSpacing: "0.08em", px: 0.5 }}>
                  {group.label}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={screen}
                  onChange={(_, val) => val && setSearchParams({ screen: val })}
                  sx={{
                    gap: 0.5,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: `1px solid ${meterColors.border} !important`,
                      borderRadius: "8px !important",
                      mx: 0,
                    },
                  }}
                >
                  {group.items.map((item) => (
                    <ToggleButton
                      key={item.id}
                      value={item.id}
                      sx={{
                        px: 1.4,
                        py: 0.6,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        textTransform: "none",
                        color: meterColors.secondary,
                        "&.Mui-selected": {
                          bgcolor: "rgba(255,255,255,0.12)",
                          color: meterColors.primary,
                          "&:hover": { bgcolor: "rgba(255,255,255,0.16)" },
                        },
                      }}
                    >
                      {item.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* 미리보기 */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 0.8, borderBottom: `1px solid ${meterColors.border}`, bgcolor: meterColors.bgElevated }}
        >
          <Typography sx={{ fontSize: "0.78rem", color: meterColors.secondary }}>
            {active.label} · <Box component="span" sx={{ color: meterColors.primaryMuted }}>{active.route}</Box>
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary }}>/test?screen={active.id}</Typography>
        </Stack>

        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            bgcolor: isFullBleed ? "#0a0a0a" : meterColors.bg,
          }}
        >
          <DesignNote lines={SCREEN_DESCRIPTIONS[active.id] ?? SCREEN_DESCRIPTIONS.main} />
          <Wireframe />
          <SystemDfd />
          <CoreAlgorithms />
        </Box>
      </Box>
    </Box>
  );
}
