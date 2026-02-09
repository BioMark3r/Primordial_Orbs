import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./ui/theme/global.css";
import "./ui/theme/arena.css";
import "./ui/theme/fx.css";
import "./ui/theme/layout.css";
import "./ui/theme/tutorial.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
