import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Send, LogOut, Plus, Trash2, Play, Pause, Settings, 
  MessageSquare, Filter, RefreshCw, Loader2, CheckCircle, XCircle 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../components/ui/dialog';

function DashboardPage({ userId, backendUrl, onLogout }) {
  const [chats, setChats] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newRule, setNewRule] = useState({
    sourceChat: '',
    destinationChat: '',
    keywords: '',
    filterMedia: false,
    mediaTypes: [],
    hideSource: true,  // Default: hide source (no "Forwarded from")
  });

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/telegram/chats/${userId}`);
      const data = await response.json();
      if (response.ok) {
        setChats(data.chats || []);
      } else {
        throw new Error(data.detail || 'Failed to fetch chats');
      }
    } catch (error) {
      toast.error(`Error loading chats: ${error.message}`);
    }
  }, [backendUrl, userId]);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/forwarding/rules/${userId}`);
      const data = await response.json();
      if (response.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      toast.error(`Error loading rules: ${error.message}`);
    }
  }, [backendUrl, userId]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/forwarding/logs/${userId}?limit=50`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }, [backendUrl, userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchChats(), fetchRules(), fetchLogs()]);
      setLoading(false);
    };
    loadData();

    // Refresh logs every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchChats, fetchRules, fetchLogs]);

  const handleCreateRule = async () => {
    const sourceChat = chats.find(c => c.id.toString() === newRule.sourceChat);
    const destChat = chats.find(c => c.id.toString() === newRule.destinationChat);

    if (!sourceChat || !destChat) {
      toast.error('Please select both source and destination chats');
      return;
    }

    if (sourceChat.id === destChat.id) {
      toast.error('Source and destination cannot be the same');
      return;
    }

    setIsCreatingRule(true);

    try {
      const response = await fetch(`${backendUrl}/api/forwarding/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          source_chat_id: parseInt(sourceChat.id),
          source_chat_name: sourceChat.name,
          destination_chat_id: parseInt(destChat.id),
          destination_chat_name: destChat.name,
          keywords: newRule.keywords.split(',').map(k => k.trim()).filter(k => k),
          filter_media: newRule.filterMedia,
          media_types: newRule.mediaTypes,
          hide_source: newRule.hideSource,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create rule');
      }

      toast.success('Rule created successfully!');
      setDialogOpen(false);
      setNewRule({
        sourceChat: '',
        destinationChat: '',
        keywords: '',
        filterMedia: false,
        mediaTypes: [],
        hideSource: true,
      });
      await fetchRules();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCreatingRule(false);
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      const response = await fetch(`${backendUrl}/api/forwarding/rules/${ruleId}/toggle`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to toggle rule');
      }

      toast.success(data.is_active ? 'Rule activated!' : 'Rule deactivated');
      await fetchRules();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`${backendUrl}/api/forwarding/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete rule');
      }

      toast.success('Rule deleted');
      await fetchRules();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Send className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">Telegram Autoforwarder</h1>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Forwarding Rules
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Forwarding Rules</h2>
                <p className="text-muted-foreground">Configure automatic message forwarding</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { fetchChats(); fetchRules(); }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create Forwarding Rule</DialogTitle>
                      <DialogDescription>
                        Set up automatic message forwarding between chats
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Source Chat</Label>
                        <Select
                          value={newRule.sourceChat}
                          onValueChange={(value) => setNewRule({ ...newRule, sourceChat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source chat" />
                          </SelectTrigger>
                          <SelectContent>
                            {chats.map((chat) => (
                              <SelectItem key={chat.id} value={chat.id.toString()}>
                                {chat.name} ({chat.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Destination Chat</Label>
                        <Select
                          value={newRule.destinationChat}
                          onValueChange={(value) => setNewRule({ ...newRule, destinationChat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination chat" />
                          </SelectTrigger>
                          <SelectContent>
                            {chats.map((chat) => (
                              <SelectItem key={chat.id} value={chat.id.toString()}>
                                {chat.name} ({chat.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Keywords (comma-separated, optional)</Label>
                        <Input
                          placeholder="bitcoin, crypto, news"
                          value={newRule.keywords}
                          onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Only forward messages containing these keywords. Leave empty to forward all.
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Filter by Media Type</Label>
                          <p className="text-xs text-muted-foreground">Only forward specific media types</p>
                        </div>
                        <Switch
                          checked={newRule.filterMedia}
                          onCheckedChange={(checked) => setNewRule({ ...newRule, filterMedia: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Hide Source</Label>
                          <p className="text-xs text-muted-foreground">Don't show "Forwarded from X" in destination</p>
                        </div>
                        <Switch
                          checked={newRule.hideSource}
                          onCheckedChange={(checked) => setNewRule({ ...newRule, hideSource: checked })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRule} disabled={isCreatingRule}>
                        {isCreatingRule ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                        ) : (
                          'Create Rule'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Rules List */}
            <div className="grid gap-4">
              {rules.length === 0 ? (
                <Card className="p-8 text-center">
                  <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No forwarding rules yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first rule to start forwarding messages</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Rule
                  </Button>
                </Card>
              ) : (
                rules.map((rule) => (
                  <Card key={rule.rule_id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{rule.source_chat_name}</span>
                          <Send className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{rule.destination_chat_name}</span>
                        </div>
                        {rule.keywords && rule.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rule.keywords.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRule(rule.rule_id)}
                        >
                          {rule.is_active ? (
                            <><Pause className="w-4 h-4 mr-1" /> Stop</>
                          ) : (
                            <><Play className="w-4 h-4 mr-1" /> Start</>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.rule_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Forwarding Logs</h2>
                <p className="text-muted-foreground">Real-time log of all forwarded messages</p>
              </div>
              <Button variant="outline" onClick={fetchLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Latest {logs.length} forwarding activities</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No forwarding activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.log_id}
                        className={`p-3 rounded-lg border ${log.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {log.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${log.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                              {log.status === 'success' ? 'Forwarded' : 'Failed'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.forwarded_at).toLocaleString()}
                          </span>
                        </div>
                        {log.message_text && (
                          <p className="mt-1 text-sm text-gray-600 truncate">
                            {log.message_text}
                          </p>
                        )}
                        {log.error_message && (
                          <p className="mt-1 text-sm text-red-600">
                            Error: {log.error_message}
                          </p>
                        )}
                        {log.has_media && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {log.media_type || 'media'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default DashboardPage;