import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Region from "./pages/Region.jsx";
import Sensor from "./pages/Sensor.jsx";
import Audit from "./pages/Audit.jsx";
import Alert from "./pages/Alert.jsx";
import Authenticate from "./pages/Authenticate.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Navbar from "./components/Navbar.jsx";

import './App.css'

// Layout wrapper to conditionally show Navbar
function Layout({ children }) {
  const location = useLocation();
  const hideNavbar = location.pathname === '/landing' || location.pathname === '/login';

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
}

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
      <Layout>
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="landing" element={<Landing/>} />
            <Route path="login" element={<Authenticate/>} />
            <Route path="dashboard" element={<CheckAuthenticated redirect={<Dashboard/>}/>} />
            <Route path="region" element={<CheckAuthenticated redirect={<Region/>}/>} />
            <Route path="sensor" element={<CheckAuthenticated redirect={<Sensor/>}/>} />
            <Route path="audit" element={<CheckAuthenticated redirect={<Audit/>}/>}/>
            <Route path="alert" element={<CheckAuthenticated redirect={<Alert/>}/>} />
            {/* <Route path="sensor-data" element={<CheckAuthenticated redirect={<SensorData/>}/>} /> */}
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App;