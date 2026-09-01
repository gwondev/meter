import { useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import { useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../services/auth";
import { meterColors } from "../theme/meterTheme";

export default function UserMenu() {
  const navigate = useNavigate();
  const user = getUser();
  const [anchor, setAnchor] = useState(null);
  const isAdmin = user?.role === "ADMIN";

  const go = (path) => {
    setAnchor(null);
    navigate(path);
  };

  const logout = () => {
    setAnchor(null);
    clearAuth();
    navigate("/");
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          border: `1px solid ${meterColors.borderStrong}`,
          bgcolor: "#000000",
          color: meterColors.primary,
          borderRadius: 1,
          "&:hover": { bgcolor: "#111111", borderColor: meterColors.borderStrong },
        }}
      >
        <MenuRoundedIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: "#0a0a0a",
            border: `1px solid ${meterColors.borderStrong}`,
            minWidth: 220,
            mt: 0.5,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${meterColors.border}` }}>
          <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", color: "#fff" }}>
            {user?.nickname?.trim() || "닉네임 없음"}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: meterColors.secondary, mt: 0.3 }}>
            {user?.email || ""}
          </Typography>
        </Box>
        <MenuItem onClick={() => go("/map/overview")}>
          <ListItemIcon>
            <InfoRoundedIcon sx={{ color: meterColors.primaryMuted }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontWeight: 700, fontSize: "0.88rem" }}>
            서비스 개요
          </ListItemText>
        </MenuItem>
        {isAdmin && (
          <MenuItem onClick={() => go("/db")}>
            <ListItemIcon>
              <StorageRoundedIcon sx={{ color: meterColors.primaryMuted }} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontWeight: 700, fontSize: "0.88rem" }}>
              관리자페이지
            </ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => go("/mypage")}>
          <ListItemIcon>
            <PersonRoundedIcon sx={{ color: meterColors.primaryMuted }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: "0.88rem" }}>마이페이지</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => go("/")}>
          <ListItemIcon>
            <HomeRoundedIcon sx={{ color: meterColors.primaryMuted }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: "0.88rem" }}>처음 화면</ListItemText>
        </MenuItem>
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutRoundedIcon sx={{ color: meterColors.danger }} />
          </ListItemIcon>
          <ListItemText sx={{ color: meterColors.danger }} primaryTypographyProps={{ fontSize: "0.88rem" }}>
            로그아웃
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
