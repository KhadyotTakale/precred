import React, { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { adminAPI, type Note, type CreateNoteRequest } from '@/lib/admin-api';
import { MessageSquare, ChevronDown, ChevronUp, Plus, Send, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export types for external use
export type { Note, CreateNoteRequest };

interface NotesPanelProps {
  /** Booking ID for application notes */
  bookingsId?: number;
  /** Lead ID for lead-related notes */
  leadsId?: number;
  /** Whether the panel is expanded by default */
  defaultExpanded?: boolean;
  /** Maximum height for the notes scroll area */
  maxHeight?: string;
  /** Callback when notes count changes */
  onNotesCountChange?: (count: number) => void;
  /** Custom class name */
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Initial notes count from API response (avoids extra API call) */
  initialNotesCount?: number;
  /** Initial unread count from API response */
  initialUnreadCount?: number;
}

/**
 * Generic Notes Panel component for adding and viewing notes.
 * Supports lazy loading - notes are only fetched when panel is expanded.
 * 
 * Usage:
 * - For Applications: <NotesPanel bookingsId={application.id} />
 * - For Leads: <NotesPanel leadsId={lead.id} />
 */
export const NotesPanel: React.FC<NotesPanelProps> = ({
  bookingsId,
  leadsId,
  defaultExpanded = false,
  maxHeight = '300px',
  onNotesCountChange,
  className,
  compact = false,
  initialNotesCount,
  initialUnreadCount,
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  // Use initial counts if provided, otherwise default to 0
  const [totalNotes, setTotalNotes] = useState(initialNotesCount ?? 0);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);

  // Fetch notes from API
  const fetchNotes = useCallback(async () => {
    if (!user?.id || (!bookingsId && !leadsId)) return;
    
    setIsLoading(true);
    try {
      const response = await adminAPI.getNotes(user.id, {
        customers_id: null,
        leads_id: leadsId || null,
        bookings_id: bookingsId || null,
        search: null,
        external: {
          page: 1,
          perPage: 5,
        },
      });
      
      setNotes(response.items || []);
      setTotalNotes(response.itemsTotal || 0);
      setHasLoaded(true);
      
      if (onNotesCountChange) {
        onNotesCountChange(response.itemsTotal || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, bookingsId, leadsId, onNotesCountChange, toast]);

  // Handle expand/collapse - lazy load on first expand
  const handleExpandChange = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasLoaded) {
      fetchNotes();
    }
  }, [hasLoaded, fetchNotes]);

  // Add new note
  const handleAddNote = async () => {
    if (!user?.id || !newNote.trim()) return;
    
    setIsAdding(true);
    try {
      const noteData: CreateNoteRequest = {
        assigned_customers_id: null, // null for all admin
        status: 'New',
        description: newNote.trim(),
        leads_id: leadsId || null,
        is_read: false,
        leads_communication_id: null,
        bookings_id: bookingsId || null,
      };
      
      await adminAPI.createNote(noteData, user.id);
      
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
      
      setNewNote('');
      setShowAddForm(false);
      
      // Refresh notes list
      await fetchNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'read':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'archived':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  function renderNotesContent() {
    return (
      <div className="p-3 space-y-3">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Notes {totalNotes > 0 && `(${totalNotes})`}
          </span>
          <div className="flex items-center gap-1">
            {hasLoaded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchNotes}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add note form */}
        {showAddForm && (
          <div className="space-y-2 p-2 bg-muted/50 rounded-md">
            <Textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              disabled={isAdding}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNote('');
                }}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={isAdding || !newNote.trim()}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-1">Add</span>
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {isLoading && !hasLoaded ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No notes yet
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-2">
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-2 rounded-md border bg-background text-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getStatusColor(note.status))}
                    >
                      {note.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-foreground">
                    {note.description}
                  </p>
                  {note._created_by && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      By: {note._created_by.Full_name || note._created_by.email}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <Collapsible 
        open={isExpanded} 
        onOpenChange={handleExpandChange}
        className={cn("w-full", className)}
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
            {totalNotes > 0 && (
              <Badge 
                variant={unreadCount > 0 ? "default" : "secondary"} 
                className={cn(
                  "ml-1 h-5 px-1.5 text-xs",
                  unreadCount > 0 && "bg-primary text-primary-foreground"
                )}
              >
                {unreadCount > 0 ? `${unreadCount}/${totalNotes}` : totalNotes}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 border rounded-lg bg-card">
          {renderNotesContent()}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible 
      open={isExpanded} 
      onOpenChange={handleExpandChange}
      className={cn("border rounded-lg", className)}
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium">Notes</span>
            {totalNotes > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {totalNotes}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        {renderNotesContent()}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ========== New Components for Table Row Expansion ==========

interface NotesButtonProps {
  totalNotes: number;
  unreadCount: number;
  isExpanded: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Button component for triggering notes expansion in a table row.
 * Use with NotesExpandedRow for full-width row expansion pattern.
 */
export const NotesButton: React.FC<NotesButtonProps> = ({
  totalNotes,
  unreadCount,
  isExpanded,
  onClick,
  className,
}) => {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={cn("h-8 gap-1", className)}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4" />
      <span className="hidden sm:inline">Notes</span>
      {totalNotes > 0 && (
        <Badge 
          variant={unreadCount > 0 ? "default" : "secondary"} 
          className={cn(
            "ml-1 h-5 px-1.5 text-xs",
            unreadCount > 0 && "bg-primary text-primary-foreground"
          )}
        >
          {unreadCount > 0 ? `${unreadCount}/${totalNotes}` : totalNotes}
        </Badge>
      )}
      {isExpanded ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )}
    </Button>
  );
};

interface NotesExpandedRowProps {
  /** Booking ID for application notes */
  bookingsId: number;
  /** Number of columns to span */
  colSpan: number;
  /** Called when notes are updated */
  onNotesUpdate?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Expanded row component for displaying notes in a table.
 * Renders a full-width table row with notes content.
 */
export const NotesExpandedRow: React.FC<NotesExpandedRowProps> = ({
  bookingsId,
  colSpan,
  onNotesUpdate,
  className,
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [totalNotes, setTotalNotes] = useState(0);

  // Mark notes as read
  const markNotesAsRead = useCallback(async (notesToMark: Note[]) => {
    if (!user?.id) return;
    
    const unreadNotes = notesToMark.filter(note => !note.is_read);
    if (unreadNotes.length === 0) return;
    
    // Mark each unread note as read (fire and forget, don't block UI)
    Promise.all(
      unreadNotes.map(note => 
        adminAPI.updateNote(note.id, { is_read: true }, user.id).catch(err => {
          console.error(`Failed to mark note ${note.id} as read:`, err);
        })
      )
    ).then(() => {
      // Update local state to reflect read status
      setNotes(prev => prev.map(note => ({ ...note, is_read: true })));
      onNotesUpdate?.();
    });
  }, [user?.id, onNotesUpdate]);

  // Fetch notes on mount
  const fetchNotes = useCallback(async () => {
    if (!user?.id || !bookingsId) return;
    
    setIsLoading(true);
    try {
      const response = await adminAPI.getNotes(user.id, {
        customers_id: null,
        leads_id: null,
        bookings_id: bookingsId,
        search: null,
        external: {
          page: 1,
          perPage: 5,
        },
      });
      
      const fetchedNotes = response.items || [];
      setNotes(fetchedNotes);
      setTotalNotes(response.itemsTotal || 0);
      
      // Mark unread notes as read after displaying
      if (fetchedNotes.length > 0) {
        markNotesAsRead(fetchedNotes);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, bookingsId, toast, markNotesAsRead]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Add new note
  const handleAddNote = async () => {
    if (!user?.id || !newNote.trim()) return;
    
    setIsAdding(true);
    try {
      const noteData: CreateNoteRequest = {
        assigned_customers_id: null,
        status: 'New',
        description: newNote.trim(),
        leads_id: null,
        is_read: false,
        leads_communication_id: null,
        bookings_id: bookingsId,
      };
      
      await adminAPI.createNote(noteData, user.id);
      
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
      
      setNewNote('');
      setShowAddForm(false);
      await fetchNotes();
      onNotesUpdate?.();
    } catch (error) {
      console.error('Failed to add note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'read':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'archived':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <tr className={cn("bg-muted/30", className)}>
      <td colSpan={colSpan} className="p-0">
        <div className="p-4 border-t border-b bg-card/50">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes {totalNotes > 0 && `(${totalNotes})`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchNotes}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add note form */}
          {showAddForm && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-md mb-3">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                disabled={isAdding}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewNote('');
                  }}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isAdding || !newNote.trim()}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-1">Add</span>
                </Button>
              </div>
            </div>
          )}

          {/* Notes list - horizontal layout */}
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-64 flex-shrink-0" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No notes yet. Click the + button to add one.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 rounded-md border bg-background text-sm min-w-[250px] max-w-[300px] flex-shrink-0 relative transition-colors",
                    !note.is_read && "border-primary/50 bg-primary/5"
                  )}
                >
                  {/* Unread indicator dot */}
                  {!note.is_read && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-2 pr-4">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getStatusColor(note.status))}
                    >
                      {note.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-foreground line-clamp-3">
                    {note.description}
                  </p>
                  {note._created_by && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      By: {note._created_by.Full_name || note._created_by.email}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default NotesPanel;
