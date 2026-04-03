'use client';

export default function ConflictBanner({ detected, details }) {
  if (detected) {
    return (
      <div className="conflict-banner warning">
        <div className="conflict-banner-header">
          {'\u26A0\uFE0F'} Conflict Detected
        </div>
        <div className="conflict-banner-details">{details}</div>
      </div>
    );
  }

  return (
    <div className="conflict-banner safe">
      <div className="conflict-banner-header">
        {'\u2713'} Sources Consistent
      </div>
      <div className="conflict-banner-details">No conflicting information found across sources.</div>
    </div>
  );
}
