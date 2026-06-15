import {
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import DitherPageShell from "@/components/app-shell/DitherPageShell";
import AboutPanel from "@/components/about/AboutPanel";
import ChangelogPanel from "@/components/changelog/ChangelogPanel";
import MechanismPanel from "@/components/mechanism/MechanismPanel";
import FlightScreen from "@/components/screens/FlightScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import NearMeScreen from "@/components/screens/NearMeScreen";
import { normalizeCallsign } from "@/utils/callsign";

function FlightRoute() {
  const { callsign = "" } = useParams();
  return <FlightScreen callsign={normalizeCallsign(callsign)} />;
}

function DitherRoute({ children }: { children: React.ReactNode }) {
  return <DitherPageShell>{children}</DitherPageShell>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <DitherRoute>
            <HomeScreen />
          </DitherRoute>
        }
      />
      <Route path="/airport/:icao" element={<HomeScreen />} />
      <Route path="/aircraft/:callsign" element={<FlightRoute />} />
      <Route path="/here" element={<NearMeScreen />} />
      <Route
        path="/about"
        element={
          <DitherRoute>
            <AboutPanel />
          </DitherRoute>
        }
      />
      <Route
        path="/mechanism"
        element={
          <DitherRoute>
            <MechanismPanel />
          </DitherRoute>
        }
      />
      <Route
        path="/changelog"
        element={
          <DitherRoute>
            <ChangelogPanel />
          </DitherRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
