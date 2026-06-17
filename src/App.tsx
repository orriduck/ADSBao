import { lazy, Suspense, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { normalizeCallsign } from "@/utils/callsign";

const DitherPageShell = lazy(() => import("@/components/app-shell/DitherPageShell"));
const AboutPanel = lazy(() => import("@/components/about/AboutPanel"));
const ChangelogPanel = lazy(() => import("@/components/changelog/ChangelogPanel"));
const MechanismPanel = lazy(() => import("@/components/mechanism/MechanismPanel"));
const FlightScreen = lazy(() => import("@/components/screens/FlightScreen"));
const HomeScreen = lazy(() => import("@/components/screens/HomeScreen"));
const NearMeScreen = lazy(() => import("@/components/screens/NearMeScreen"));

function FlightRoute() {
  const { callsign = "" } = useParams();
  return <FlightScreen callsign={normalizeCallsign(callsign)} />;
}

function RouteBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function DitherRoute({ children }: { children: ReactNode }) {
  return <DitherPageShell>{children}</DitherPageShell>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RouteBoundary>
            <DitherRoute>
              <HomeScreen />
            </DitherRoute>
          </RouteBoundary>
        }
      />
      <Route
        path="/airport/:icao"
        element={
          <RouteBoundary>
            <HomeScreen />
          </RouteBoundary>
        }
      />
      <Route
        path="/aircraft/:callsign"
        element={
          <RouteBoundary>
            <FlightRoute />
          </RouteBoundary>
        }
      />
      <Route
        path="/here"
        element={
          <RouteBoundary>
            <NearMeScreen />
          </RouteBoundary>
        }
      />
      <Route
        path="/about"
        element={
          <RouteBoundary>
            <DitherRoute>
              <AboutPanel />
            </DitherRoute>
          </RouteBoundary>
        }
      />
      <Route
        path="/mechanism"
        element={
          <RouteBoundary>
            <DitherRoute>
              <MechanismPanel />
            </DitherRoute>
          </RouteBoundary>
        }
      />
      <Route
        path="/changelog"
        element={
          <RouteBoundary>
            <DitherRoute>
              <ChangelogPanel />
            </DitherRoute>
          </RouteBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
