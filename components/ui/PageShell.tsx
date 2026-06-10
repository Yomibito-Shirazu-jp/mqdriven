import React from 'react';

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'md';
};

const PageShell: React.FC<PageShellProps> = ({ children, className, padding = 'md' }) => {
  const paddingClass = padding === 'none' ? 'p-0' : 'px-6 py-4';
  const classes = [
    'mq-page',
    'w-full',
    paddingClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <section className={classes}>{children}</section>;
};

export default PageShell;
