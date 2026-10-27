//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { BrandedScreen } from './components/brand';
import { buttonStyles } from './components/styles';

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) => {
  const message = error instanceof Error ? error.message : String(error);

  // Log to the console so DevTools shows the full stack regardless of
  // environment. The styled fallback below is what users see.
  if (import.meta.env.DEV) console.error('[ErrorBoundary]', error);

  return (
    <BrandedScreen>
      <h1 className="font-heading text-500 font-semibold text-card-foreground">Something went wrong</h1>
      <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-300 text-left text-200 whitespace-pre-wrap text-muted-foreground">
        {message}
      </pre>
      <button type="button" onClick={resetErrorBoundary} className={buttonStyles.secondary}>
        Try again
      </button>
    </BrandedScreen>
  );
};
