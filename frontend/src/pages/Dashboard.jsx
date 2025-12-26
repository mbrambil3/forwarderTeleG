import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, Plus, Activity, List, FileText } from 'lucide-react';
import RuleManager from '../components/RuleManager';
import ForwarderLogs from '../components/ForwarderLogs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ userId, onLogout }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/forwarding/rules/${userId}`);
      setRules(response.data.rules);
    } catch (error) {
      toast.error('Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [userId]);

  const activeRulesCount = rules.filter(r => r.is_active).length;
  const inactiveRulesCount = rules.filter(r => !r.is_active).length;

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      {/* Header */}
      <div className="backdrop-blur-xl bg-background/80 border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-foreground">Telegram Autoforwarder</h1>
              <p className="text-xs text-muted-foreground font-body">Manage your forwarding rules</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onLogout}
            data-testid="logout-btn"
            className="font-body"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" data-testid="overview-tab" className="font-body">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="rules-tab" className="font-body">
              <List className="w-4 h-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="logs-tab" className="font-body">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6" data-testid="overview-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium text-muted-foreground">
                    Total Rules
                  </CardTitle>
                  <List className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-heading font-bold" data-testid="total-rules-count">{rules.length}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium text-muted-foreground">
                    Active Rules
                  </CardTitle>
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-heading font-bold text-green-600" data-testid="active-rules-count">{activeRulesCount}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium text-muted-foreground">
                    Inactive Rules
                  </CardTitle>
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-heading font-bold text-gray-500" data-testid="inactive-rules-count">{inactiveRulesCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Quick Actions</CardTitle>
                <CardDescription className="font-body">Get started with forwarding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setActiveTab('rules')}
                  className="w-full font-body font-medium"
                  data-testid="create-rule-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Forwarding Rule
                </Button>
                <p className="text-sm text-muted-foreground font-body text-center">
                  Create rules to automatically forward messages from one chat to another
                </p>
              </CardContent>
            </Card>

            {/* Empty State */}
            {rules.length === 0 && (
              <Card className="border-dashed" data-testid="empty-state">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                    <List className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold mb-2">No Rules Yet</h3>
                  <p className="text-sm text-muted-foreground font-body text-center max-w-md mb-6">
                    Create your first forwarding rule to start automatically forwarding messages
                  </p>
                  <Button onClick={() => setActiveTab('rules')} className="font-body font-medium">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" data-testid="rules-content">
            <RuleManager userId={userId} rules={rules} onRulesChange={fetchRules} />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" data-testid="logs-content">
            <ForwarderLogs userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;