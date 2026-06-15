import {
  ClerkProvider as ReactClerkProvider,
  SignInButton as ReactSignInButton,
  UserButton as ReactUserButton,
  useAuth as useReactAuth,
  useUser as useReactUser,
} from "@clerk/react";
import { createContext, useContext } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { runtimeEnvValue } from "@/platform/env/runtimeEnv";

type ClerkProviderProps = PropsWithChildren<{
  publishableKey?: string;
}>;

const anonymousUser = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
} as const;

const anonymousAuth = {
  getToken: async () => null,
} as const;

type UserState = ReturnType<typeof useReactUser> | typeof anonymousUser;
type AuthState = ReturnType<typeof useReactAuth> | typeof anonymousAuth;

const ClerkUserContext = createContext<UserState>(anonymousUser);
const ClerkAuthContext = createContext<AuthState>(anonymousAuth);

function getPublishableKey(explicit?: string) {
  return (
    explicit ||
    runtimeEnvValue("VITE_CLERK_PUBLISHABLE_KEY") ||
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    ""
  );
}

export function ClerkProvider({ children, publishableKey }: ClerkProviderProps) {
  const key = getPublishableKey(publishableKey);
  if (!key) {
    return (
      <ClerkAuthContext.Provider value={anonymousAuth}>
        <ClerkUserContext.Provider value={anonymousUser}>
          {children}
        </ClerkUserContext.Provider>
      </ClerkAuthContext.Provider>
    );
  }
  return (
    <ReactClerkProvider publishableKey={key}>
      <ClerkUserBridge>{children}</ClerkUserBridge>
    </ReactClerkProvider>
  );
}

function ClerkUserBridge({ children }: PropsWithChildren) {
  const userState = useReactUser();
  const authState = useReactAuth();
  return (
    <ClerkAuthContext.Provider value={authState}>
      <ClerkUserContext.Provider value={userState}>
        {children}
      </ClerkUserContext.Provider>
    </ClerkAuthContext.Provider>
  );
}

export function useUser() {
  return useContext(ClerkUserContext);
}

export function useAuth() {
  return useContext(ClerkAuthContext);
}

export function SignInButton({
  children,
}: PropsWithChildren<{ mode?: "modal" | "redirect" }>) {
  const key = getPublishableKey();
  if (!key) return <>{children}</>;
  return <ReactSignInButton mode="modal">{children as ReactNode}</ReactSignInButton>;
}

export function UserButton(props: Record<string, unknown>) {
  const key = getPublishableKey();
  if (!key) return null;
  return <ReactUserButton {...props} />;
}
