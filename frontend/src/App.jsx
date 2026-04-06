import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Region from "./pages/Region.jsx";
import Sensor from "./pages/Sensor.jsx";
import Audit from "./pages/Audit.jsx";
import Alert from "./pages/Alert.jsx";
import Authenticate from "./pages/Authenticate.jsx";
import Dashboard from "./pages/Dashboard.jsx"; // You'll need to create a simple file for this

import './App.css'

function App() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="landing" element={<Landing/>} />
            <Route path="login" element={<Authenticate/>} />
            <Route path="dashboard" element={<Dashboard/>} />
            <Route path="region" element={<Region/>} />
            <Route path="sensor" element={<Sensor />} />
            <Route path="audit" element={<Audit/>}/>
            <Route path="alert" element={<Alert />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App;