"use client";

import { useState } from "react";
import type { WorkspaceSummary } from "@/lib/types";

const DEFAULT_WORKSPACE: WorkspaceSummary = {
  id: "workspace-acme",
  name: "Acme Studio",
  slug: "acme-studio",
  plan: "free",
  role: "admin",
  createdAt: "2026-07-01T00:00:00.000Z",
};

export function useWorkspaceData() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([
    DEFAULT_WORKSPACE,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] =
    useState(DEFAULT_WORKSPACE.id);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  return {
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaceMenuOpen,
    setWorkspaceMenuOpen,
    newWorkspaceName,
    setNewWorkspaceName,
    creatingWorkspace,
    setCreatingWorkspace,
  };
}
