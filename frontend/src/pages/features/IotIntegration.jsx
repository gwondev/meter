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
      description="의류수거함·쓰레기통·폐의약품 수거함 등 다양한 용기에 부착 가능한 범용 IoT 모듈이 적재량을 수집·전송합니다."
      highlights={["5분 HEARTBEAT", "1분 HEIGHT", "LED 10/30/50cm"]}
      bullets={[
        "HC-SR04 초음파 센서로 용기 내부 거리(적재 높이)를 측정합니다.",
        "5분마다 HEARTBEAT, 1분마다 HEIGHT 데이터를 MQTT meter/{serial}/status 로 전송합니다.",
        "현장 LED: 10cm 이하 빨강, 30cm 이하 주황, 50cm 이하 초록으로 즉시 상태를 표시합니다.",
        "Cloudflare Tunnel → mqtt-meter.gwon.run 경로로 외부 브로커와 안전하게 연결됩니다.",
      ]}
    />
  );
}
