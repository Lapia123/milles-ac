import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Users, User, Search, Plus, Check, CheckCheck,
  Loader2, Clock,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Messages() {
  const { user, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatDialog, setNewChatDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        // Filter out current user
        setUsers(data.filter(u => u.user_id !== user?.user_id));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [getAuthHeaders, user]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/conversations`, { headers: getAuthHeaders() });
      if (response.ok) {
        setConversations(await response.json());
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [getAuthHeaders]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (recipientId) => {
    if (!recipientId) return;
    try {
      const response = await fetch(`${API_URL}/api/messages/conversation/${recipientId}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setMessages(await response.json());
        // Scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchConversations()]);
      setLoading(false);
    };
    init();
  }, [fetchUsers, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user_id);
      // Mark as read
      markAsRead(selectedConversation.user_id);
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.user_id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, fetchMessages]);

  const markAsRead = async (recipientId) => {
    try {
      await fetch(`${API_URL}/api/messages/mark-read/${recipientId}`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      fetchConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation.user_id,
          content: newMessage
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(selectedConversation.user_id);
        fetchConversations();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = () => {
    if (!selectedRecipient) {
      toast.error('Please select a user');
      return;
    }

    const recipient = users.find(u => u.user_id === selectedRecipient);
    if (recipient) {
      setSelectedConversation({
        user_id: recipient.user_id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role
      });
      setNewChatDialog(false);
      setSelectedRecipient('');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
          <p className="text-slate-500 mt-1">Internal messaging system</p>
        </div>
        <Button onClick={() => setNewChatDialog(true)} data-testid="new-chat-btn">
          <Plus className="w-4 h-4 mr-2" /> New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {/* Conversations List */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="pb-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-[500px]">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new message</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conv => (
                    <div
                      key={conv.user_id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedConversation?.user_id === conv.user_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedConversation(conv)}
                      data-testid={`conversation-${conv.user_id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                            {getInitials(conv.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800 truncate">{conv.name}</span>
                            <span className="text-xs text-slate-400">{formatTime(conv.last_message_at)}</span>
                          </div>
                          <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs">{conv.role}</Badge>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-blue-600 text-white text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(selectedConversation.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedConversation.name}</h3>
                    <p className="text-sm text-slate-500">{selectedConversation.email}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">{selectedConversation.role}</Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation</p>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.message_id}
                          className={`flex ${msg.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === user?.user_id
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-slate-100 text-slate-800 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              msg.sender_id === user?.user_id ? 'text-blue-200' : 'text-slate-400'
                            }`}>
                              <span className="text-xs">{formatTime(msg.created_at)}</span>
                              {msg.sender_id === user?.user_id && (
                                msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                    data-testid="message-input"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} data-testid="send-btn">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-slate-600">Select a conversation</h3>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialog} onOpenChange={setNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> New Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select User</Label>
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger className="mt-1" data-testid="recipient-select">
                  <SelectValue placeholder="Choose a user to message..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{u.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{u.role}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatDialog(false)}>Cancel</Button>
            <Button onClick={handleStartNewChat} disabled={!selectedRecipient}>
              <MessageSquare className="w-4 h-4 mr-2" /> Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
