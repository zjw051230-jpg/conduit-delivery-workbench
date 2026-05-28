import React from "react";

export function FileList({ files, emptyText }) {
  if (!files || files.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file}>{file}</li>
      ))}
    </ul>
  );
}
