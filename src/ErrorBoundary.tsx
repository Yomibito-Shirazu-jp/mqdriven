import React from "react";

type Props = { children: React.ReactNode; fallbackTitle?: string };
type State = { hasError: boolean; error?: Error | null; errorInfo?: React.ErrorInfo | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const title = this.props.fallbackTitle || "問題が発生しました";
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              予期しないエラーが発生しました。再試行するか、ページを再読み込みしてください。
            </p>
            {isDev && error && (
              <details className="text-left mt-4">
                <summary className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                  エラー詳細（開発モード）
                </summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs text-red-700 dark:text-red-300 overflow-auto max-h-48 whitespace-pre-wrap">
                  {error.message}
                  {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                再試行
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                ページ再読込
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
