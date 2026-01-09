import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login";
import Config from "./pages/Config.jsx";
import Store from "./pages/Store.jsx";
import Loading from "./pages/Loading.jsx";
import Room from "./pages/Room.jsx";
import Join from "./pages/Join.jsx";
import MyPage from "./pages/MyPage.jsx";
import OAuth2RedirectHandler from "./pages/OAuth2RedirectHandler";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/" element={<Login />} />
                <Route path="/config" element={<Config />} />
                <Route path="/store" element={<Store />} />
                <Route path="/loading" element={<Loading />} />
                <Route path="/room/:roomId" element={<Room />} />
                <Route path="/join" element={<Join />} />
                <Route path="/myPage" element={<MyPage />} />
                <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
            </Routes>
        </Router>
    );
}

export default App;