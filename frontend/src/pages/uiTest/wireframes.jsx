import { Box, Stack, Typography } from "@mui/material";
import meterLogo from "../../assets/meter-logo.png";
import { meterColors } from "../../theme/meterTheme";

/** 점선 와이어 영역 */
export function WireArea({ label, hint, height = "auto", sx = {} }) {
  return (
    <Box
      sx={{
        minHeight: height,
        border: `1.5px dashed ${meterColors.border}`,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 1.5,
        textAlign: "center",
        ...sx,
      }}
    >
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: meterColors.primaryMuted }}>{label}</Typography>
      {hint && (
        <Typography sx={{ fontSize: "0.7rem", color: meterColors.secondary, mt: 0.5, lineHeight: 1.45 }}>{hint}</Typography>
      )}
    </Box>
  );
}

/** 버튼 자리 와이어 */
function WireBtn({ label, sx = {} }) {
  return (
    <Box
      sx={{
        border: `1.5px dashed ${meterColors.border}`,
        borderRadius: 999,
        px: 2,
        py: 0.9,
        fontSize: "0.78rem",
        fontWeight: 700,
        color: meterColors.primaryMuted,
        textAlign: "center",
        bgcolor: "rgba(255,255,255,0.02)",
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}

/** 페이지 상단 — 제목 + 복귀 버튼 와이어 */
function WirePageHeader({ title, back = "← 복귀" }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>{title}</Typography>
      <WireBtn label={back} sx={{ py: 0.5, px: 1.5, fontSize: "0.72rem" }} />
    </Stack>
  );
}

/** 탭/칩 자리 — 가로 나열 */
function WireTabRow({ labels, activeIndex = 0 }) {
  return (
    <Stack direction="row" spacing={1}>
      {labels.map((label, i) => (
        <WireBtn
          key={label}
          label={label}
          sx={{
            flex: 1,
            borderStyle: i === activeIndex ? "solid" : "dashed",
            borderColor: i === activeIndex ? meterColors.borderStrong : meterColors.border,
            py: 1.1,
          }}
        />
      ))}
    </Stack>
  );
}

function FeatureIntroWire({ title }) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 4, px: 2, maxWidth: 480, mx: "auto" }}>
      <Box component="img" src={meterLogo} alt="METER" sx={{ width: 44, mixBlendMode: "screen", opacity: 0.85 }} />
      <WireArea label="기능 배지" height={32} sx={{ width: 140 }} />
      <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>{title}</Typography>
      <WireArea label="부제 / 한 줄 설명" height={44} sx={{ width: "100%" }} />
      <WireArea label="상세 설명 문단" height={72} sx={{ width: "100%" }} />
      <WireArea label="키워드 칩 영역" hint="태그 나열" height={40} sx={{ width: "100%" }} />
      <WireArea label="기능 bullet 목록" height={120} sx={{ width: "100%" }} />
      <WireBtn label="메인으로" sx={{ minWidth: 120 }} />
    </Stack>
  );
}

export function MainWireframe() {
  return (
    <Stack spacing={3} alignItems="center" textAlign="center" sx={{ py: 5, px: 2 }}>
      <Box component="img" src={meterLogo} alt="METER" sx={{ width: 56, mixBlendMode: "screen", opacity: 0.9 }} />
      <Typography sx={{ fontSize: { xs: "2.5rem", sm: "3.5rem" }, fontWeight: 900, letterSpacing: "0.18em" }}>
        METER
      </Typography>
      <WireArea label="프로젝트 상세설명" height={56} sx={{ width: "100%", maxWidth: 520 }} />

      <Box sx={{ width: "100%", maxWidth: 520, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
        {["기능 소개 버튼 1", "기능 소개 버튼 2", "기능 소개 버튼 3", "기능 소개 버튼 4"].map((label) => (
          <WireArea key={label} label={label} height={88} />
        ))}
      </Box>

      <WireArea label="Google 로그인 버튼" hint="OAuth · 로그인 후 서비스 시작" height={48} sx={{ width: 280, borderRadius: 999 }} />
    </Stack>
  );
}

export function NicknameWireframe() {
  return (
    <Stack spacing={2.5} alignItems="center" sx={{ py: 6, px: 2, maxWidth: 400, mx: "auto" }}>
      <Box component="img" src={meterLogo} alt="METER" sx={{ width: 48, mixBlendMode: "screen", opacity: 0.85 }} />
      <WireArea label="환영 아이콘" height={72} sx={{ width: 72, borderRadius: 3 }} />
      <Typography sx={{ fontWeight: 900, fontSize: "1.6rem" }}>METER 시작하기</Typography>
      <WireArea label="안내 문구" height={48} sx={{ width: "100%" }} />
      <WireArea label="별명 입력 필드" height={52} sx={{ width: "100%" }} />
      <WireBtn label="METER 입장" sx={{ width: "100%", maxWidth: 280, py: 1.4 }} />
    </Stack>
  );
}

export function MapWireframe() {
  const bottomBtns = ["서비스개요", "AI 카메라", "최적경로", "DB", "관리자"];

  return (
    <Box sx={{ position: "relative", minHeight: 520, bgcolor: "#0a0a0a" }}>
      <Box sx={{ position: "absolute", inset: 0, p: 1.5 }}>
        <WireArea label="지도 화면" hint="KAKAO MAP · 모듈 마커 · 사용자 위치" height="100%" />
      </Box>

      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, px: 1.5, py: 1 }}>
        <WireArea label="상단 바" hint="로고 · METER · 사용자명 · 계정 메뉴" height={40} sx={{ borderStyle: "solid", bgcolor: "rgba(0,0,0,0.6)" }} />
      </Box>

      <Box sx={{ position: "absolute", left: 12, bottom: 72, zIndex: 2 }}>
        <WireBtn label="내 위치" sx={{ fontSize: "0.65rem", py: 0.5, px: 1.2 }} />
      </Box>

      <Box
        sx={{
          position: "absolute",
          right: 12,
          bottom: 80,
          zIndex: 2,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `1.5px dashed ${meterColors.border}`,
          display: "grid",
          placeItems: "center",
          fontSize: "0.6rem",
          color: meterColors.secondary,
          bgcolor: "rgba(0,0,0,0.6)",
        }}
      >
        봇
      </Box>

      <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2, px: 1.5, py: 1, bgcolor: "rgba(0,0,0,0.75)" }}>
        <Stack direction="row" flexWrap="wrap" gap={0.6}>
          {bottomBtns.map((b) => (
            <WireBtn key={b} label={b} sx={{ flex: 1, minWidth: 0, fontSize: "0.65rem", py: 0.7 }} />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export function OverviewWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 3, px: 2, maxWidth: 640, mx: "auto" }}>
      <WirePageHeader title="서비스개요" back="지도로" />
      <WireTabRow labels={["프로젝트 소개", "팀 소개", "핵심 기능"]} />
      <WireArea label="탭 콘텐츠 영역" hint="선택 탭 본문" height={340} />
    </Stack>
  );
}

