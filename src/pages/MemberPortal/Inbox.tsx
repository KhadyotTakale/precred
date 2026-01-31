import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { elegantAPI, Conversation, ConversationMessage } from "@/lib/elegant-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MemberInbox = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newTopic, setNewTopic] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, ConversationMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<number | null>(null);

  const fetchConversations = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await elegantAPI.getConversations(user.id, page);
      setConversations(response.items || []);
      setCurrentPage(response.curPage);
      setTotalPages(response.pageTotal);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    if (!user?.id) return;
    
    setLoadingMessages(conversationId);
    try {
      const response = await elegantAPI.getConversationDetails(user.id, conversationId);
      setMessages(prev => ({
        ...prev,
        [conversationId]: response._messages?.items || []
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(null);
    }
  };

  const handleToggleExpand = async (conversationId: number) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
    } else {
      setExpandedId(conversationId);
      if (!messages[conversationId]) {
        await fetchMessages(conversationId);
      }
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  const handleCreateConversation = async () => {
    if (!user?.id || !newTopic.trim()) return;

    setCreating(true);
    try {
      await elegantAPI.createConversation(user.id, newTopic.trim());
      toast({
        title: "Success",
        description: "Conversation started successfully",
      });
      setNewTopic("");
      setIsDialogOpen(false);
      fetchConversations(currentPage);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (conversationId: number) => {
    const text = replyText[conversationId]?.trim();
    if (!user?.id || !text) return;

    setSendingReply(conversationId);
    try {
      await elegantAPI.replyToConversation(user.id, conversationId, text);
      setReplyText(prev => ({ ...prev, [conversationId]: "" }));
      await fetchMessages(conversationId);
      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSendingReply(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  };

  const formatMessageDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">
            Send messages to club administrators
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Textarea
                  id="topic"
                  placeholder="Enter your message or question..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={!newTopic.trim() || creating}
              >
                {creating ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start a conversation with the club administrators
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Collapsible
              key={conversation.id}
              open={expandedId === conversation.id}
              onOpenChange={() => handleToggleExpand(conversation.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-medium truncate">
                            {conversation.topic}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(conversation.last_message_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {conversation.participants_count} participants
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {conversation.messages_count} messages
                        </Badge>
                        {expandedId === conversation.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t bg-muted/30 p-4">
                    {loadingMessages === conversation.id ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-16 w-full rounded-lg" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : messages[conversation.id]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No messages yet
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {messages[conversation.id]?.map((message) => {
                          const isOwnMessage = message.sender_customer_id === user?.id || 
                            message._customers?.elegant_user_id === user?.id;
                          const senderName = message._customers?.Full_name || 'Unknown';
                          
                          return (
                            <div 
                              key={message.id} 
                              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                            >
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                              }`}>
                                <User className="h-4 w-4" />
                              </div>
                              <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                                <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                                  <span className="text-xs font-medium">{senderName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatMessageDate(message.created_at)}
                                  </span>
                                </div>
                                <div className={`rounded-lg p-3 ${
                                  isOwnMessage 
                                    ? 'bg-secondary ml-auto' 
                                    : 'bg-card border'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {message.message_text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Reply input */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyText[conversation.id] || ""}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [conversation.id]: e.target.value }))}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleSendReply(conversation.id)}
                        disabled={!replyText[conversation.id]?.trim() || sendingReply === conversation.id}
                        size="icon"
                        className="h-auto"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchConversations(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchConversations(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberInbox;
