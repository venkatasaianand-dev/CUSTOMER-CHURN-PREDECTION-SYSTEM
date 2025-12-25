import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeProvider";
import Toaster from "./components/common/Toaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Toaster>
        <App />
      </Toaster>
    </ThemeProvider>
  </React.StrictMode>
);
