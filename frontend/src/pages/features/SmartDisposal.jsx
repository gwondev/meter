import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import FeatureIntroLayout from "../../components/FeatureIntroLayout";

export default function SmartDisposal() {
  return (
    <FeatureIntroLayout
      badge="AI · 자원 분류"
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
      title="AI 카메라 자원 분류"
      subtitle="촬영 → 유형 판별 → 모듈 안내"
      description="촬영 유형을 판별해 맞는 거점을 안내합니다."
      highlights={["의류", "플라스틱", "캔", "폐의약품"]}
      bullets={[
        "Gemini Vision으로 4종 유형을 자동 분류합니다.",
        "결과를 지도와 연동해 해당 모듈만 필터합니다.",
        "올바른 투입 거점 안내에 초점을 둡니다.",
      ]}
    />
  );
}
