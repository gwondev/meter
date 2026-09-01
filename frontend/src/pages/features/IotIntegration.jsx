import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function IotIntegration() {
  return (
    <FeatureIntroLayout
      badge="IoT · ESP32"
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
      subtitle="탈부착형 모듈 · 초음파 · MQTT"
      description="수거 용기에 부착한 IoT 모듈이 적재 높이를 실시간 전송합니다."
      highlights={["5초 발행", "MQTT", "LED 상태"]}
      bullets={[
        "초음파 센서로 용기 내부 적재 높이를 측정합니다.",
        "MQTT로 height 데이터를 서버에 전송합니다.",
        "현장 LED로 연결·전송 상태를 표시합니다.",
      ]}
    />
  );
}
