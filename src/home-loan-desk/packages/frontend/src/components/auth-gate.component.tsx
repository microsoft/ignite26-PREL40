//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type ReactNode } from 'react';

import { BrandedScreen } from '@/components/brand';
import { useAuth } from '@/hooks/auth.context';

const title = 'font-heading text-500 font-semibold text-card-foreground';
const text = 'text-300 text-muted-foreground';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const {
    isLoading,
    isAuthenticated,
    canSignIn,
    signIn,
    isSigningIn,
    signInError,
    config,
    error,
  } = useAuth();

  if (isLoading) {
    return (
      <BrandedScreen>
        <p role="status" className="text-300 text-muted-foreground">
          Connecting to Fabric…
        </p>
      </BrandedScreen>
    );
  }

  if (config.kind === 'not-deployed') {
    return (
      <BrandedScreen>
        <h1 className={title}>Configure this app to sign in</h1>
        <p className={text}>
          Signing in needs a Fabric backend. Start{' '}
          <code className="rounded-sm bg-muted px-100 py-100-nudge text-200">npm run dev</code> with an approved
          workspace, or deploy this app, then reload.
        </p>
      </BrandedScreen>
    );
  }

  if (config.kind === 'incomplete') {
    return (
      <BrandedScreen>
        <h1 className={title}>This app is missing its Rayfin configuration</h1>
        <p className={text}>
          The dev server started without {config.missing.join(', ')}. Check the warnings it printed, then
          restart it.
        </p>
      </BrandedScreen>
    );
  }

  if (config.kind === 'config-error') {
    return (
      <BrandedScreen>
        <h1 className={title}>Couldn't load this app's configuration</h1>
        <p className={text}>
          The app stopped rather than fall back to the values it was built with, which in a promoted
          environment point at the wrong backend. Redeploy this stage, then reload.
        </p>
        <p className="text-200 text-muted-foreground">{config.message}</p>
      </BrandedScreen>
    );
  }

  if (error && !canSignIn) {
    return (
      <BrandedScreen>
        <h1 className={title}>Couldn't sign you in</h1>
        <p className={text}>{error.message}</p>
      </BrandedScreen>
    );
  }

  if (!isAuthenticated && canSignIn) {
    return (
      <BrandedScreen>
        <h1 className={title}>{error ? "Couldn't sign you in automatically" : 'Sign in to your desk'}</h1>
        {error ? (
          <p role="alert" className="text-300 text-destructive">
            {error.message}
          </p>
        ) : (
          <p className={text}>Use your Microsoft work account.</p>
        )}
        <button
          type="button"
          className="mt-200 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-400 text-300 font-semibold text-primary-foreground shadow-[0_1px_2px_rgb(16_24_40/0.12)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningIn}
          onClick={() => void signIn()}
        >
          {isSigningIn ? 'Signing in…' : error ? 'Try Sign in with Microsoft' : 'Sign in with Microsoft'}
        </button>
        {signInError ? (
          <p role="alert" className="text-300 text-destructive">
            {signInError.message}
          </p>
        ) : null}
      </BrandedScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <BrandedScreen>
        <h1 className={title}>Sign-in is unavailable</h1>
        <p className={text}>
          This app requires an authenticated session. Check the authentication configuration, then reload to
          try again.
        </p>
      </BrandedScreen>
    );
  }

  return <>{children}</>;
}
