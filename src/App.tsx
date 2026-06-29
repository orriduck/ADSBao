import { lazy, Suspense, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { normalizeCallsign } from "@/utils/callsign";
import { normalizeAircraftHex } from "@/lib/realtime/realtimeChannels";

const DitherPageShell = lazy(() => import("@/components/app-shell/DitherPageShell"));
const AboutPanel = lazy(() => import("@/components/about/AboutPanel"));
const ChangelogPanel = lazy(() => import("@/components/changelog/ChangelogPanel"));
const MechanismPanel = lazy(() => import("@/components/mechanism/MechanismPanel"));
const FlightScreen = lazy(() => import("@/components/screens/FlightScreen"));
const HomeScreen = lazy(() => import("@/components/screens/HomeScreen"));
const NearMeScreen = lazy(() => import("@/components/screens/NearMeScreen"));

function FlightRoute() {
  const { callsign = "" } = useParams();
  const [searchParams] = useSearchParams();
  // ?icao= 提示:从地图/侧栏点进来时带上的 ICAO24,让详情页在 /callsign/
  // 上游索引缺这架时回落到稳定的 /hex/ 源。冷链接没有它则照旧。
  const icaoHint = normalizeAircraftHex(searchParams.get("icao"));
  return (
    <FlightScreen callsign={normalizeCallsign(callsign)} icaoHint={icaoHint} />
  );
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
