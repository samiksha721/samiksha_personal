import { useEffect, useState } from "react";

export type Route = { name: "home" } | { name: "trip"; id: string } | { name: "join"; code: string };

function parse(hash: string): Route {
  const [, kind, value] = hash.replace(/^#/, "").split("/");
  if (kind === "trip" && value) return { name: "trip", id: value };
  if (kind === "join" && value) return { name: "join", code: decodeURIComponent(value) };
  return { name: "home" };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
