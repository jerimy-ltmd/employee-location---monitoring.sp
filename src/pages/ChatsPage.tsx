import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { Conversation, Message, User } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { formatPhilippineTime } from '../lib/utils';
import {
  Send,
  Search,
  Plus,
  Users,
  User as UserIcon,
  ArrowLeft,
  CheckCheck,
  Check,
  Building2,
  Smile,
} from 'lucide-react';

export const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, onlineUserIds } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetConvoId = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTypingRemote, setIsTypingRemote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Group creation modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
      });
      if (res.ok) {
        const list: Conversation[] = await res.json();
        setConversations(list);

        if (targetConvoId) {
          const found = list.find((c) => String(c.id) === targetConvoId);
          if (found) setActiveConvo(found);
        } else if (!activeConvo && list.length > 0 && window.innerWidth >= 768) {
          setActiveConvo(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convoId: number) => {
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
      });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [targetConvoId]);

  useEffect(() => {
    if (activeConvo) {
      fetchMessages(activeConvo.id);
      if (socket) {
        socket.emit('chat:join', { conversationId: activeConvo.id });
      }
    }
  }, [activeConvo?.id]);

  // Socket event listeners for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (activeConvo && msg.conversation_id === activeConvo.id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
      fetchConversations();
    };

    const handleRemoteTyping = (data: { conversationId: number; userName: string; isTyping: boolean }) => {
      if (activeConvo && data.conversationId === activeConvo.id) {
        setIsTypingRemote(data.isTyping ? data.userName : null);
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:user_typing', handleRemoteTyping);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:user_typing', handleRemoteTyping);
    };
  }, [socket, activeConvo?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvo || !user) return;

    const text = inputText.trim();
    setInputText('');

    if (socket) {
      socket.emit('chat:send', {
        conversationId: activeConvo.id,
        message: text,
      });
      socket.emit('chat:typing', {
        conversationId: activeConvo.id,
        isTyping: false,
      });
    }

    // Direct REST delivery as guaranteed persistence
    try {
      const res = await fetch(`/api/conversations/${activeConvo.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !activeConvo) return;

    socket.emit('chat:typing', {
      conversationId: activeConvo.id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', {
        conversationId: activeConvo.id,
        isTyping: false,
      });
    }, 2000);
  };

  // Group creation
  const handleOpenGroupModal = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
      });
      if (res.ok) {
        const list: User[] = await res.json();
        setAllUsers(list.filter((u) => u.id !== user?.id));
      }
    } catch (err) {}
    setGroupName('');
    setSelectedUserIds([]);
    setShowGroupModal(true);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    try {
      const res = await fetch('/api/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: selectedUserIds,
        }),
      });
      const data = await res.json();
      if (data.conversationId) {
        setShowGroupModal(false);
        await fetchConversations();
        const created = conversations.find((c) => c.id === data.conversationId);
        if (created) setActiveConvo(created);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConvos = conversations.filter((c) => {
    const name = c.displayName || c.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row rounded-xl border border-border bg-card shadow-xs overflow-hidden pb-12 md:pb-0">
      {/* Conversations List (Desktop left column, or Mobile screen when no active convo on phone) */}
      <div
        className={`w-full md:w-80 flex flex-col border-r border-border bg-card shrink-0 ${
          activeConvo ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">Staff Messages</h2>
          <Button
            variant="gold"
            size="sm"
            onClick={handleOpenGroupModal}
            className="h-8 px-2 text-xs font-semibold gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            New Group
          </Button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-muted/30 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredConvos.length > 0 ? (
            filteredConvos.map((c) => {
              const isSelected = activeConvo?.id === c.id;
              const isOtherOnline =
                c.type === 'DIRECT' && c.otherUserId
                  ? onlineUserIds.includes(c.otherUserId)
                  : false;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConvo(c);
                    setSearchParams({ id: String(c.id) });
                  }}
                  className={`flex items-center gap-3 p-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-amber-500/10 dark:bg-amber-400/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-[#091D3C] text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                      {c.type === 'GROUP' ? <Users className="h-4 w-4" /> : (c.displayName || 'U').charAt(0)}
                    </div>
                    {c.type === 'DIRECT' && (
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                          isOtherOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground truncate">
                        {c.displayName || c.name}
                      </p>
                      {c.last_message_time && (
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {formatPhilippineTime(c.last_message_time)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {c.last_message || 'No messages yet'}
                    </p>
                  </div>

                  {c.unread_count && c.unread_count > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shrink-0">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">No conversations found.</p>
          )}
        </div>
      </div>

      {/* Message View (Desktop right column, or Mobile dedicated view) */}
      <div className={`flex-1 flex flex-col bg-background ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
        {activeConvo ? (
          <>
            {/* Chat Room Top Bar */}
            <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => {
                    setActiveConvo(null);
                    setSearchParams({});
                  }}
                  className="md:hidden p-1.5 rounded-md hover:bg-muted text-foreground cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="h-8 w-8 rounded-full bg-[#091D3C] text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                  {activeConvo.type === 'GROUP' ? <Users className="h-4 w-4" /> : (activeConvo.displayName || 'U').charAt(0)}
                </div>

                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground leading-tight">
                    {activeConvo.displayName || activeConvo.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {activeConvo.type === 'GROUP'
                      ? `${activeConvo.members?.length || 'Staff'} participants`
                      : activeConvo.otherUserId && onlineUserIds.includes(activeConvo.otherUserId)
                      ? '🟢 Online'
                      : '⚪ Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Thread Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10">
              {messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    {!isMine && (
                      <span className="text-[10px] text-muted-foreground mb-1 font-semibold ml-1">
                        {msg.sender_name}
                      </span>
                    )}

                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed ${
                        isMine
                          ? 'bg-[#091D3C] text-white dark:bg-amber-400 dark:text-slate-950 rounded-br-xs'
                          : 'bg-card text-foreground border border-border rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-mono">
                      <span>{formatPhilippineTime(msg.created_at)}</span>
                      {isMine && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTypingRemote && (
                <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {isTypingRemote} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
              <Input
                value={inputText}
                onChange={handleTyping}
                placeholder="Type a secure message..."
                className="flex-1 text-xs sm:text-sm h-10"
              />
              <Button type="submit" variant="default" size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-bold text-base text-foreground">Team Communication Channel</h3>
            <p className="text-xs max-w-sm mt-1">
              Select a staff member or group from the left to start a real-time conversation.
            </p>
          </div>
        )}
      </div>

      {/* New Group Dialog */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogHeader>
          <DialogTitle>Create Group Channel</DialogTitle>
          <DialogDescription>
            Assemble department teams or incident response groups for coordinated communication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Group Channel Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Field Engineers Team"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select Members</label>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-muted/20">
              {allUsers.map((u) => {
                const isChecked = selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, u.id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                        }
                      }}
                      className="rounded border-input text-amber-500"
                    />
                    <span className="font-semibold text-foreground">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground">({u.department})</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowGroupModal(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleCreateGroup}>
            Create Channel
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
