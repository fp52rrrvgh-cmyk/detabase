"use client";

import { useState } from "react";

export function Briefing({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  // On mobile, show only first 2 sentences, rest folded
  const sentences = text.split(/[。！]/).filter(Boolean);
  const isLong = sentences.length > 2;
  const displayText = !expanded && isLong
    ? sentences.slice(0, 2).join("。") + "。"
    : text;

  return (
    <div className="briefing-card" onClick={() => isLong && setExpanded(!expanded)} style={{ cursor: isLong ? "pointer" : "default" }}>
      <p className="briefing-text">{displayText}</p>
      {isLong && (
        <span className="briefing-toggle">
          {expanded ? "▲ 收起" : "▼ 更多"}
        </span>
      )}
    </div>
  );
}
