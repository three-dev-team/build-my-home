import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login";
import Config from "./pages/Config.jsx";
import Store from "./pages/Store.jsx";
import Loading from "./pages/Loading.jsx";
import Room from "./pages/Room.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/config" element={<Config />} />
        <Route path="/store" element={<Store />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </Router>
  );
}

export default App;
