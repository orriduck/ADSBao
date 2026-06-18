import { useEffect } from "react";
import {
  registerAdsbaoWebMcpTools,
  type WebMcpModelContext,
} from "@/features/webmcp/webMcpTools";

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }
}

const getPageContext = () => ({
  href: window.location.href,
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
  title: document.title,
  heading: document.querySelector("h1")?.textContent?.trim() || "",
});

export default function WebMcpProvider() {
  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) return;

    const controller = new AbortController();
    registerAdsbaoWebMcpTools(
      modelContext,
      {
        fetch: window.fetch.bind(window),
        navigate: (path) => window.location.assign(path),
        getPageContext,
      },
      controller.signal,
    ).catch((error) => {
      console.warn("[webmcp] failed to register ADSBao tools", error);
    });

    return () => controller.abort();
  }, []);

  return null;
}
