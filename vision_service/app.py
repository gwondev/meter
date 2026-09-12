"""
METER R모듈 영상 비교 서비스.
원본(baseline)과 최근 샘플(최대 10장)을 비교해 fillPercent 0~100을 산출한다.

사람·차 등 일시 물체를 줄이기 위해 샘플별 점수의 중앙값(median)을 쓴다.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("meter-vision")

app = FastAPI(title="METER Vision Compare", version="1.0.0")

COMPARE_SIZE = (320, 240)


class CompareRequest(BaseModel):
    baselinePath: str
    samplePaths: list[str] = Field(default_factory=list)


class CompareResponse(BaseModel):
    fillPercent: float
    sampleCount: int
    method: str
    scores: list[float] = Field(default_factory=list)


def _load_gray(path: str) -> np.ndarray:
    p = Path(path)
    if not p.is_file():
        raise HTTPException(status_code=400, detail=f"file not found: {path}")
    img = cv2.imread(str(p), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail=f"cannot decode image: {path}")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.resize(gray, COMPARE_SIZE, interpolation=cv2.INTER_AREA)


def _score_vs_baseline(baseline: np.ndarray, sample: np.ndarray) -> float:
    """절대차분 + 약한 블러로 노이즈를 줄인 뒤 평균 밝기 비율 → 0~100."""
    diff = cv2.absdiff(baseline, sample)
    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    # 작은 변화(센서 노이즈) 무시
    _, mask = cv2.threshold(diff, 18, 255, cv2.THRESH_BINARY)
    changed = float(np.count_nonzero(mask)) / float(mask.size)
    # 변화 면적 + 세기(평균 차분)를 합쳐 적재 느낌으로 스케일
    mean_diff = float(np.mean(diff)) / 255.0
    raw = (changed * 0.65 + mean_diff * 0.35) * 140.0
    return float(max(0.0, min(100.0, raw)))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/compare", response_model=CompareResponse)
def compare(req: CompareRequest) -> Any:
    if not req.samplePaths:
        raise HTTPException(status_code=400, detail="samplePaths empty")

    baseline = _load_gray(req.baselinePath)
    scores: list[float] = []
    for sp in req.samplePaths[-10:]:
        try:
            sample = _load_gray(sp)
            scores.append(_score_vs_baseline(baseline, sample))
        except HTTPException:
            log.warning("skip bad sample %s", sp)
            continue

    if not scores:
        raise HTTPException(status_code=400, detail="no usable samples")

    # 중앙값 — 한두 장의 사람/차 통과에 덜 흔들림
    fill = float(np.median(np.asarray(scores, dtype=np.float64)))
    fill = round(max(0.0, min(100.0, fill)), 1)
    log.info("compare baseline=%s n=%s fill=%s", req.baselinePath, len(scores), fill)
    return CompareResponse(
        fillPercent=fill,
        sampleCount=len(scores),
        method="median-absdiff-v1",
        scores=[round(s, 1) for s in scores],
    )
