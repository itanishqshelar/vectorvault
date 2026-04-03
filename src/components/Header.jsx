'use client';

export default function Header({ onUploadClick }) {
  return (
    <header className="header">
      <div className="header-title">Chat with your documents</div>
      <div className="header-actions">
        <button className="btn btn-primary" onClick={onUploadClick}>
          + Upload Document
        </button>
      </div>
    </header>
  );
}
