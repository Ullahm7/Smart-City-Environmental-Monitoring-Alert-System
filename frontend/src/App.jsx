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

  const CheckAuthenticated = ({redirect}) => {
    if (localStorage.getItem("userId")) {
      return redirect;
    }
    else {
      return <Navigate to="../landing"/>;
    }

  }

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="landing" element={<Landing/>} />
            <Route path="login" element={<Authenticate/>} />
            <Route path="dashboard" element={<CheckAuthenticated redirect={<Dashboard/>}/>} />
            <Route path="region" element={<CheckAuthenticated redirect={<Region/>}/>} />
            <Route path="sensor" element={<CheckAuthenticated redirect={<Sensor/>}/>} />
            <Route path="audit" element={<CheckAuthenticated redirect={<Audit/>}/>}/>
            <Route path="alert" element={<CheckAuthenticated redirect={<Alert/>}/>} />
            <Route path="sensor-data" element={<CheckAuthenticated redirect={<SensorData/>}/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default App;