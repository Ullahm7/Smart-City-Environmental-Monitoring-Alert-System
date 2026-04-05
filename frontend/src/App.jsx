import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Region from "./pages/Region.jsx";

import './App.css'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="landing" element={<Landing/>} />
            <Route path="region" element={<Region/>} />?
        </Routes>
    </BrowserRouter>
  )
}

export default App;
