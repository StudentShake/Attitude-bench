import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ThemeProvider from "./components/ThemeProvider.jsx";
import Landing from "./pages/Landing.jsx";
import Playground from "./pages/Playground.jsx";
import TestPrep from "./pages/TestPrep.jsx";
import TutorialLayout, { ChapterStub } from "./pages/tutorial/TutorialLayout.jsx";
import Chapter1 from "./pages/tutorial/Chapter1.jsx";
import { READY } from "./pages/tutorial/chapters.js";

const FIRST_CHAPTER = READY[0].slug;

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/test-prep" element={<TestPrep />} />

          <Route path="/tutorial" element={<TutorialLayout />}>
            {/* /tutorial lands on the first written chapter */}
            <Route index element={<Navigate to={FIRST_CHAPTER} replace />} />
            <Route path="what-is-attitude" element={<Chapter1 />} />
            {/* later chapters slot in beside Chapter 1; until then, the shell
                still renders for any slug in chapters.js */}
            <Route path="*" element={<ChapterStub />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
