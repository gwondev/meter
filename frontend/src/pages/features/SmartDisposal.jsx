import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function SmartDisposal() {
  return (
    <FeatureIntroLayout
      badge="AI · 시민 안내"
      icon={
        <PhotoCameraRoundedIcon
          sx={{
            fontSize: 56,
            p: 1.5,
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.05)",
          }}
        />
      }
      title="AI 카메라 배출 안내"
      subtitle="Gemini Vision · 모듈별 분류 · 거점 안내"
      description="시민이 품목을 촬영하면 AI가 의류·플라스틱·캔·폐의약품을 구분하고, 올바른 배출 방법과 인근 METER 거점을 안내합니다."
      highlights={["의류수거함", "플라스틱", "캔", "폐의약품"]}
      bullets={[
        "촬영한 이미지를 Gemini API로 분석해 4종 모듈 유형에 맞는 배출 가이드를 제공합니다.",
        "단순 분류를 넘어 라벨·뚜껑 분리 등 구체적인 배출 방법을 문장으로 안내합니다.",
        "지도와 연동해 가까운 수거 모듈 위치와 적재 상태를 함께 확인할 수 있습니다.",
        "시민 참여형 자원순환 서비스로 확장 가능한 AI 안내 기능입니다.",
      ]}
    />
  );
}
