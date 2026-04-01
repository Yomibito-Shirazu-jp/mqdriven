import React from 'react';
import ErrorBoundary from '../ErrorBoundary';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Wraps page-level content so that a crash in one page
 * does not take down the entire app shell (sidebar, header).
 */
const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ children }) => (
  <ErrorBoundary fallbackTitle="このページでエラーが発生しました">
    {children}
  </ErrorBoundary>
);

export default PageErrorBoundary;
