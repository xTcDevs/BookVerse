import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('BookVerse application error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="error-page">
        <div className="error-card">
          <span className="eyebrow">BookVerse</span>
          <h1>Something went wrong.</h1>
          <p>The page hit an unexpected error. Your saved library and reading progress are still stored locally.</p>
          <button className="primary-action" type="button" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      </main>
    );
  }
}
