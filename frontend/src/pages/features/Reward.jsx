import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function Reward() {
  return (
    <FeatureIntroLayout
      badge="빅데이터 · AI"
      icon={
        <InsightsRoundedIcon
          sx={{
            fontSize: 56,
            p: 1.5,
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.05)",
          }}
        />
      }
      title="데이터 분석 & 수거 동선"
      subtitle="적재량 예측 · 최적 경로"
      description="적재·투입 데이터를 분석해 수거 우선순위와 방문 경로를 제안합니다."
      highlights={["만재 우선", "최적 경로", "운영 인사이트"]}
      bullets={[
        "적재량이 높은 모듈을 우선 수거 대상으로 정렬합니다.",
        "지도·DB 데이터를 바탕으로 권장 방문 순서를 제공합니다.",
        "불필요한 순회를 줄이고 데이터 기반 운영을 지원합니다.",
      ]}
    />
  );
}
