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
      subtitle="적재량 예측 · Gemini 챗봇 · 운영 인사이트"
      description="수집된 적재량·투입·연결 데이터를 분석해 수거 시기와 우선순위를 예측하고, 자연어 질의로 운영 인사이트를 제공합니다."
      highlights={["수거 시기 예측", "최적 동선", "Gemini 챗봇"]}
      bullets={[
        "적재량 변화 패턴을 분석해 수거가 필요한 시점과 구역을 예측합니다.",
        "적재량이 높은 거점을 우선 반영한 최적 수거·관리 동선을 제안합니다.",
        "Gemini 챗봇으로 “이번 주 집중 관리 구역은?” 같은 자연어 질의에 답합니다.",
        "정기 순회 대신 데이터 기반 운영으로 불필요한 현장 이동을 줄입니다.",
      ]}
    />
  );
}
