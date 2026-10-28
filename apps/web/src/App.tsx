import { useEffect, useState } from "react";
import type { User } from "@tripsync/core";
import { api, ApiError, getStoredUserId, storeUserId } from "./api";
import { navigate, useRoute } from "./router";
import { Welcome } from "./pages/Welcome";
import { Home } from "./pages/Home";
import { TripPage } from "./pages/TripPage";

export function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => getStoredUserId() !== null);

  useEffect(() => {
    if (!getStoredUserId()) return;
    api
      .me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) storeUserId(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = (u: User) => {
    storeUserId(u.id);
    setUser(u);
  };

  const signOut = () => {
    storeUserId(null);
    setUser(null);
    navigate("/");
  };

  if (loading) return <div className="center muted">Loading…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark">✈</span> TripSync
        </a>
        {user && (
          <div className="topbar-user">
            <span className="avatar">{user.name[0]?.toUpperCase()}</span>
            <span>{user.name}</span>
            <button className="link-button" onClick={signOut}>
              Switch user
            </button>
          </div>
        )}
      </header>
      <main className="content">
        {!user ? (
          <Welcome onSignIn={signIn} joinCode={route.name === "join" ? route.code : undefined} />
        ) : route.name === "trip" ? (
          <TripPage key={route.id} groupId={route.id} user={user} />
        ) : (
          <Home joinCode={route.name === "join" ? route.code : undefined} />
        )}
      </main>
    </div>
  );
}
