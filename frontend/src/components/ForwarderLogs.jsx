import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { FileText, CheckCircle2, XCircle, Image, Video, FileIcon, Music } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForwarderLogs = ({ userId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/forwarding/logs/${userId}`);
      setLogs(response.data.logs);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const getMediaIcon = (mediaType) => {
    switch (mediaType) {
      case 'photo':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <FileIcon className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6" data-testid="forwarder-logs">
      <div>
        <h2 className="text-2xl font-heading font-bold">Forwarding Logs</h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Real-time log of all forwarded messages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Activity Log
          </CardTitle>
          <CardDescription className="font-body">
            Latest {logs.length} forwarding activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground font-body">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12" data-testid="no-logs-message">
              <p className="text-muted-foreground font-body">No forwarding activity yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.log_id}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors duration-200"
                    data-testid={`log-entry-${log.log_id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <Badge
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className="font-body"
                        >
                          {log.status}
                        </Badge>
                        {log.has_media && (
                          <Badge variant="outline" className="font-body flex items-center gap-1">
                            {getMediaIcon(log.media_type)}
                            {log.media_type}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(log.forwarded_at)}
                      </span>
                    </div>
                    
                    {log.message_text && (
                      <p className="text-sm font-body text-foreground mb-2 pl-7">
                        {log.message_text}
                      </p>
                    )}
                    
                    {log.error_message && (
                      <p className="text-xs font-mono text-destructive pl-7 bg-destructive/10 p-2 rounded">
                        Error: {log.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForwarderLogs;