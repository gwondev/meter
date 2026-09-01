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

/**
 * LAT/LON 선택 — 지도 클릭 또는 직접 입력.
 */
export default function LocationPickerDialog({ open, lat, lon, onClose, onConfirm }) {
  const [draftLat, setDraftLat] = useState(String(lat ?? "35.1462"));
  const [draftLon, setDraftLon] = useState(String(lon ?? "126.9229"));
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("지도를 클릭해 위치를 고르세요.");

  useEffect(() => {
    if (!open) return;
    setDraftLat(String(lat ?? "35.1462"));
    setDraftLon(String(lon ?? "126.9229"));
  }, [open, lat, lon]);

  useEffect(() => {
    if (!open || !KAKAO_APP_KEY) return undefined;

    let cancelled = false;

    const initMap = () => {
      if (cancelled || !containerRef.current || !window.kakao?.maps) return;
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
        setHint("위치 선택됨 — 확인을 누르세요.");
      });
      setReady(true);
    };

    const boot = () => {
      window.kakao.maps.load(initMap);
    };

    if (window.kakao?.maps) {
      boot();
      return () => {
        cancelled = true;
      };
    }

    let script = document.querySelector("script[data-kakao-map='true']");
    if (!script) {
      script = document.createElement("script");
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.dataset.kakaoMap = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", boot);
    return () => {
      cancelled = true;
      script.removeEventListener("load", boot);
    };
    // draftLat/Lon intentionally omitted — map init once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current || !window.kakao?.maps) return;
    const la = Number(draftLat);
    const lo = Number(draftLon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    const pos = new window.kakao.maps.LatLng(la, lo);
    markerRef.current.setPosition(pos);
    mapRef.current.setCenter(pos);
  }, [draftLat, draftLon, ready]);

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
      onClose={onClose}
      fullWidth
      maxWidth="md"
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
        <Typography sx={{ fontSize: "0.78rem", color: meterColors.secondary, mb: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {hint}
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            height: { xs: 280, sm: 380 },
            bgcolor: "#1a1a1a",
            border: `1px solid ${meterColors.border}`,
            borderRadius: 1,
            mb: 1.5,
          }}
        />
        {!KAKAO_APP_KEY && (
          <Typography sx={{ color: meterColors.danger, fontSize: "0.8rem", mb: 1 }}>
            카카오 지도 키가 없어 직접 입력만 가능합니다.
          </Typography>
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
        <Button onClick={onClose} sx={{ borderRadius: 1 }}>
          취소
        </Button>
        <Button onClick={confirm} variant="contained" sx={{ bgcolor: "#fff", color: "#000", fontWeight: 800, borderRadius: 1 }}>
          적용
        </Button>
      </DialogActions>
    </Dialog>
  );
}
