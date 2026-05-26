"use client";

export function Briefing({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="briefing-card">
      <p className="briefing-text">{text}</p>
    </div>
  );
}
