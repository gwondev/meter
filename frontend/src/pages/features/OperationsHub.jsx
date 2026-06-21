import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function OperationsHub() {
  return (
    <FeatureIntroLayout
      badge="Web · 관제"
      icon={
        <DashboardRoundedIcon
          sx={{
            fontSize: 56,
            p: 1.5,
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.05)",
          }}
        />
      }
      title="통합 관제 플랫폼"
      subtitle="지도 · DB · 모듈 점검"
      description="4종 모듈의 위치·적재·연결 상태를 하나의 대시보드에서 관리합니다."
      highlights={["Kakao Map", "모듈 DB", "점검 알림"]}
      bullets={[
        "지도에서 모듈 위치와 적재 상태를 실시간 확인합니다.",
        "24시간 미수신 시 모듈점검필요로 표시합니다.",
        "관리자는 모듈·사용자 데이터를 통합 관리합니다.",
      ]}
    />
  );
}
