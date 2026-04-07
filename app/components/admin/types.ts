// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
/** Shared types for user & database management components. */

export interface User {
  username: string;
  roles: string[];
  active: boolean;
  createdAt: number;
  passwordChangeRequired: boolean;
}

export interface Role {
  name: string;
  privileges: Privilege[];
  builtIn: boolean;
}

export interface Privilege {
  action: string;
  resource: string;
  grant: "granted" | "denied";
}

export type DatabaseStatus = "online" | "offline" | "starting" | "stopping" | "error";

export interface DatabaseInfo {
  name: string;
  status: DatabaseStatus;
  isDefault: boolean;
  nodeCount: number;
  relationshipCount: number;
  sizeBytes: number;
}
