import { Component, lazy, Suspense, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Plane } from "lucide-react";
import { normalizeCallsign } from "@/utils/callsign";
import { isOnboardMode } from "@/features/aircraft/onboard/onboardModeModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

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
  const onboardMode = isOnboardMode(searchParams.get("mode"));
  return (
    <FlightScreen
      callsign={normalizeCallsign(callsign)}
      onboardMode={onboardMode}
    />
  );
}

type RouteErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = { hasError: boolean };

class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function RouteLoadingState({ failed = false }: { failed?: boolean }) {
  const { t } = useI18n();

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-atc-bg px-6 text-atc-text"
      role={failed ? "alert" : "status"}
    >
      <div className="flex w-full max-w-[286px] flex-col items-start gap-3 rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] px-4 py-4 shadow-[var(--atc-control-inset-shadow)] [backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-atc-dim">
          <Plane className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("map.routeLoadingEyebrow")}</span>
        </div>
        <div className="text-[15px] font-medium leading-snug text-atc-text">
          {t(failed ? "map.routeLoadFailedTitle" : "map.routeLoadingTitle")}
        </div>
        <div className="text-[12px] leading-snug text-atc-dim">
          {t(failed ? "map.routeLoadFailedHint" : "map.routeLoadingHint")}
        </div>
        {failed ? (
          <button
            className="mt-1 h-9 rounded-[var(--atc-radius-pill)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-hover)] px-3 text-[12px] font-semibold text-atc-text shadow-[var(--atc-control-inset-shadow-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("map.routeLoadRetry")}
          </button>
        ) : null}
      </div>
    </main>
  );
}

function RouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <RouteErrorBoundary
      fallback={<RouteLoadingState failed />}
      resetKey={`${location.pathname}${location.search}`}
    >
      <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
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
