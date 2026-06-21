import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { meterThemeOptions } from "./theme/meterTheme";
import Root from "./pages/Root";
import Manage from "./pages/Manage";
import Nickname from "./pages/Nickname";
import Map from "./pages/Map";
import MapGuide from "./pages/MapGuide";
import RecyclingGuide from "./pages/RecyclingGuide";
import OverviewPage from "./pages/OverviewPage";
import Camera from "./pages/Camera";
import Input from "./pages/Input";
import SmartDisposal from "./pages/features/SmartDisposal";
import IotIntegration from "./pages/features/IotIntegration";
import Reward from "./pages/features/Reward";
import OperationsHub from "./pages/features/OperationsHub";
import MyPage from "./pages/MyPage";
import Mosquitto from "./pages/Mosquitto";
import ModuleDB from "./pages/ModuleDB";
import RouteGuide from "./pages/RouteGuide";
import Test from "./pages/Test";
import TeamIntro from "./pages/TeamIntro";
import ProjectIntro from "./pages/ProjectIntro";
import { isAuthenticated, ensureSession } from "./services/auth";

const theme = createTheme(meterThemeOptions);

function ProtectedRoute({ children, adminOnly = false }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isAuthenticated()) {
        if (!cancelled) navigate("/", { replace: true });
        return;
      }

      const result = await ensureSession();
      if (cancelled) return;

      if (result.status === "unauthenticated" || result.status === "deleted") {
        navigate("/", { replace: true });
        return;
      }
      if (result.status === "needs_nickname") {
        navigate("/nickname", { replace: true });
        return;
      }
      if (adminOnly && result.user?.role !== "ADMIN") {
        navigate("/map", { replace: true });
        return;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, adminOnly]);

  if (!ready) return null;
  return children;
}

function App() {

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <Routes>
          {/* 시작 및 계정 설정 */}
          <Route path="/" element={<Root />} />
          <Route path="/nickname" element={<Nickname />} />
          <Route path="/test" element={<Test />} />
          <Route path="/intro/team" element={<ProtectedRoute><TeamIntro /></ProtectedRoute>} />
          <Route path="/intro/project" element={<ProtectedRoute><ProjectIntro /></ProtectedRoute>} />

          {/* 메인 서비스 (지도) */}
          <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
          <Route path="/map/overview" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
          <Route path="/map/guide" element={<ProtectedRoute><MapGuide /></ProtectedRoute>} />
          <Route path="/map/recycling-guide" element={<ProtectedRoute><RecyclingGuide /></ProtectedRoute>} />
          <Route path="/camera" element={<ProtectedRoute><Camera /></ProtectedRoute>} />
          <Route path="/input" element={<ProtectedRoute><Input /></ProtectedRoute>} />
          <Route path="/db" element={<ProtectedRoute><ModuleDB /></ProtectedRoute>} />
          <Route path="/map/route" element={<ProtectedRoute><RouteGuide /></ProtectedRoute>} />
          <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />

          {/* 관리자 전용 페이지 */}
          <Route path="/manage" element={<ProtectedRoute adminOnly><Manage /></ProtectedRoute>} />
          <Route path="/mosquitto" element={<ProtectedRoute adminOnly><Mosquitto /></ProtectedRoute>} />

          {/* 소개 기능 페이지 — 로그인 없이 열람 가능 */}
          <Route path="/features/smart-disposal" element={<SmartDisposal />} />
          <Route path="/features/iot" element={<IotIntegration />} />
          <Route path="/features/reward" element={<Reward />} />
          <Route path="/features/operations" element={<OperationsHub />} />
          <Route path="/features/recognition" element={<Navigate to="/features/smart-disposal" replace />} />
          <Route path="/features/guide" element={<Navigate to="/features/smart-disposal" replace />} />
          <Route path="/features/control" element={<Navigate to="/features/operations" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;