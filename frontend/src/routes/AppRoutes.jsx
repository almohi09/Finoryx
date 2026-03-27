import {BrowserRouter,Routes,Route} from "react-router-dom";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Dashboard from "../pages/Dashboard/Dashboard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

function AppRoutes(){
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="dashboard" element={
                        <ProtectedRoute>
                         <Dashboard/>
                        </ProtectedRoute>
                        }
                />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;