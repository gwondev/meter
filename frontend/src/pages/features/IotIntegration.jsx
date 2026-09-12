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
      title="사각지대 IoT 감시"
      subtitle="D모듈 · R모듈 · MQTT"
      description="R모듈은 이미지만 보내고, 서버가 원본과 최근 사진을 비교해 적재율을 냅니다."
      highlights={["MQTT 이미지", "원본+10장", "서버 fill%"]}
      bullets={[
        "D모듈: 초음파로 빈 거리를 재고 보드에서 적재율을 산출합니다 (30초).",
        "R모듈: JPEG만 MQTT 전송(간격은 보드 결정). imageRole=original 이면 원본 덮어쓰기.",
        "서버 vision이 원본과 최근 10장 샘플을 비교해 fillPercent 0~100을 산출합니다.",
      ]}
    />
  );
}
