import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

if (!clientId && import.meta.env.PROD) {
  console.error("VITE_GOOGLE_CLIENT_ID 가 빌드에 포함되지 않았습니다. prepare-env.sh 후 docker compose build 를 실행하세요.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);
