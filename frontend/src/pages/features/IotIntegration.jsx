import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function IotIntegration() {
  return (
    <FeatureIntroLayout
      badge="IoT · D / R"
      icon={
        <SensorsRoundedIcon
          sx={{
            fontSize: 56,
            p: 1.5,
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.05)",
          }}
        />
      }
      title="IoT 실시간 적재 측정"
      subtitle="D모듈 · R모듈 · MQTT"
      description="보드가 fillPercent(0~100)를 계산해 MQTT로만 전송합니다."
      highlights={["fillPercent", "MQTT", "HTTP 없음"]}
      bullets={[
        "D모듈: 초음파로 빈 거리를 재고 보드에서 적재율을 산출합니다 (30초).",
        "R모듈: 원본 사진과 비교해 적재율을 산출하고 5분마다 이미지와 함께 보냅니다.",
        "서버·웹은 meter/{serial}/status 구독만 합니다. 디바이스 HTTP API는 없습니다.",
      ]}
    />
  );
}
