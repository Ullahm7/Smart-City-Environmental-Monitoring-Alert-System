import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Region from "./pages/Region.jsx";
import Sensor from "./pages/Sensor.jsx";

import './App.css'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="landing" element={<Landing/>} />
            <Route path="region" element={<Region/>} />?
            <Route path="sensor" element={<Sensor />} />?
        </Routes>
    </BrowserRouter>
  )
}

export default App;
