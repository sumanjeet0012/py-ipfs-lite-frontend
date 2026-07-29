import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import DashboardPage from "@/pages/DashboardPage";
import FilesPage from "@/pages/FilesPage";
import BlocksPage from "@/pages/BlocksPage";
import DagPage from "@/pages/DagPage";
import PinsPage from "@/pages/PinsPage";
import SwarmPage from "@/pages/SwarmPage";
import RepoPage from "@/pages/RepoPage";
import IpnsPage from "@/pages/IpnsPage";
import DebugPage from "@/pages/DebugPage";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/blocks" element={<BlocksPage />} />
              <Route path="/dag" element={<DagPage />} />
              <Route path="/pins" element={<PinsPage />} />
              <Route path="/swarm" element={<SwarmPage />} />
              <Route path="/repo" element={<RepoPage />} />
              <Route path="/ipns" element={<IpnsPage />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
