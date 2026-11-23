import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ThemeProvider from "./components/ThemeProvider.jsx";
import Landing from "./pages/Landing.jsx";

const Playground = lazy(() => import("./pages/Playground.jsx"));
const TestPrep = lazy(() => import("./pages/TestPrep.jsx"));
const Tutorial = lazy(() => import("./pages/tutorial/TutorialLayout.jsx"));

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{ minHeight: "100svh" }} />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/test-prep" element={<TestPrep />} />
            <Route path="/tutorial/*" element={<Tutorial />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