export function CameraWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 3, px: 2, maxWidth: 480, mx: "auto" }}>
      <Typography sx={{ fontWeight: 900, fontSize: "1.4rem", textAlign: "center" }}>AI 카메라</Typography>
      <WireArea label="설명 문구" height={44} sx={{ width: "100%" }} />
      <Stack direction="row" spacing={1}>
        <WireBtn label="카메라 / 촬영" sx={{ flex: 1 }} />
        <WireBtn label="파일 선택" sx={{ flex: 1 }} />
      </Stack>
      <WireArea label="이미지 미리보기" height={180} />
      <WireBtn label="분석" sx={{ alignSelf: "center", minWidth: 160 }} />
      <WireArea label="AI 분석 결과" height={100} />
      <WireArea label="유형 직접 선택 (칩)" height={40} />
      <Stack direction="row" spacing={1}>
        <WireBtn label="지도로 (확정)" sx={{ flex: 1 }} />
        <WireBtn label="지도로" sx={{ flex: 1 }} />
      </Stack>
    </Stack>
  );
}

export function InputWireframe() {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 8, px: 2, maxWidth: 400, mx: "auto", textAlign: "center" }}>
      <Typography sx={{ fontWeight: 800, fontSize: "1.3rem" }}>쓰레기를 버려주세요</Typography>
      <WireArea label="투입 안내 문구" height={56} sx={{ width: "100%" }} />
      <WireArea label="상태 확인 / 로딩" hint="READY → CHECK 폴링" height={64} sx={{ width: "100%" }} />
      <WireArea label="성공 · 실패 전환" hint="자동 화면 전환" height={40} sx={{ width: "100%" }} />
    </Stack>
  );
}

export function DbWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 3, px: 2, maxWidth: 720, mx: "auto" }}>
      <WirePageHeader title="모듈 DB 조회" back="지도로" />
      <WireArea label="모듈 데이터 테이블" hint="유형별 · 시리얼 · 적재량 · 상태" height={380} />
    </Stack>
  );
}

export function RouteWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 3, px: 2, maxWidth: 520, mx: "auto" }}>
      <WirePageHeader title="최적 수거 경로" back="지도로" />
      <WireArea label="정렬 기준 설명" height={36} />
      <WireArea label="경로 목록" hint="순번 · 모듈 · 적재 상태" height={320} />
    </Stack>
  );
}

export function MyPageWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 4, px: 2, maxWidth: 420, mx: "auto" }}>
      <Typography sx={{ fontWeight: 900, fontSize: "1.25rem" }}>마이페이지</Typography>
      <WireArea label="사용자 정보 카드" hint="별명 · 이메일 · 역할 · 상태" height={140} />
      <WireBtn label="지도로 돌아가기" sx={{ alignSelf: "stretch" }} />
    </Stack>
  );
}

export function ManageWireframe() {
  return (
    <Stack spacing={2} sx={{ py: 3, px: 2, maxWidth: 720, mx: "auto" }}>
      <WirePageHeader title="관리자 콘솔" back="지도로" />
      <WireTabRow labels={["사용자", "모듈", "MQTT"]} />
      <WireArea label="관리 테이블 / 편집 폼" height={360} />
    </Stack>
  );
}

export const FEATURE_WIREFRAMES = {
  "feature-smart": () => <FeatureIntroWire title="AI 카메라 자원 분류" />,
  "feature-iot": () => <FeatureIntroWire title="IoT 실시간 적재 측정" />,
  "feature-reward": () => <FeatureIntroWire title="데이터 분석 & 수거 동선" />,
  "feature-ops": () => <FeatureIntroWire title="통합 관제 플랫폼" />,
};

export const WIREFRAME_MAP = {
  main: MainWireframe,
  nickname: NicknameWireframe,
  map: MapWireframe,
  overview: OverviewWireframe,
  camera: CameraWireframe,
  input: InputWireframe,
  db: DbWireframe,
  route: RouteWireframe,
  mypage: MyPageWireframe,
  manage: ManageWireframe,
  ...FEATURE_WIREFRAMES,
};
