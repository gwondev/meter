import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getUser, clearAuth } from "../services/auth";
import { apiFetch } from "../services/api";
import { moduleTypeLabel } from "../constants/wasteLabels";
import { formatSignalAge } from "../theme/meterTheme";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LocationPickerDialog from "../components/LocationPickerDialog";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import { meterColors } from "../theme/meterTheme";

const cellHead = {
  color: "#ffffff",
  fontWeight: 800,
  borderColor: "rgba(255,255,255,0.12)",
  bgcolor: "rgba(255,255,255,0.06)",
};
const cellBody = {
  color: "rgba(255,255,255,0.92)",
  borderColor: "rgba(255,255,255,0.08)",
};

const MODULE_TYPE_OPTIONS = ["CLOTHING", "PLASTIC", "CAN", "MEDICINE", "GENERAL"];
const square = { borderRadius: 1 };

const Manage = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState({
    users: [],
    modules: [],
    disposalRecords: [],
  });
  const [mqttLogs, setMqttLogs] = useState([]);

  const [userEditOpen, setUserEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nickname: "",
    role: "USER",
    status: "ACTIVE",
  });
  const [userDeleteTarget, setUserDeleteTarget] = useState(null);

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({
    serialNumber: "",
    organization: "CHOSUN_IT",
    lat: "35.1469",
    lon: "126.9228",
    type: "GENERAL",
    depthCm: "",
  });
  const [moduleDeleteTarget, setModuleDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [mqttFilter, setMqttFilter] = useState("ALL");

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [data, logs] = await Promise.all([
        apiFetch("/admin/overview"),
        apiFetch("/mosquitto/logs?limit=200"),
      ]);
      setOverview({
        users: data?.users || [],
        modules: data?.modules || [],
        disposalRecords: data?.disposalRecords || [],
      });
      setMqttLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      setError(e.message || "관리 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== "ADMIN") {
      alert("관리자 전용 페이지입니다.");
      navigate("/map");
      return;
    }
    loadOverview();
    const t = setInterval(() => {
      apiFetch("/mosquitto/logs?limit=200")
        .then((logs) => setMqttLogs(Array.isArray(logs) ? logs : []))
        .catch(() => {});
      apiFetch("/admin/overview")
        .then((data) => {
          if (!data) return;
          setOverview({
            users: data.users || [],
            modules: data.modules || [],
            disposalRecords: data.disposalRecords || [],
          });
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [currentUser?.role, navigate, loadOverview]);

  const openModuleDialog = (m = null) => {
    if (m) {
      setEditingModule(m);
      setModuleForm({
        serialNumber: m.serialNumber ?? "",
        organization: m.organization ?? "CHOSUN_IT",
        lat: String(m.lat ?? "35.1469"),
        lon: String(m.lon ?? "126.9228"),
        type: m.type ?? "GENERAL",
        depthCm: m.depthCm == null ? "" : String(m.depthCm),
      });
    } else {
      setEditingModule(null);
      setModuleForm({
        serialNumber: "",
        organization: "CHOSUN_IT",
        lat: "35.1469",
        lon: "126.9228",
        type: "GENERAL",
        depthCm: "",
      });
    }
    setModuleDialogOpen(true);
  };

  const saveModule = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const body = {
        serialNumber: moduleForm.serialNumber.trim(),
        organization: moduleForm.organization.trim(),
        lat: Number(moduleForm.lat),
        lon: Number(moduleForm.lon),
        type: moduleForm.type.trim().toUpperCase(),
        depthCm: moduleForm.depthCm.trim() === "" ? null : Number(moduleForm.depthCm),
      };
      if (editingModule) {
        await apiFetch(`/modules/${editingModule.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setSuccess("모듈이 수정되었습니다.");
      } else {
        await apiFetch("/modules", { method: "POST", body: JSON.stringify(body) });
        setSuccess("모듈이 추가되었습니다.");
      }
      setModuleDialogOpen(false);
      setEditingModule(null);
      loadOverview();
    } catch (e) {
      setError(e.message || "모듈 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  /** 10일 이상 신호가 없던 모듈을 즉시 걷어낸다. 스케줄러도 매시 같은 작업을 수행한다. */
  const cleanupStaleModules = async () => {
    try {
      setSaving(true);
      setError("");
      const res = await apiFetch("/modules/cleanup", { method: "POST", body: "{}" });
      setSuccess(`무신호 모듈 ${res?.removed ?? 0}건 정리 (기준 ${res?.retentionDays ?? 10}일)`);
      loadOverview();
    } catch (e) {
      setError(e.message || "무신호 모듈 정리 실패");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteModule = async () => {
    if (!moduleDeleteTarget) return;
    try {
      setSaving(true);
      await apiFetch(`/modules/${moduleDeleteTarget.id}`, { method: "DELETE" });
      setModuleDeleteTarget(null);
      setSuccess("모듈이 삭제되었습니다.");
      loadOverview();
    } catch (e) {
      setError(e.message || "모듈 삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const openUserEdit = (u) => {
    setEditingUser(u);
    setUserForm({
      nickname: u.nickname ?? "",
      role: u.role === "ADMIN" ? "ADMIN" : "USER",
      status: u.status ?? "ACTIVE",
    });
    setUserEditOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      await apiFetch(`/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nickname: userForm.nickname.trim() || null,
          role: userForm.role,
          status: userForm.status.trim() || "ACTIVE",
        }),
      });
      setUserEditOpen(false);
      setEditingUser(null);
      setSuccess("유저 정보가 저장되었습니다.");
      loadOverview();
    } catch (e) {
      alert(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userDeleteTarget) return;
    try {
      setSaving(true);
      const deletedOauthId = userDeleteTarget.oauthId;
      await apiFetch(`/users/${userDeleteTarget.id}`, { method: "DELETE" });
      setUserDeleteTarget(null);
      setSuccess("유저가 삭제되었습니다.");
      if (deletedOauthId && deletedOauthId === currentUser?.oauthId) {
        clearAuth();
        navigate("/");
        return;
      }
      loadOverview();
    } catch (e) {
      alert(e.message || "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== "ADMIN") return null;

  const filteredMqtt = mqttLogs.filter((row) => {
    if (mqttFilter === "ALL") return true;
    if (mqttFilter === "IN") return row.direction === "IN";
    return row.direction !== "IN";
  });
  const inCount = mqttLogs.filter((r) => r.direction === "IN").length;
  const outCount = mqttLogs.length - inCount;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      sx={{ minHeight: "100dvh", bgcolor: "#030403", color: "#fff", py: { xs: 2, sm: 3, md: 4 } }}
    >
      <Container maxWidth="md" sx={{ px: { xs: 0.75, sm: 1.25, md: 2 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} sx={{ mb: { xs: 1.5, sm: 2 } }} gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: "1.35rem", sm: "2rem" }, lineHeight: 1.2 }}>
              관리자페이지
            </Typography>
            <Typography
              sx={{
                mt: { xs: 0.75, sm: 1 },
                fontSize: { xs: "0.72rem", sm: "0.82rem" },
                color: "rgba(255,255,255,0.55)",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              MQTT 로그 · 유저 · 모듈
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ width: { xs: "100%", sm: "auto" }, flexShrink: 0 }}>
            <Button
              startIcon={<ArrowBackIosNewRoundedIcon sx={{ fontSize: 16 }} />}
              variant="outlined"
              sx={{ ...square, color: "#ffffff", borderColor: "rgba(255,255,255,0.35)", minHeight: 40, flex: { xs: 1, sm: "none" }, minWidth: { xs: "calc(50% - 4px)", sm: "auto" } }}
              onClick={() => navigate("/map")}
            >
              Map
            </Button>
            <Button onClick={loadOverview} sx={{ ...square, color: "#000", bgcolor: "#ffffff", fontWeight: 800, minHeight: 40, flex: { xs: 1, sm: "none" }, minWidth: { xs: "calc(50% - 4px)", sm: "auto" }, px: { sm: 2 } }}>
              새로고침
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={1.2} sx={{ mb: { xs: 1.5, sm: 2 } }}>
          {loading && <Alert severity="info" sx={{ ...square, py: 0.5, fontSize: { xs: "0.8rem", sm: "1rem" } }}>로딩 중...</Alert>}
          {error && <Alert severity="error" sx={{ ...square, fontSize: { xs: "0.8rem", sm: "1rem" } }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ ...square, fontSize: { xs: "0.8rem", sm: "1rem" } }}>{success}</Alert>}
        </Stack>

        <Paper
          sx={{
            ...square,
            p: { xs: 1.25, sm: 1.75 },
            mb: 2,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <HubRoundedIcon sx={{ color: "#7cff72", fontSize: 22 }} />
            <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: { xs: "0.95rem", sm: "1.05rem" }, whiteSpace: "nowrap" }}>
              MQTT 수신 로그
            </Typography>
            <Chip size="small" label={`전체 ${mqttLogs.length}`} sx={{ ...square, bgcolor: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 800, fontSize: "0.65rem" }} />
            <Chip size="small" label={`IN ${inCount}`} sx={{ ...square, bgcolor: "rgba(124,255,114,0.12)", color: "#7cff72", fontWeight: 800, fontSize: "0.65rem" }} />
            <Chip size="small" label={`OUT ${outCount}`} sx={{ ...square, bgcolor: "rgba(255,152,0,0.12)", color: "#ffb74d", fontWeight: 800, fontSize: "0.65rem" }} />
          </Stack>
          <Stack direction="row" spacing={0.6} sx={{ mb: 1 }}>
            {["ALL", "IN", "OUT"].map((f) => (
              <Button
                key={f}
                size="small"
                onClick={() => setMqttFilter(f)}
                sx={{
                  ...square,
                  minWidth: 52,
                  py: 0.35,
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  color: mqttFilter === f ? "#000" : "#fff",
                  bgcolor: mqttFilter === f ? "#fff" : "transparent",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                {f}
              </Button>
            ))}
          </Stack>
          <Box sx={{ maxHeight: { xs: 320, sm: 420 }, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", ...square }}>
            <Table size="small" stickyHeader sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  {["DIR", "시간", "토픽", "페이로드"].map((h) => (
                    <TableCell key={h} sx={{ ...cellHead, py: 0.6, fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMqtt.map((row, idx) => (
                  <TableRow key={`${row.time}-${idx}`} sx={{ "&:nth-of-type(odd)": { bgcolor: "rgba(255,255,255,0.03)" } }}>
                    <TableCell sx={{ ...cellBody, py: 0.55, width: 52 }}>
                      <Chip
                        size="small"
                        label={row.direction || "?"}
                        sx={{
                          ...square,
                          height: 20,
                          fontSize: "0.6rem",
                          fontWeight: 900,
                          bgcolor: row.direction === "IN" ? "rgba(124,255,114,0.18)" : "rgba(255,152,0,0.18)",
                          color: row.direction === "IN" ? "#7cff72" : "#ffb74d",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ ...cellBody, py: 0.55, fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                      {String(row.time || "").replace("T", " ").slice(0, 19)}
                    </TableCell>
                    <TableCell sx={{ ...cellBody, py: 0.55, fontSize: "0.7rem", fontWeight: 700, maxWidth: 160 }}>
                      {row.topic}
                    </TableCell>
                    <TableCell sx={{ ...cellBody, py: 0.55, fontSize: "0.68rem", color: "rgba(255,255,255,0.8)", maxWidth: 280 }}>
                      {row.payload}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMqtt.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...cellBody, textAlign: "center", py: 3, color: "rgba(255,255,255,0.5)" }}>
                      MQTT 로그 없음
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Paper
          sx={{
            ...square,
            p: { xs: 1.25, sm: 1.75 },
            mb: 2,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <PersonRoundedIcon sx={{ color: meterColors.primaryMuted, fontSize: 22 }} />
            <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: { xs: "0.95rem", sm: "1.05rem" } }}>
              유저 목록
            </Typography>
            <Chip
              size="small"
              label={`${overview.users.length}명`}
              sx={{ ...square, ml: "auto", bgcolor: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 800, fontSize: "0.68rem" }}
            />
          </Stack>
          <Grid container spacing={1.2}>
            {[...overview.users].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map((u) => (
              <Grid item xs={12} sm={6} key={u.id}>
                <Box
                  sx={{
                    ...square,
                    p: 1.25,
                    bgcolor: "rgba(0,0,0,0.35)",
                    border: `1px solid ${u.role === "ADMIN" ? "rgba(124,255,114,0.35)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "0.78rem", color: "#7cff72", mb: 0.35 }}>
                        ID {u.id}
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "0.95rem", color: "#fff" }} noWrap>
                        {u.nickname || "닉네임 없음"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", mt: 0.3 }} noWrap>
                        {u.email || "—"}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.8 }}>
                        <Chip size="small" label={u.role || "USER"} sx={{ ...square, height: 22, fontSize: "0.62rem", fontWeight: 800 }} />
                        <Chip
                          size="small"
                          label={u.status || "ACTIVE"}
                          sx={{
                            ...square,
                            height: 22,
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            bgcolor: u.status === "ACTIVE" ? "rgba(124,255,114,0.15)" : "rgba(255,255,255,0.08)",
                            color: u.status === "ACTIVE" ? "#7cff72" : "rgba(255,255,255,0.7)",
                          }}
                        />
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.2}>
                      <IconButton size="small" sx={{ color: "#fff", borderRadius: 1 }} onClick={() => openUserEdit(u)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: "#ff8a8a", borderRadius: 1 }}
                        disabled={currentUser?.id != null && u.id === currentUser.id}
                        onClick={() => setUserDeleteTarget(u)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Paper
          sx={{
            p: { xs: 1, sm: 2 },
            mb: 2,
            bgcolor: "rgba(255,255,255,0.04)",
            overflowX: "auto",
            border: "1px solid rgba(124,255,114,0.18)",
            WebkitOverflowScrolling: "touch",
            "& .MuiTableCell-root": {
              fontSize: { xs: "0.62rem", sm: "0.76rem" },
              py: { xs: 0.58, sm: 0.88 },
              px: { xs: 0.45, sm: 0.85 },
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
            <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
              모듈
              <Box component="span" sx={{ color: "rgba(255,255,255,0.45)", fontWeight: 600, ml: 1, fontSize: { xs: "0.78rem", sm: "0.85rem" } }}>
                · 총 {overview.modules.length}개
              </Box>
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<CleaningServicesRoundedIcon />}
                onClick={cleanupStaleModules}
                disabled={saving}
                sx={{ color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", fontWeight: 700 }}
              >
                무신호 정리
              </Button>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => openModuleDialog(null)} sx={{ color: "#000", bgcolor: "#ffffff", fontWeight: 800 }}>
                모듈 추가
              </Button>
            </Stack>
          </Stack>
          <Table size="small" sx={{ tableLayout: "fixed", minWidth: 0 }}>
            <TableHead>
              <TableRow>
                {["ID", "SERIAL", "계열", "TYPE", "신호", "적재율", "LAT", "LON", "작업"].map((h) => (
                  <TableCell key={h} sx={cellHead} align={h === "작업" ? "right" : "left"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...overview.modules].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map((m) => (
                <TableRow key={m.id} sx={{ "&:nth-of-type(odd)": { bgcolor: "rgba(255,255,255,0.03)" } }}>
                  <TableCell sx={{ ...cellBody, fontWeight: 900, color: "#7cff72" }}>{m.id}</TableCell>
                  <TableCell sx={cellBody}>{m.serialNumber}</TableCell>
                  <TableCell sx={cellBody}>{m.deviceType === "VISION_CAM" ? "카메라" : "초음파"}</TableCell>
                  <TableCell sx={cellBody}>
                    <Box component="span" sx={{ fontWeight: 700 }}>{m.type}</Box>
                    <Box component="span" sx={{ display: "block", fontSize: "0.72rem", opacity: 0.78, mt: 0.25, lineHeight: 1.3 }}>
                      {moduleTypeLabel(m.type)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...cellBody, color: m.signalState === "ACTIVE" ? "#7cff72" : "rgba(255,255,255,0.45)", fontWeight: 700 }}>
                    {m.signalState === "ACTIVE" ? "활성" : "대기중"}
                    <Box component="span" sx={{ display: "block", fontSize: "0.68rem", opacity: 0.7, fontWeight: 500 }}>
                      {formatSignalAge(m.lastSignalAt)}
                    </Box>
                  </TableCell>
                  <TableCell sx={cellBody}>{m.fillPercent == null ? "—" : `${Math.round(m.fillPercent)}%`}</TableCell>
                  <TableCell sx={cellBody}>{m.lat ?? "—"}</TableCell>
                  <TableCell sx={cellBody}>{m.lon ?? "—"}</TableCell>
                  <TableCell sx={cellBody} align="right">
                    <IconButton size="small" sx={{ color: "#ffffff", borderRadius: 1 }} onClick={() => openModuleDialog(m)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: "#ff8a8a", borderRadius: 1 }} onClick={() => setModuleDeleteTarget(m)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.15)", my: 2 }} />

        <Paper sx={{ p: { xs: 1.25, sm: 2 }, bgcolor: "rgba(255,255,255,0.04)", maxHeight: { xs: 240, sm: 320 }, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <Typography sx={{ color: "#ffffff", fontWeight: 800, mb: 1, fontSize: { xs: "0.85rem", sm: "1rem" } }}>배출 기록(최근)</Typography>
            {overview.disposalRecords
              .slice(-20)
              .reverse()
              .map((r) => (
                <Typography key={r.id} sx={{ fontSize: { xs: 11, sm: 13 }, mb: 0.5, lineHeight: 1.45, wordBreak: "break-all" }}>
                  #{r.id} user:{r.userId} module:{r.moduleId} {r.status}
                </Typography>
              ))}
          </Paper>
      </Container>

      <Dialog open={userEditOpen} onClose={() => !saving && setUserEditOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: "#121816", color: "#fff", border: "1px solid rgba(124,255,114,0.25)" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>유저 수정 #{editingUser?.id}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="별명" value={userForm.nickname} onChange={(e) => setUserForm((f) => ({ ...f, nickname: e.target.value }))} fullWidth sx={{ input: { color: "#fff" }, label: { color: "rgba(255,255,255,0.7)" } }} />
          <FormControl fullWidth>
            <InputLabel sx={{ color: "rgba(255,255,255,0.7)" }}>역할</InputLabel>
            <Select value={userForm.role} label="역할" onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} sx={{ color: "#fff" }}>
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
            </Select>
          </FormControl>
          <TextField label="상태" value={userForm.status} onChange={(e) => setUserForm((f) => ({ ...f, status: e.target.value }))} fullWidth sx={{ input: { color: "#fff" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUserEditOpen(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={saveUser} disabled={saving} variant="contained" sx={{ bgcolor: "#ffffff", color: "#000", fontWeight: 800 }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!userDeleteTarget} onClose={() => !saving && setUserDeleteTarget(null)} PaperProps={{ sx: { bgcolor: "#121816", color: "#fff" } }}>
        <DialogTitle>유저 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            ID {userDeleteTarget?.id} ({userDeleteTarget?.nickname || userDeleteTarget?.oauthId?.slice(0, 8)}) 삭제할까요?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDeleteTarget(null)} disabled={saving}>
            취소
          </Button>
          <Button onClick={confirmDeleteUser} disabled={saving} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moduleDialogOpen} onClose={() => !saving && setModuleDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: "#121816", color: "#fff", border: "1px solid rgba(124,255,114,0.25)" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingModule ? "모듈 수정" : "모듈 추가"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="serialNumber*" value={moduleForm.serialNumber} onChange={(e) => setModuleForm((f) => ({ ...f, serialNumber: e.target.value }))} fullWidth sx={{ input: { color: "#fff" } }} />
          <TextField label="organization" value={moduleForm.organization} onChange={(e) => setModuleForm((f) => ({ ...f, organization: e.target.value }))} fullWidth sx={{ input: { color: "#fff" } }} />
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField label="lat" value={moduleForm.lat} onChange={(e) => setModuleForm((f) => ({ ...f, lat: e.target.value }))} fullWidth sx={{ input: { color: "#fff" } }} />
            <TextField label="lon" value={moduleForm.lon} onChange={(e) => setModuleForm((f) => ({ ...f, lon: e.target.value }))} fullWidth sx={{ input: { color: "#fff" } }} />
            <Button
              startIcon={<MapRoundedIcon />}
              onClick={() => setLocationPickerOpen(true)}
              sx={{ ...square, minWidth: 108, height: 56, color: "#000", bgcolor: "#fff", fontWeight: 800, whiteSpace: "nowrap" }}
            >
              지도
            </Button>
          </Stack>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "rgba(255,255,255,0.7)" }}>type</InputLabel>
            <Select
              label="type"
              value={MODULE_TYPE_OPTIONS.includes((moduleForm.type || "").toUpperCase()) ? moduleForm.type.toUpperCase() : "GENERAL"}
              onChange={(e) => setModuleForm((f) => ({ ...f, type: e.target.value }))}
              sx={{ color: "#fff" }}
            >
              {MODULE_TYPE_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t} · {moduleTypeLabel(t)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="depthCm (모듈1 용기 깊이)"
            type="number"
            value={moduleForm.depthCm}
            onChange={(e) => setModuleForm((f) => ({ ...f, depthCm: e.target.value }))}
            fullWidth
            sx={{ input: { color: "#fff" } }}
            inputProps={{ min: 1 }}
            helperText="초음파 높이값을 적재율로 환산하는 기준. 비우면 서버 기본값(60cm)을 쓴다."
            FormHelperTextProps={{ sx: { color: "rgba(255,255,255,0.55)" } }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>
            적재율과 신호 상태는 모듈이 직접 보고하므로 여기서 수정하지 않는다. 시리얼이 m 으로 시작하면 초음파, r 로 시작하면 영상 판정 계열로 자동 분류된다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModuleDialogOpen(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={saveModule} disabled={saving || !moduleForm.serialNumber.trim()} variant="contained" sx={{ bgcolor: "#ffffff", color: "#000", fontWeight: 800 }}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!moduleDeleteTarget} onClose={() => !saving && setModuleDeleteTarget(null)} PaperProps={{ sx: { bgcolor: "#121816", color: "#fff", borderRadius: 1 } }}>
        <DialogTitle>모듈 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            {moduleDeleteTarget?.serialNumber} (ID {moduleDeleteTarget?.id}) 삭제할까요? 연결된 배출 기록도 함께 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDeleteTarget(null)} disabled={saving}>
            취소
          </Button>
          <Button onClick={confirmDeleteModule} disabled={saving} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <LocationPickerDialog
        open={locationPickerOpen}
        lat={moduleForm.lat}
        lon={moduleForm.lon}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={({ lat, lon }) => {
          setModuleForm((f) => ({ ...f, lat: String(lat), lon: String(lon) }));
          setLocationPickerOpen(false);
        }}
      />
    </Box>
  );
};

export default Manage;
