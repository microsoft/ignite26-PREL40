//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { browserSession } from '@microsoft/rayfin-auth';
import { RayfinClient, resolveRayfinConfig } from '@microsoft/rayfin-client';
import { connectorsService } from '@microsoft/rayfin-connectors';
import { dataService } from '@microsoft/rayfin-data';
import type { UniversalAppSchema } from '@rayfin-app/shared';
import {
  connectorConfigs,
  connectorRuntimes,
  type AppConnectorsSchema,
} from './connectors';

export type AppClient = Awaited<ReturnType<typeof createClient>>;

let _client: Promise<AppClient> | undefined;

export class MissingRayfinConfigError extends Error {
  constructor(readonly missing: readonly string[]) {
    super(`Missing required Rayfin configuration: ${missing.join(', ')}`);
    this.name = 'MissingRayfinConfigError';
  }
}

/** Returns the app's typed data, auth, and connector client. */
export async function getRayfinClient(): Promise<AppClient> {
  if (!_client) {
    _client = createClient().catch((error) => {
      _client = undefined;
      throw error;
    });
  }

  return _client;
}

async function createClient() {
  const resolved = await resolveRayfinConfig({
    apiUrl: import.meta.env.VITE_RAYFIN_API_URL,
    publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
    workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID,
    itemId: import.meta.env.VITE_FABRIC_ITEM_ID,
    portalUrl: import.meta.env.VITE_FABRIC_PORTAL_URL,
  });

  const { baseUrl, publishableKey, runtimeConfig } = resolved;
  if (typeof baseUrl !== 'string' || !publishableKey?.trim()) {
    throw new MissingRayfinConfigError([
      ...(typeof baseUrl !== 'string' ? ['apiUrl'] : []),
      ...(!publishableKey?.trim() ? ['publishableKey'] : []),
    ]);
  }

  return RayfinClient.create({
    baseUrl,
    publishableKey,
    runtimeConfig,
    auth: browserSession({ storage: true }),
    services: {
      data: dataService<UniversalAppSchema>(),
      connectors: connectorsService<AppConnectorsSchema>({
        configs: connectorConfigs,
        runtime: connectorRuntimes,
      }),
    },
  });
}
