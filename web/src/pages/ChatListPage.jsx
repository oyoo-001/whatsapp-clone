import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Search,
  Plus,
  MoreVertical,
  LogOut,
  User,
  Phone,
  PhoneIncoming,
  Video,
  Check,
  CheckCheck,
  Settings,
  Lock,
  WifiOff,
  Users,
  Verified,
  Shield,
  Trash2,
  Archive,
  MessageSquare,
  X,
  Radio,
  Circle,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import useChatStore from "../stores/chatStore";
import useGroupStore from "../stores/groupStore";
import useChannelStore from "../stores/channelStore";
import useStatusStore from "../stores/statusStore";
import socketService from "../services/socket";
import { supportAPI } from "../services/api";
import { playMessageSound } from "../services/notificationSound";
import {
  updateBadge,
  clearBadge,
  showNotification,
  requestNotificationPermission,
} from "../services/notificationUtils";
import NewChatModal from "../components/NewChatModal";
import AddContactModal from "../components/AddContactModal";
import CreateGroupModal from "../components/CreateGroupModal";
import CreateChannelModal from "../components/CreateChannelModal";
import CreateStatusModal from "../components/CreateStatusModal";
import StatusViewer from "../components/StatusViewer";
import { Colors } from "../styles/theme";
import NotificationPopup from "../components/NotificationPopup";

const BASE_TABS = ["All", "Unread"];

