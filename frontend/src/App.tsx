import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimeMapPage from "@/features/timemap/TimeMapPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TimeMapPage />} />
      </Routes>
    </BrowserRouter>
  );
}
