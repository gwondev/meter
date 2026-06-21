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
      subtitle="지도 · 실시간 모니터링 · 모듈 점검"
      description="지자체·운영사가 의류·플라스틱·캔·폐의약품 거점을 하나의 대시보드에서 실시간으로 관리합니다."
      highlights={["Kakao Map", "N분 전 확인됨", "모듈점검필요"]}
      bullets={[
        "지도에서 4종 모듈의 위치·적재 높이·누적 투입 횟수를 한눈에 확인합니다.",
        "마지막 MQTT 수신 시각을 ‘N분 전 확인됨’으로 표시하고, 24시간 이상 미수신 시 ‘모듈점검필요’로 표시합니다.",
        "적재 위험(10cm 이하) 거점을 우선 파악해 수거·점검 우선순위를 정합니다.",
        "meter.gwon.run 단일 플랫폼으로 분산된 적재 자원을 통합 관리합니다.",
      ]}
    />
  );
}
