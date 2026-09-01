import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { meterColors } from "../theme/meterTheme";

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API || import.meta.env.KAKAO_API || "";
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;

function loadKakaoSdk() {
  return new Promise((resolve, reject) => {
    if (!KAKAO_APP_KEY) {
      reject(new Error("no kakao key"));
      return;
    }
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }
    let script = document.querySelector("script[data-kakao-map='true']");
    if (!script) {
      script = document.createElement("script");
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.dataset.kakaoMap = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      if (!window.kakao?.maps) {
        reject(new Error("sdk missing"));
        return;
      }
      window.kakao.maps.load(() => resolve());
    });
    script.addEventListener("error", () => reject(new Error("sdk load failed")));
  });
}

/**
 * LAT/LON 선택 — 메인 지도와 같은 카카오 SDK.
 * Dialog 안에서는 열림 완료 후 relayout 해야 타일이 보인다.
 */
export default function LocationPickerDialog({ open, lat, lon, onClose, onConfirm }) {
  const [draftLat, setDraftLat] = useState(String(lat ?? "35.1462"));
  const [draftLon, setDraftLon] = useState(String(lon ?? "126.9229"));
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const [hint, setHint] = useState("지도를 클릭해 위치를 고르세요.");
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftLat(String(lat ?? "35.1462"));
    setDraftLon(String(lon ?? "126.9229"));
    setHint("지도를 클릭해 위치를 고르세요.");
    setMapError("");
  }, [open, lat, lon]);

  const destroyMap = () => {
    mapRef.current = null;
    markerRef.current = null;
  };

  const initMap = async () => {
    destroyMap();
    if (!containerRef.current) return;
    if (!KAKAO_APP_KEY) {
      setMapError("카카오 지도 키가 없어 직접 입력만 가능합니다.");
      return;
    }
    try {
      await loadKakaoSdk();
      const la = Number(draftLat);
      const lo = Number(draftLon);
      const center = new window.kakao.maps.LatLng(
        Number.isFinite(la) ? la : 35.1462,
        Number.isFinite(lo) ? lo : 126.9229
      );
      const map = new window.kakao.maps.Map(containerRef.current, { center, level: 3 });
      mapRef.current = map;
      const marker = new window.kakao.maps.Marker({ position: center, map });
      markerRef.current = marker;

      window.kakao.maps.event.addListener(map, "click", (mouseEvent) => {
        const pos = mouseEvent.latLng;
        marker.setPosition(pos);
        setDraftLat(pos.getLat().toFixed(6));
        setDraftLon(pos.getLng().toFixed(6));
        setHint("위치 선택됨 — 적용을 누르세요.");
      });

      /* Dialog 레이아웃 완료 후 타일 재계산 — 메인 MapView 와 동일 SDK */
      requestAnimationFrame(() => {
        map.relayout();
        map.setCenter(center);
      });
      setTimeout(() => {
        map.relayout();
        map.setCenter(center);
      }, 120);
      setMapError("");
    } catch (e) {
      setMapError(e?.message || "지도 초기화 실패");
    }
  };

  useEffect(() => {
    if (!open || !mapRef.current || !markerRef.current || !window.kakao?.maps) return;
    const la = Number(draftLat);
    const lo = Number(draftLon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    const pos = new window.kakao.maps.LatLng(la, lo);
    markerRef.current.setPosition(pos);
    mapRef.current.setCenter(pos);
  }, [draftLat, draftLon, open]);

  const confirm = () => {
    const la = Number(draftLat);
    const lo = Number(draftLon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      setHint("LAT/LON 숫자를 확인하세요.");
      return;
    }
    onConfirm({ lat: la, lon: lo });
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        destroyMap();
        onClose();
      }}
      fullWidth
      maxWidth="md"
      TransitionProps={{
        onEntered: () => {
          initMap();
        },
        onExited: () => {
          destroyMap();
        },
      }}
      PaperProps={{
        sx: {
          bgcolor: "#0e0e0e",
          color: "#fff",
          border: `1px solid ${meterColors.borderStrong}`,
          borderRadius: 1,
          m: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, fontSize: "1.05rem", py: 1.25 }}>위치 선택</DialogTitle>
      <DialogContent sx={{ pt: 0.5 }}>
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: meterColors.secondary,
            mb: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {hint}
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            height: { xs: 300, sm: 400 },
            bgcolor: "#1a1a1a",
            border: `1px solid ${meterColors.border}`,
            borderRadius: 1,
            mb: 1.5,
          }}
        />
        {mapError && (
          <Typography sx={{ color: meterColors.danger, fontSize: "0.8rem", mb: 1 }}>{mapError}</Typography>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            label="LAT"
            size="small"
            value={draftLat}
            onChange={(e) => setDraftLat(e.target.value)}
            fullWidth
            sx={{ input: { color: "#fff" }, label: { color: "rgba(255,255,255,0.6)" } }}
          />
          <TextField
            label="LON"
            size="small"
            value={draftLon}
            onChange={(e) => setDraftLon(e.target.value)}
            fullWidth
            sx={{ input: { color: "#fff" }, label: { color: "rgba(255,255,255,0.6)" } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1.5 }}>
        <Button
          onClick={() => {
            destroyMap();
            onClose();
          }}
          sx={{ borderRadius: 1 }}
        >
          취소
        </Button>
        <Button onClick={confirm} variant="contained" sx={{ bgcolor: "#fff", color: "#000", fontWeight: 800, borderRadius: 1 }}>
          적용
        </Button>
      </DialogActions>
    </Dialog>
  );
}
