import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Spin } from "antd";
import { useEditorStore } from "./store/useEditorStore";
import "./App.css";

const Home = lazy(() => import("./pages/Home"));
const DashBoard = lazy(() => import("./pages/DashBoard.jsx"));


function App() {
  const { fontList, setFontList } = useEditorStore();

  useEffect(() => {
    if (fontList?.length) return;

    const apiKey = import.meta.env.VITE_GOOGLE_FONTS_KEY;
    
    // Only fetch if API key is defined
    if (!apiKey) {
      console.warn('Google Fonts API key not configured. Skipping font list fetch.');
      return;
    }

    fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`)
      .then((res) => res.json())
      .then((data) => {
        setFontList(data?.items || []);
      })
      .catch((err) => {
        console.error('Failed to load Google Fonts:', err);
      })
  }, [fontList, setFontList]);

  return (
    <Router>
      <Suspense fallback={<><Spin fullscreen /></>}>
        <Routes>
          <Route path="/" element={<><Home /></>} />
          <Route path="/dashboard" element={<><DashBoard /></>} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;