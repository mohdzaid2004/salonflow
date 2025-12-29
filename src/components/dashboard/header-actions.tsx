'use client';

import { useHeaderActions } from './header-actions-context';

export function HeaderActions() {
  const { actions } = useHeaderActions();

  if (!actions) {
    return null;
  }

  return <>{actions}</>;
}
