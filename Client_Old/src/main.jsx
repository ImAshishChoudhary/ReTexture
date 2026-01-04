import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";

const App = lazy(() => import("./App.jsx"));
import './index.css'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider locale={enUS}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);