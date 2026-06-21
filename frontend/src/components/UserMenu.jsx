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
import { useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../services/auth";
import { meterColors } from "../theme/meterTheme";

export default function UserMenu() {
  const navigate = useNavigate();
  const user = getUser();
  const [anchor, setAnchor] = useState(null);

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
          border: `1px solid ${meterColors.border}`,
          bgcolor: "rgba(0,0,0,0.5)",
          color: meterColors.primary,
        }}
      >
        <MenuRoundedIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: { bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}`, minWidth: 200 },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${meterColors.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{user?.nickname || "사용자"}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: meterColors.secondary }}>{user?.email || ""}</Typography>
        </Box>
        <MenuItem onClick={() => { setAnchor(null); navigate("/mypage"); }}>
          <ListItemIcon><PersonRoundedIcon sx={{ color: meterColors.primaryMuted }} /></ListItemIcon>
          <ListItemText>마이페이지</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); navigate("/"); }}>
          <ListItemIcon><HomeRoundedIcon sx={{ color: meterColors.primaryMuted }} /></ListItemIcon>
          <ListItemText>처음 화면</ListItemText>
        </MenuItem>
        <MenuItem onClick={logout}>
          <ListItemIcon><LogoutRoundedIcon sx={{ color: meterColors.danger }} /></ListItemIcon>
          <ListItemText sx={{ color: meterColors.danger }}>로그아웃</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
