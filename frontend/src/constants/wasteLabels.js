/** 모듈·팝업용 분류 표시 (코드 → 짧은 한글) */
export const MODULE_TYPE_LABELS = {
  CLOTHING: "의류수거함",
  PLASTIC: "플라스틱쓰레기통",
  CAN: "캔쓰레기통",
  MEDICINE: "폐의약품수거함",
  /** 레거시 호환 */
  GENERAL: "일반쓰레기",
  PET: "플라스틱",
  HAZARD: "유해폐기물",
};

export const HELD_TYPE_LABELS = {
  CLOTHING: "의류",
  PLASTIC: "플라스틱",
  CAN: "캔",
  MEDICINE: "폐의약품",
  PET: "플라스틱",
  GENERAL: "일반",
  HAZARD: "유해",
};

export function moduleTypeLabel(code) {
  if (code == null || String(code).trim() === "") return "—";
  const key = String(code).trim().toUpperCase();
  return MODULE_TYPE_LABELS[key] || key;
}

/** Camera에서 선택한 분류와 모듈 TYPE이 호환되는지 */
export function moduleTypeMatchesHeld(moduleType, heldType) {
  const m = String(moduleType || "PLASTIC").trim().toUpperCase();
  const h = String(heldType || "").trim().toUpperCase();
  if (!h) return true;
  if (m === h) return true;
  if (m === "PLASTIC" && h === "PET") return true;
  return false;
}

export function isGovModuleType(code) {
  return /^GOV_/i.test(String(code ?? ""));
}
