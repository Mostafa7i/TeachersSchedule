"use client";

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-4 my-4 max-w-2xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-black text-red-950">
              {this.props.title || "حدث خطأ غير متوقع أثناء عرض هذا الجزء"}
            </h3>
            <p className="text-xs text-red-700 font-medium mt-1">
              {this.state.error?.message || "تعذر إكمال العملية بشكل سليم. يمكنك المحاولة مرة أخرى."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span>
              <span>إعادة المحاولة</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              إعادة تحميل الصفحة
            </button>
          </div>

          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="text-right text-[11px] bg-red-100/50 p-3 rounded-xl border border-red-200 mt-3 text-red-900 overflow-x-auto" dir="ltr">
              <summary className="font-bold cursor-pointer mb-1 text-red-800">
                Technical Error Details (Dev Only)
              </summary>
              <pre className="font-mono whitespace-pre-wrap">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
