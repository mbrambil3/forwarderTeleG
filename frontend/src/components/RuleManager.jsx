import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Power, ArrowRight } from 'lucide-react';
import CreateRuleDialog from './CreateRuleDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RuleManager = ({ userId, rules, onRulesChange }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [togglingRules, setTogglingRules] = useState(new Set());
  const [deletingRules, setDeletingRules] = useState(new Set());

  const handleToggleRule = async (ruleId) => {
    setTogglingRules(prev => new Set([...prev, ruleId]));
    try {
      await axios.post(`${API}/forwarding/rules/${ruleId}/toggle`);
      toast.success('Rule status updated');
      onRulesChange();
    } catch (error) {
      toast.error('Failed to toggle rule');
    } finally {
      setTogglingRules(prev => {
        const newSet = new Set(prev);
        newSet.delete(ruleId);
        return newSet;
      });
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    setDeletingRules(prev => new Set([...prev, ruleId]));
    try {
      await axios.delete(`${API}/forwarding/rules/${ruleId}`);
      toast.success('Rule deleted successfully');
      onRulesChange();
    } catch (error) {
      toast.error('Failed to delete rule');
    } finally {
      setDeletingRules(prev => {
        const newSet = new Set(prev);
        newSet.delete(ruleId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="rule-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">Forwarding Rules</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Manage your message forwarding rules
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="add-rule-btn"
          className="font-body font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed" data-testid="no-rules-message">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground font-body">No rules created yet. Click "Add Rule" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <Card
              key={rule.rule_id}
              className="hover:shadow-md transition-shadow duration-200"
              data-testid={`rule-card-${rule.rule_id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg font-heading">
                        {rule.source_chat_name}
                      </CardTitle>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-lg font-heading">
                        {rule.destination_chat_name}
                      </CardTitle>
                    </div>
                    <CardDescription className="font-body">
                      <span className="font-mono text-xs">
                        {rule.source_chat_id} → {rule.destination_chat_id}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge
                    variant={rule.is_active ? 'default' : 'secondary'}
                    className="font-body"
                    data-testid={`rule-status-${rule.rule_id}`}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="space-y-2">
                  {rule.keywords && rule.keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-body font-medium text-muted-foreground mb-1">Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="font-body text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.filter_media && rule.media_types && rule.media_types.length > 0 && (
                    <div>
                      <p className="text-xs font-body font-medium text-muted-foreground mb-1">Media Types:</p>
                      <div className="flex flex-wrap gap-1">
                        {rule.media_types.map((type, idx) => (
                          <Badge key={idx} variant="outline" className="font-body text-xs capitalize">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant={rule.is_active ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => handleToggleRule(rule.rule_id)}
                    disabled={togglingRules.has(rule.rule_id)}
                    data-testid={`toggle-rule-btn-${rule.rule_id}`}
                    className="font-body"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    {togglingRules.has(rule.rule_id)
                      ? 'Processing...'
                      : rule.is_active
                      ? 'Stop'
                      : 'Start'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.rule_id)}
                    disabled={deletingRules.has(rule.rule_id)}
                    data-testid={`delete-rule-btn-${rule.rule_id}`}
                    className="font-body"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deletingRules.has(rule.rule_id) ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRuleDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        userId={userId}
        onRuleCreated={onRulesChange}
      />
    </div>
  );
};

export default RuleManager;