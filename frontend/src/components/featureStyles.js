/** 흰 테두리 유리 카드 — hover 시 테두리가 밝아진다 */
export const glassCardSx = {
  p: 2.8,
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
  backdropFilter: "blur(14px)",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s ease",
  "&:hover": {
    borderColor: "rgba(255,255,255,0.4)",
    boxShadow: "0 10px 28px rgba(255,255,255,0.06)",
  },
};
