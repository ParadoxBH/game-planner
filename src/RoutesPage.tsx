import Typography from "@mui/material/Typography";
import { Navigate, Route, Routes } from "react-router-dom";
import { MapView } from "./components/MapView";
import { Home } from "./components/Home";

export function RoutesPage() {
  return (
    <Routes>
      {/* Rota Inicial */}
      <Route
        path="/"
        element={
          <Home/>
        }
      />

      {/* Rota do Mapa */}
      <Route path="/map" element={<MapView/>} />

      {/* Outras rotas (Exemplos) */}
      <Route
        path="/itens"
        element={<Typography p={4}>Lista de Itens</Typography>}
      />

      {/* Redirecionar rotas inexistentes para a home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
