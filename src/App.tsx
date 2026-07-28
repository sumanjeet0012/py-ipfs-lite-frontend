import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
