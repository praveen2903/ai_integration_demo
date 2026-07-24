import React from 'react';

interface LogViewerProps {
  systemLogs: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ systemLogs }) => {
  return (
    <section className="logs-section">
      <h3 style={{ color: 'white', marginBottom: '12px' }}>Server Error Log Viewer (`error_log`)</h3>
      <div className="logs-box">
        {systemLogs.trim() ? (
          systemLogs
        ) : (
          <span className="empty-logs">No errors logged. Everything is running smoothly!</span>
        )}
      </div>
    </section>
  );
};
