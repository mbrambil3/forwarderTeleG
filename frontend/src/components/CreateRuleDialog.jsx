import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { Search, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateRuleDialog = ({ open, onClose, userId, onRuleCreated }) => {
  const [step, setStep] = useState(1); // 1: source, 2: destination, 3: filters
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sourceChat, setSourceChat] = useState(null);
  const [destinationChat, setDestinationChat] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [filterMedia, setFilterMedia] = useState(false);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState([]);

  const mediaTypes = ['photo', 'video', 'document', 'audio'];

  useEffect(() => {
    if (open) {
      fetchChats();
    }
  }, [open]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/telegram/chats/${userId}`);
      setChats(response.data.chats);
    } catch (error) {
      toast.error('Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.username && chat.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateRule = async () => {
    if (!sourceChat || !destinationChat) {
      toast.error('Please select both source and destination chats');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/forwarding/rules`, {
        user_id: userId,
        source_chat_id: sourceChat.id,
        source_chat_name: sourceChat.name,
        destination_chat_id: destinationChat.id,
        destination_chat_name: destinationChat.name,
        keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [],
        filter_media: filterMedia,
        media_types: selectedMediaTypes
      });
      
      toast.success('Rule created successfully!');
      onRuleCreated();
      handleClose();
    } catch (error) {
      toast.error('Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSourceChat(null);
    setDestinationChat(null);
    setKeywords('');
    setFilterMedia(false);
    setSelectedMediaTypes([]);
    setSearchQuery('');
    onClose();
  };

  const toggleMediaType = (type) => {
    setSelectedMediaTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="create-rule-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Create Forwarding Rule - Step {step} of 3
          </DialogTitle>
          <DialogDescription className="font-body">
            {step === 1 && 'Select the source chat to forward messages from'}
            {step === 2 && 'Select the destination chat to forward messages to'}
            {step === 3 && 'Configure filters (optional)'}
          </DialogDescription>
        </DialogHeader>

        {(step === 1 || step === 2) && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-body"
                data-testid="chat-search-input"
              />
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground font-body">Loading chats...</p>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground font-body">No chats found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChats.map((chat) => {
                    const isSelected = step === 1 ? sourceChat?.id === chat.id : destinationChat?.id === chat.id;
                    return (
                      <button
                        key={chat.id}
                        onClick={() => step === 1 ? setSourceChat(chat) : setDestinationChat(chat)}
                        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-accent border-border'
                        }`}
                        data-testid={`chat-option-${chat.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-heading font-semibold">{chat.name}</p>
                            <p className={`text-xs font-body font-mono ${
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              ID: {chat.id} | Type: {chat.type}
                              {chat.username && ` | @${chat.username}`}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-body font-medium">Source</p>
                  <p className="text-lg font-heading font-semibold">{sourceChat?.name}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-body font-medium">Destination</p>
                  <p className="text-lg font-heading font-semibold">{destinationChat?.name}</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keywords" className="font-body font-medium">Keywords (comma-separated, optional)</Label>
                <Input
                  id="keywords"
                  data-testid="keywords-input"
                  placeholder="crypto, bitcoin, news"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="font-body"
                />
                <p className="text-xs text-muted-foreground font-body">
                  Only forward messages containing these keywords
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter_media"
                    checked={filterMedia}
                    onCheckedChange={setFilterMedia}
                    data-testid="filter-media-checkbox"
                  />
                  <Label htmlFor="filter_media" className="font-body font-medium cursor-pointer">
                    Filter by media type
                  </Label>
                </div>

                {filterMedia && (
                  <div className="ml-6 space-y-2">
                    <p className="text-xs text-muted-foreground font-body mb-2">Select media types to forward:</p>
                    {mediaTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`media_${type}`}
                          checked={selectedMediaTypes.includes(type)}
                          onCheckedChange={() => toggleMediaType(type)}
                          data-testid={`media-type-${type}`}
                        />
                        <Label htmlFor={`media_${type}`} className="font-body capitalize cursor-pointer">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              data-testid="back-btn"
              className="font-body"
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !sourceChat : !destinationChat}
              data-testid="next-btn"
              className="font-body font-medium"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateRule}
              disabled={loading}
              data-testid="create-btn"
              className="font-body font-medium"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRuleDialog;