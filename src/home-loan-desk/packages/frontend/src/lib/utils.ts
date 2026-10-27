//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom font-size scale in global.css so `text-200`
// isn't mistaken for a text color and dropped next to `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['100', '200', '300', '400', '500', '600', 'hero-700', 'hero-800', 'hero-900', 'hero-1000'],
    },
  },
});

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 *   cn("px-2 py-1", isActive && "bg-primary text-primary-foreground")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