const ChatListPage = () => {
  const { logout, user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeStatusGroup, setActiveStatusGroup] = useState(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [notifPopup, setNotifPopup] = useState(null);
  const [pinPrompt, setPinPrompt] = useState(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [ticketUnread, setTicketUnread] = useState(false);
  const typingTimers = useRef({});
  const navigate = useNavigate();

  const getArchivedIds = () => JSON.parse(localStorage.getItem('archivedConversations') || '[]');
  const setArchivedIds = (ids) => localStorage.setItem('archivedConversations', JSON.stringify(ids));
  const isArchived = (userId) => getArchivedIds().includes(userId);
  const toggleArchive = (userId) => {
    const ids = getArchivedIds();
    if (ids.includes(userId)) {
      setArchivedIds(ids.filter(id => id !== userId));
    } else {
      setArchivedIds([...ids, userId]);
    }
  };

  const getArchivedGroupIds = () => JSON.parse(localStorage.getItem('archivedGroups') || '[]');
  const setArchivedGroupIds = (ids) => localStorage.setItem('archivedGroups', JSON.stringify(ids));
  const isGroupArchived = (groupId) => getArchivedGroupIds().includes(String(groupId));
  const toggleGroupArchive = (groupId) => {
    const ids = getArchivedGroupIds();
    const gid = String(groupId);
    if (ids.includes(gid)) {
      setArchivedGroupIds(ids.filter(id => id !== gid));
    } else {
      setArchivedGroupIds([...ids, gid]);
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    fetchConversations();
    fetchGroups();
    useChannelStore.getState().fetchChannels();
    useStatusStore.getState().fetchStatusFeed();
    (async () => {
      try {
        const { data } = await supportAPI.getMyTicket();
        if (data?.ticket) {
          setActiveTicket(data.ticket);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (activeTab === "Support" && !activeTicket) {
      setActiveTab("All");
    }
  }, [activeTicket, activeTab]);

  useEffect(() => {
    const processPending = () =>
      useChatStore.getState().processPendingMessages();
    const unsub = socketService.onReconnect(processPending);
    const goOnline = () => {
      setIsOffline(false);
      processPending();
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsub();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const u1 = socketService.on(
      "chat:message",
      ({ from, message, user: sender }) => {
        const { user: currentUser } = useAuthStore.getState();
        const { updateConversationLastMessage } = useChatStore.getState();

        updateConversationLastMessage(from, message, sender);

        if (from !== currentUser?.id) {
          playMessageSound();
          showNotification(sender?.username || "New Message", {
            body:
              message?.content ||
              (message?.messageType === "image"
                ? "📷 Photo"
                : message?.messageType === "audio"
                  ? "🎤 Voice note"
                  : message?.messageType === "video"
                    ? "📹 Video"
                    : message?.messageType === "file"
                      ? "📎 File"
                      : "Message"),
            icon: "/pwa-icon.svg",
            tag: "new-message",
            silent: true,
          });
          if (from && localStorage.getItem("notifPopups") !== "false") {
            setNotifPopup({
              message,
              user: sender || {
                id: from,
                username: message?.sender?.username || "User",
              },
            });
          }
        }
      },
    );
    const u2 = socketService.on("chat:delivered", () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u3 = socketService.on("chat:read", () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u4 = socketService.on("conversation:update", () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u5 = socketService.on("chat:typing", ({ from, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev, [from]: isTyping };
        return next;
      });
      if (isTyping) {
        if (typingTimers.current[from])
          clearTimeout(typingTimers.current[from]);
        typingTimers.current[from] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [from]: false }));
        }, 3000);
      }
    });
    const u7 = socketService.on("broadcast:new", () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u8 = socketService.on("broadcast:deleted", () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u9 = socketService.on("support:new-message", () => {
      setTicketUnread(true);
      supportAPI.getMyTicket().then(({ data }) => {
        if (data?.ticket) setActiveTicket(data.ticket);
      }).catch(() => {});
    });
    const u10 = socketService.on("admin:support-update", () => {
      supportAPI.getMyTicket().then(({ data }) => {
        if (data?.ticket) setActiveTicket(data.ticket);
      }).catch(() => {});
    });
    const u6 = socketService.on("group:message", ({ groupId, message }) => {
      useGroupStore.getState().receiveMessage(groupId, message);
      const { user: cu } = useAuthStore.getState();
      if (
        String(message.senderId) !== String(cu?.id) &&
        localStorage.getItem("notifPopups") !== "false"
      ) {
        const group = useGroupStore
          .getState()
          .groups.find((g) => String(g.id) === String(groupId));
        setNotifPopup({
          message,
          user: message.sender || {
            id: message.senderId,
            username:
              message.senderName || (group ? `Group: ${group.name}` : "Group"),
          },
        });
      }
    });
    const u11 = socketService.on("user:status", ({ userId, isOnline }) => {
      useChatStore.getState().updateUserStatus(userId, isOnline);
    });
    const u12 = socketService.on("user:updated", ({ userId }) => {
      if (userId) useChatStore.getState().fetchConversations(true);
    });
    const u13 = socketService.on("group:updated", () => {
      useGroupStore.getState().fetchGroups();
    });
    const u14 = socketService.on("group:avatar-updated", () => {
      useGroupStore.getState().fetchGroups();
    });
    const u15 = socketService.on("status:new", () => {
      useStatusStore.getState().fetchStatusFeed();
    });
    const u16 = socketService.on("status:deleted", () => {
      useStatusStore.getState().fetchStatusFeed();
    });
    const u17 = socketService.on("channel:created", () => {
      useChannelStore.getState().fetchChannels();
    });
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
      u9();
      u10();
      u11();
      u12();
      u13();
      u14();
      u15();
      u16();
      u17();
    };
  }, []);

  const { user: currentUser } = useAuthStore();
  const { groups, getSortedGroups, fetchGroups } = useGroupStore();
  const sortedGroups = getSortedGroups();

  const totalUnread = useMemo(() => {
    const convUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0,
    );
    const groupUnread = sortedGroups.reduce((sum, g) => {
      const m = g.participants?.find(
        (p) => String(p.id) === String(currentUser?.id),
      );
      return sum + (m?.GroupMember?.unreadCount || 0);
    }, 0);
    return convUnread + groupUnread;
  }, [conversations, sortedGroups, currentUser]);
  useEffect(() => {
    if (totalUnread > 0) updateBadge(totalUnread);
    else clearBadge();
  }, [totalUnread]);

  const archivedCount = useMemo(() => {
    const convArchived = conversations.filter(c => isArchived(c.user.id)).length;
    const groupArchived = sortedGroups.filter(g => isGroupArchived(g.id)).length;
    return convArchived + groupArchived;
  }, [conversations, sortedGroups]);

  const groupsWithUnread = useMemo(() => {
    return sortedGroups.filter((g) => {
      const m = g.participants?.find((p) => String(p.id) === String(currentUser?.id));
      return (m?.GroupMember?.unreadCount || 0) > 0;
    }).length;
  }, [sortedGroups, currentUser]);

  const tabs = useMemo(() => {
    const t = [...BASE_TABS];
    if (archivedCount > 0) t.push(`Archived (${archivedCount})`);
    if (sortedGroups.length > 0) t.push(groupsWithUnread > 0 ? `Groups (${groupsWithUnread})` : "Groups");
    if (activeTicket) t.push("Support");
    return t;
  }, [activeTicket, archivedCount, sortedGroups.length, groupsWithUnread]);

  const allItems = useMemo(() => {
    const convItems = conversations.map((c) => ({
      ...c,
      _type: "conversation",
    }));
    const groupItems = sortedGroups.map((g) => ({ _type: "group", group: g }));
    return [...convItems, ...groupItems].sort((a, b) => {
      const aTime =
        a._type === "group"
          ? new Date(a.group.updatedAt || a.group.createdAt)
          : new Date(a.lastMessage?.createdAt || a.user.lastSeen || 0);
      const bTime =
        b._type === "group"
          ? new Date(b.group.updatedAt || b.group.createdAt)
          : new Date(b.lastMessage?.createdAt || b.user.lastSeen || 0);
      return bTime - aTime;
    });
  }, [conversations, sortedGroups]);

  const isOnArchivedTab = activeTab.startsWith("Archived");
  const isOnGroupsTab = activeTab.startsWith("Groups");
  const filtered = allItems.filter((item) => {
    if (item._type === "group") {
      const s = item.group.name.toLowerCase().includes(search.toLowerCase());
      const groupArchived = isGroupArchived(item.group.id);
      if (activeTab === "Unread") return false;
      if (isOnGroupsTab) return s && !groupArchived;
      if (isOnArchivedTab) return groupArchived && s;
      if (groupArchived) return false;
      return s;
    }
    const c = item;
    const s = c.user.username.toLowerCase().includes(search.toLowerCase());
    const archived = isArchived(c.user.id);
    if (isOnGroupsTab) return false;
    if (isOnArchivedTab) return archived && s;
    if (activeTab === "Unread") return s && c.unreadCount > 0;
    if (archived) return false;
    return s;
  });

  const getDayStart = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const formatTime = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const today = getDayStart(now);
    const msgDay = getDayStart(date);
    const daysDiff = Math.round((today - msgDay) / 86400000);

    if (daysDiff === 0)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 7) return date.toLocaleDateString([], { weekday: "long" });
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  const formatLastSeen = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    const today = getDayStart(now);
    const msgDay = getDayStart(date);
    const daysDiff = Math.round((today - msgDay) / 86400000);

    if (diff < 60000) return "last seen just now";
    if (daysDiff === 0)
      return `last seen today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (daysDiff === 1)
      return `last seen yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (daysDiff < 7)
      return `last seen ${date.toLocaleDateString([], { weekday: "long" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return `last seen ${date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const openChat = (conv) => {
    const chatPin = localStorage.getItem("chatPin");
    const lockedList = JSON.parse(localStorage.getItem("lockedChats") || "[]");
    if (
      chatPin &&
      lockedList.includes(conv.user.id) &&
      sessionStorage.getItem(`unlocked_${conv.user.id}`) !== "true"
    ) {
      setPinPrompt(conv);
      setPinValue("");
      setPinError("");
      return;
    }
    navigate(`/chat/${conv.user.id}`, { state: { user: conv.user } });
  };

  const handlePinSubmit = () => {
    const stored = localStorage.getItem("chatPin");
    if (pinValue === stored && pinPrompt) {
      sessionStorage.setItem(`unlocked_${pinPrompt.user.id}`, "true");
      const conv = pinPrompt;
      setPinPrompt(null);
      navigate(`/chat/${conv.user.id}`, { state: { user: conv.user } });
    } else {
      setPinError("Wrong PIN");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        background: Colors.white,
        position: "relative",
        boxShadow: "0 0 40px rgba(0,0,0,0.06)",
        borderLeft: `1px solid ${Colors.border}`,
        borderRight: `1px solid ${Colors.border}`,
      }}
    >
      <header
        style={{
          background: Colors.primary,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageCircle size={24} color={Colors.white} />
          <h1
            style={{
              color: Colors.white,
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
            }}
          >
            TuChat
          </h1>
        </div>
         <div style={{ display: "flex", gap: 4 }}>
           {[
             {
               icon: PhoneIncoming,
               label: "Call Logs",
               onClick: () => navigate("/call-logs"),
             },
             {
               icon: User,
               label: "Profile",
               onClick: () => navigate("/profile"),
             },
             {
               icon: Shield,
               label: "Admin",
               onClick: () => {
                 if (user.isAdmin) {
                   navigate("/admin");
                 }
               },
               // Only show if user is admin
               ...(user.isAdmin ? {} : { display: "none" }),
             },
             {
               icon: MoreVertical,
               label: "Menu",
               onClick: () => setShowMenu(!showMenu),
             },
           ].map(({ icon: Icon, label, onClick, ...props }) => {
             // Skip rendering if display is none
             if (props.display === "none") return null;
             return (
               <button
                 key={label}
                 onClick={onClick}
                 style={headerBtn}
                 title={label}
               >
                 <Icon size={20} />
               </button>
             );
           })}
         </div>
      </header>

      {showMenu && (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 16,
            zIndex: 100,
            background: Colors.white,
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            padding: 6,
            minWidth: 180,
            animation: "scaleIn 0.15s ease",
          }}
        >
          {[
            {
              icon: User,
              label: "Profile",
              onClick: () => {
                navigate("/profile");
                setShowMenu(false);
              },
            },
            {
              icon: PhoneIncoming,
              label: "Call Logs",
              onClick: () => {
                navigate("/call-logs");
                setShowMenu(false);
              },
            },
            {
              icon: MessageCircle,
              label: "Contacts",
              onClick: () => {
                navigate("/contacts");
                setShowMenu(false);
              },
            },
            {
              icon: User,
              label: "Add Contact",
              onClick: () => {
                setShowAddContact(true);
                setShowMenu(false);
              },
            },
            {
              icon: Circle,
              label: "Create Status",
              onClick: () => {
                setShowCreateStatus(true);
                setShowMenu(false);
              },
            },
            {
              icon: Radio,
              label: "My Channel",
              onClick: () => {
                setShowMenu(false);
                setShowChannelList(true);
              },
            },
            {
              icon: Settings,
              label: "Settings",
              onClick: () => {
                navigate("/settings");
                setShowMenu(false);
              },
            },
            {
              icon: LogOut,
              label: "Logout",
              onClick: () => {
                setShowMenu(false);
                logout();
              },
              color: Colors.red,
            },
          ].map(({ icon: Icon, label, onClick, color }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 14px",
                background: "none",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                color: color || Colors.textPrimary,
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      )}

      {isOffline && (
        <div
          style={{
            background: "#FFF3E0",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#E65100",
            borderBottom: "1px solid #FFE0B2",
          }}
        >
          <WifiOff size={16} />
          <span>You are offline — messages will be sent when connected</span>
        </div>
      )}

      {/* Status section */}
      {(() => {
        const { statusGroups } = useStatusStore.getState();
        const { user: cu } = useAuthStore.getState();
        const myGroup = statusGroups.find(g => g.user?.id === cu?.id);
        const otherGroups = statusGroups.filter(g => g.user?.id !== cu?.id);
        const displayGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

        if (displayGroups.length === 0) return null;

        return (
          <div style={{
            padding: "8px 16px 4px", background: Colors.white,
            borderBottom: "0.5px solid #F0F2F5",
          }}>
            <div style={{
              display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {displayGroups.map((group) => {
                const hasUnviewed = group.statuses?.length > 0;
                const latest = group.statuses?.[0];
                const gradient = latest?.backgroundColor
                  ? `linear-gradient(135deg, ${latest.backgroundColor}, ${latest.backgroundColor}dd)`
                  : "linear-gradient(135deg, #25D366, #128C7E)";
                return (
                  <div key={group.user?.id || 'unknown'} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    flexShrink: 0, minWidth: 64, position: 'relative',
                  }}>
                    <button onClick={() => {
                      setActiveStatusGroup(group);
                      setStatusIndex(0);
                    }} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%", padding: 3,
                        background: hasUnviewed ? gradient : "#E9EDEF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, position: 'relative',
                      }}>
                        <div style={{
                          width: "100%", height: "100%", borderRadius: "50%",
                          background: group.user?.avatar ? "none" : `hsl(${((group.user?.id || 0) * 40) % 360}, 45%, 45%)`,
                          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 22, border: "2px solid #fff",
                        }}>
                          {group.user?.avatar ? (
                            <img src={group.user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            group.user?.username?.charAt(0).toUpperCase() || "?"
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: Colors.textSecondary, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {group.user?.id === cu?.id ? "My status" : group.user?.username || "Unknown"}
                      </span>
                    </button>
                    {group.user?.id !== cu?.id && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${group.user.id}`, { state: { user: group.user } });
                      }} title="Send message"
                        style={{
                          position: 'absolute', bottom: 18, right: -2,
                          width: 22, height: 22, borderRadius: '50%',
                          background: Colors.secondary, border: '2px solid #fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', padding: 0,
                        }}>
                        <MessageCircle size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ padding: "8px 16px", background: Colors.white }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: Colors.lighterGrey,
            borderRadius: 12,
            padding: "8px 14px",
          }}
        >
          <Search size={18} color={Colors.textHint} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 14,
              color: Colors.textPrimary,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 16px",
          background: Colors.white,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 4px",
              marginRight: 20,
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? `2.5px solid ${Colors.primary}`
                  : "2.5px solid transparent",
              color: activeTab === tab ? Colors.primary : Colors.textSecondary,
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div style={{ padding: "20px 16px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 0",
                  borderBottom: "0.5px solid #F0F2F5",
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: "#F0F2F5",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      width: "40%",
                      height: 12,
                      background: "#F0F2F5",
                      borderRadius: 4,
                      marginBottom: 8,
                      animation: "pulse 1.5s ease infinite",
                    }}
                  />
                  <div
                    style={{
                      width: "70%",
                      height: 10,
                      background: "#F0F2F5",
                      borderRadius: 4,
                      animation: "pulse 1.5s ease infinite",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "Support" && activeTicket ? (
          <div
            key="support-item"
            onClick={() => { setTicketUnread(false); navigate("/support-chat"); }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              cursor: "pointer",
              borderBottom: "0.5px solid #F0F2F5",
              animation: "fadeInUp 0.3s ease 0.03s both",
              background: ticketUnread ? "#F0FFF4" : "transparent",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: Colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <MessageSquare size={22} color={Colors.white} />
              {ticketUnread && (
                <span style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: "#E53935", border: "2px solid white" }} />
              )}
            </div>
            <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: ticketUnread ? 700 : 500, fontSize: 16, color: Colors.textPrimary }}>
                  Support Chat
                </span>
                <span style={{ fontSize: 11, color: Colors.textSecondary, flexShrink: 0 }}>
                  {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 13, color: Colors.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {activeTicket.status === "open" ? "Waiting for admin" : activeTicket.status === "in_progress" ? "Admin is reviewing" : "Ticket resolved"}
                </span>
                {activeTicket.status === "open" && <span style={{ background: Colors.secondary, color: Colors.white, borderRadius: "50%", minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, padding: "0 5px", marginLeft: 8, flexShrink: 0 }}>!</span>}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTicket(null);
              }}
              title="Dismiss support"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: Colors.textHint,
                padding: 4,
                display: "flex",
                marginLeft: 4,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : filtered.length === 0 &&
          conversations.length === 0 &&
          sortedGroups.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: Colors.textSecondary,
            }}
          >
            <MessageCircle
              size={56}
              color="#E9EDEF"
              style={{ marginBottom: 16 }}
            />
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: Colors.textPrimary,
              }}
            >
              No conversations yet
            </p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              Tap + to start a new chat
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: Colors.textSecondary,
            }}
          >
            <Search size={40} color="#E9EDEF" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>No results found</p>
          </div>
        ) : (
          filtered.map((item, i) => {
            if (item._type === "group") {
              const grp = item.group;
              return (
                <div
                  key={`group-${grp.id}`}
                  onClick={() =>
                    navigate(`/group-chat/${grp.id}`, { state: { group: grp } })
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, _type: "group", group: grp });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "0.5px solid #F0F2F5",
                    animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      background: grp.avatar
                        ? "none"
                        : `hsl(${(grp.name.length * 30) % 360}, 40%, 50%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: Colors.white,
                      fontWeight: 700,
                      fontSize: 20,
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {grp.avatar ? (
                      <img
                        src={grp.avatar}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      grp.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 16,
                          color: Colors.textPrimary,
                        }}
                      >
                        {grp.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: Colors.textSecondary,
                          flexShrink: 0,
                        }}
                      >
                        {formatTime(grp.updatedAt || grp.createdAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: Colors.textSecondary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {grp.messages?.[0] ? (
                          `${grp.messages[0].sender?.username || "User"}: ${grp.messages[0].messageType === "text" ? grp.messages[0].content : `📎 ${grp.messages[0].messageType}`}`
                        ) : (
                          <span style={{ color: Colors.textHint }}>
                            No messages yet
                          </span>
                        )}
                      </span>
                      {(() => {
                        const myMembership = grp.participants?.find(
                          (p) => String(p.id) === String(currentUser?.id),
                        );
                        const uc = myMembership?.GroupMember?.unreadCount;
                        return uc > 0 ? (
                          <span style={unreadBadgeStyle}>
                            {uc > 99 ? "99+" : uc}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              );
            }
            const conv = item;
            return (
              <div
                key={`user-${conv.user.id}`}
                onClick={() => openChat(conv)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, conv });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "0.5px solid #F0F2F5",
                  animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: conv.user.avatar
                      ? "none"
                      : `hsl(${(conv.user.id * 40) % 360}, 45%, 45%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: Colors.white,
                    fontWeight: 700,
                    fontSize: 20,
                    position: "relative",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {conv.user.avatar ? (
                    <img
                      src={conv.user.avatar}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    conv.user.username.charAt(0).toUpperCase()
                  )}
                  {conv.user.isOnline && <span style={onlineDotStyle} />}
                </div>
                <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {conv.user.username}
                      {(conv.user.id === 0 || conv.user.isVerified) && (
                        <Verified size={14} color={Colors.accent} style={{ marginLeft: 4, flexShrink: 0 }} />
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: Colors.textSecondary,
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(conv.lastMessage?.createdAt)}
                    </span>
                  </div>
                  {conv.user.id === 0 ? (
                    <div style={{ fontSize: 11, color: Colors.accent, marginTop: 1 }}>
                      TuChat Team, we value you
                    </div>
                  ) : (
                    !conv.user.isOnline &&
                    conv.user.lastSeen &&
                    !typingUsers[conv.user.id] && (
                      <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 1 }}>
                        {formatLastSeen(conv.user.lastSeen)}
                      </div>
                    )
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: Colors.textSecondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {typingUsers[conv.user.id] ? (
                        <span style={{ color: Colors.accent, fontWeight: 500 }}>
                          typing...
                        </span>
                      ) : conv.lastMessage?.messageType === "text" ? (
                        conv.lastMessage.content
                      ) : conv.lastMessage ? (
                        `📎 ${conv.lastMessage.messageType}`
                      ) : (
                      <span style={{ color: conv.user.id === 0 ? Colors.accent : Colors.textHint }}>
                        {conv.user.id === 0 ? "TuChat Team, we value you" : (conv.user.status || "Hey there! I am using TuChat")}
                      </span>
                      )}
                    </span>
                    {conv.unreadCount > 0 ? (
                      <span style={unreadBadgeStyle}>
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    ) : conv.lastMessage?.senderId ===
                      conv.user.id ? null : conv.lastMessage?.isRead ? (
                      <CheckCheck
                        size={14}
                        color={Colors.accent}
                        style={{ marginLeft: 8, flexShrink: 0 }}
                      />
                    ) : conv.lastMessage?.isDelivered ? (
                      <CheckCheck
                        size={14}
                        color={Colors.textHint}
                        style={{ marginLeft: 8, flexShrink: 0 }}
                      />
                    ) : conv.lastMessage ? (
                      <Check
                        size={14}
                        color={Colors.textHint}
                        style={{ marginLeft: 8, flexShrink: 0 }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showFabMenu && (
        <div
          style={{
            position: "absolute",
            bottom: 90,
            right: 20,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            animation: "fadeInUp 0.15s ease",
          }}
        >
          <button
            onClick={() => {
              setShowCreateGroup(true);
              setShowFabMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: Colors.white,
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontSize: 14,
              fontWeight: 500,
              color: Colors.textPrimary,
              animation: "fadeInUp 0.15s ease",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: Colors.primary,
              }}
            >
              <Users size={18} />
            </div>
            New Group
          </button>
          <button
            onClick={() => {
              setShowCreateChannel(true);
              setShowFabMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: Colors.white,
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontSize: 14,
              fontWeight: 500,
              color: Colors.textPrimary,
              animation: "fadeInUp 0.15s ease",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: Colors.primary,
              }}
            >
              <Radio size={18} />
            </div>
            New Channel
          </button>
          <button
            onClick={() => {
              setShowNewChat(true);
              setShowFabMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: Colors.white,
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontSize: 14,
              fontWeight: 500,
              color: Colors.textPrimary,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#E3F2FD",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1565C0",
              }}
            >
              <MessageCircle size={18} />
            </div>
            New Chat
          </button>
          <button
            onClick={() => {
              setShowAddContact(true);
              setShowFabMenu(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: Colors.white,
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontSize: 14,
              fontWeight: 500,
              color: Colors.textPrimary,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#FFF3E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E65100",
              }}
            >
              <User size={18} />
            </div>
            Add Contact
          </button>
        </div>
      )}

      <button onClick={() => setShowFabMenu(!showFabMenu)} style={fabStyle}>
        <Plus
          size={24}
          style={{
            transform: showFabMenu ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} />
      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
      />
      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
      <CreateChannelModal
        open={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
      />
      <CreateStatusModal
        open={showCreateStatus}
        onClose={() => setShowCreateStatus(false)}
      />

      {showChannelList && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowChannelList(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
            maxHeight: '70vh', padding: '20px 24px 30px', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>My Channels</h3>
              <button onClick={() => setShowChannelList(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textHint }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {channels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: Colors.textSecondary, fontSize: 14 }}>
                  No channels yet
                </div>
              ) : (
                channels.map((ch) => (
                  <button key={ch.id} onClick={() => { setShowChannelList(false); navigate(`/channels/${ch.id}`); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                    borderBottom: '1px solid #F0F2F5',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: '#E8F5E9', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {ch.avatar ? (
                        <img src={ch.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Radio size={20} color={Colors.primary} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary }}>{ch.name}</div>
                      <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>
                        {ch.followerCount || 0} follower{(ch.followerCount || 0) !== 1 ? 's' : ''}
                        {ch.isOwner ? ' · Owner' : ''}
                      </div>
                    </div>
                    <Radio size={16} color={Colors.textHint} />
                  </button>
                ))
              )}
            </div>
            <button onClick={() => { setShowChannelList(false); setShowCreateChannel(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              marginTop: 12, padding: '12px 0', borderRadius: 12, border: `2px dashed ${Colors.border}`,
              background: 'none', cursor: 'pointer', color: Colors.primary, fontWeight: 600, fontSize: 14,
            }}>
              <Plus size={18} />
              Create Channel
            </button>
          </div>
        </div>
      )}

      {activeStatusGroup && (
        <StatusViewer
          statusGroup={activeStatusGroup}
          onClose={() => setActiveStatusGroup(null)}
          initialIndex={statusIndex}
        />
      )}

      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: Colors.white,
              borderRadius: 20,
              padding: "32px 28px 24px",
              width: 320,
              animation: "scaleIn 0.2s ease",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#FFF0F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Trash2 size={28} color={Colors.red} />
            </div>
            <h3
              style={{
                fontSize: 18,
                margin: "0 0 4px",
                color: Colors.textPrimary,
                fontWeight: 600,
              }}
            >
              {showDeleteConfirm._type === "group" ? "Delete group?" : "Delete conversation?"}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                margin: "0 0 24px",
                lineHeight: 1.5,
              }}
            >
              {showDeleteConfirm._type === "group" ? (
                <>This will delete the chat with <strong style={{ color: Colors.textPrimary }}>{showDeleteConfirm.group?.name || "this group"}</strong>. This action cannot be undone.</>
              ) : (
                <>This will delete the chat with <strong style={{ color: Colors.textPrimary }}>{showDeleteConfirm.user?.username || "this user"}</strong>. This action cannot be undone.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1px solid #E0E0E0",
                  background: Colors.white,
                  color: Colors.textPrimary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (showDeleteConfirm._type === "group") {
                    await useGroupStore.getState().exitGroup(showDeleteConfirm.group.id);
                    fetchGroups();
                  } else {
                    const { id } = showDeleteConfirm.user;
                    if (id === 0) return;
                    await useChatStore.getState().deleteConversation(id);
                  }
                  setShowDeleteConfirm(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: Colors.red,
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showDeleteConfirm._type === "group" ? "Exit & Delete" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pinPrompt && (
        <div
          onClick={() => setPinPrompt(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: Colors.white,
              borderRadius: 20,
              padding: 28,
              width: 300,
              animation: "scaleIn 0.2s ease",
              textAlign: "center",
            }}
          >
            <Lock
              size={36}
              color={Colors.primary}
              style={{ marginBottom: 12 }}
            />
            <h3
              style={{
                fontSize: 18,
                margin: "0 0 4px",
                color: Colors.textPrimary,
              }}
            >
              Chat Locked
            </h3>
            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                marginBottom: 16,
              }}
            >
              Enter your PIN to open this chat
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="• • • •"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 24,
                letterSpacing: 12,
                textAlign: "center",
                border: pinError ? "2px solid #E53935" : "2px solid #E9EDEF",
                borderRadius: 12,
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            {pinError && (
              <p style={{ fontSize: 12, color: Colors.red, marginTop: 6 }}>
                {pinError}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setPinPrompt(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "#F0F2F5",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: Colors.textPrimary,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: Colors.primary,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: Colors.white,
                }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: Colors.white,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            zIndex: 9999,
            minWidth: 160,
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu._type === "group" ? (
            <>
              <div
                onClick={() => {
                  toggleGroupArchive(contextMenu.group.id);
                  setContextMenu(null);
                }}
                style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: Colors.textPrimary }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Archive size={16} />
                {isGroupArchived(contextMenu.group.id) ? 'Unarchive' : 'Archive'}
              </div>
              <div
                onClick={() => {
                  setShowDeleteConfirm({ _type: "group", group: contextMenu.group });
                  setContextMenu(null);
                }}
                style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#E53935' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={16} />
                Delete
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => {
                  const { id } = contextMenu.conv.user;
                  const archived = isArchived(id);
                  toggleArchive(id);
                  useChatStore.getState().fetchConversations();
                  setContextMenu(null);
                }}
                style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: Colors.textPrimary }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Archive size={16} />
                {isArchived(contextMenu.conv.user.id) ? 'Unarchive' : 'Archive'}
              </div>
              <div
                onClick={() => {
                  setShowDeleteConfirm(contextMenu.conv);
                  setContextMenu(null);
                }}
                style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#E53935' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={16} />
                Delete
              </div>
            </>
          )}
        </div>
      )}
      {notifPopup && (
        <NotificationPopup
          message={notifPopup.message}
          user={notifPopup.user}
          isCall={notifPopup.isCall}
          onDismiss={() => setNotifPopup(null)}
          onClick={() => {
            const targetId = notifPopup.user.id;
            setNotifPopup(null);
            if (notifPopup.isCall) {
              navigate(`/meeting/${notifPopup.groupId}`, {
                state: {
                  name: notifPopup.user.username || "Group",
                  callType: notifPopup.callType,
                },
              });
            } else if (notifPopup.groupId) {
              navigate(`/group-chat/${notifPopup.groupId}`);
            } else {
              navigate(`/chat/${targetId}`, {
                state: { user: notifPopup.user },
              });
            }
          }}
        />
      )}
    </div>
  );
};

const headerBtn = {
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  color: Colors.white,
  padding: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const onlineDotStyle = {
  position: "absolute",
  bottom: 0,
  right: 0,
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: Colors.online,
  border: "2.5px solid white",
};

const unreadBadgeStyle = {
  background: Colors.secondary,
  color: Colors.white,
  borderRadius: "50%",
  minWidth: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 5px",
  marginLeft: 8,
  flexShrink: 0,
};

const fabStyle = {
  position: "absolute",
  bottom: 24,
  right: 20,
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: Colors.secondary,
  border: "none",
  cursor: "pointer",
  color: Colors.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
  zIndex: 10,
};

export default ChatListPage;
