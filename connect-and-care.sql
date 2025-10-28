-- Generated SQL for Prasso Site Pages
-- Site ID: 1
-- Generated: 2025-10-28T12:38:42.910Z
-- WARNING: Review before executing in production

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Conversation', 'Sarah Johnson', 'import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Image, Mic, Smile } from "lucide-react";

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const messages = [
    {
      id: 1,
      sender: "them",
      content: "Hey! How are you doing?",
      time: "10:30 AM",
      avatar: "SJ",
    },
    {
      id: 2,
      sender: "me",
      content: "I''m doing great! How about you?",
      time: "10:32 AM",
    },
    {
      id: 3,
      sender: "them",
      content: "Wonderful! Thanks for asking. Are we still on for the meeting tomorrow?",
      time: "10:33 AM",
      avatar: "SJ",
    },
    {
      id: 4,
      sender: "me",
      content: "Yes, absolutely! Looking forward to it.",
      time: "10:35 AM",
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // Handle sending message
      setMessage("");
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 shadow-soft">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-semibold text-primary shrink-0">
            SJ
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">Sarah Johnson</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${msg.sender === "me" ? "flex-row-reverse" : ""}`}>
                {msg.sender === "them" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-medium text-xs text-primary shrink-0">
                    {msg.avatar}
                  </div>
                )}
                <div>
                  <Card
                    className={`p-3 ${
                      msg.sender === "me"
                        ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    <p className={msg.sender === "me" ? "text-primary-foreground" : "text-foreground"}>
                      {msg.content}
                    </p>
                  </Card>
                  <p className={`text-xs text-muted-foreground mt-1 ${msg.sender === "me" ? "text-right" : ""}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 shadow-strong">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Image className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-border/50"
          />
          <Button variant="ghost" size="icon" className="shrink-0">
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            onClick={handleSend}
            size="icon"
            className="shrink-0 bg-gradient-to-br from-primary to-secondary hover:opacity-90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
', 'conversation/:id', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Dashboard', 'Welcome Back', 'import { Card } from "@/components/ui/card";
import { MessageSquare, Users, Calendar, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { icon: MessageSquare, label: "Messages Sent", value: "1,248", trend: "+12%" },
    { icon: Users, label: "Active Groups", value: "24", trend: "+3" },
    { icon: Calendar, label: "Upcoming Birthdays", value: "8", trend: "This week" },
    { icon: TrendingUp, label: "Engagement Rate", value: "94%", trend: "+8%" },
  ];

  const recentActivity = [
    { type: "birthday", name: "Sarah Johnson", detail: "Birthday today!", time: "2 hours ago" },
    { type: "poll", name: "Sunday Service Poll", detail: "15 new responses", time: "3 hours ago" },
    { type: "message", name: "Youth Group", detail: "New message from David", time: "5 hours ago" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-muted-foreground mt-1">Here''s what''s happening today</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="p-4 hover:shadow-medium transition-all duration-300 border-border/50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs font-medium text-secondary">{stat.trend}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 shadow-medium">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{activity.name}</p>
                <p className="text-sm text-muted-foreground">{activity.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
', 'dashboard', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Groups', 'Groups', 'import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, MoreVertical } from "lucide-react";

const Groups = () => {
  const groups = [
    {
      id: 1,
      name: "Youth Group",
      members: 45,
      avatar: "YG",
      description: "Ages 13-18 community",
      unread: 3,
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      id: 2,
      name: "Worship Team",
      members: 12,
      avatar: "WT",
      description: "Sunday service musicians",
      unread: 0,
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      id: 3,
      name: "Prayer Warriors",
      members: 28,
      avatar: "PW",
      description: "Daily prayer support",
      unread: 7,
      color: "from-orange-500/20 to-red-500/20",
    },
    {
      id: 4,
      name: "Small Group Leaders",
      members: 15,
      avatar: "SL",
      description: "Leadership community",
      unread: 0,
      color: "from-green-500/20 to-emerald-500/20",
    },
    {
      id: 5,
      name: "Volunteer Team",
      members: 34,
      avatar: "VT",
      description: "Service coordinators",
      unread: 2,
      color: "from-yellow-500/20 to-orange-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your communities</p>
        </div>
        <Button
          size="icon"
          className="rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-medium"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card
            key={group.id}
            className="p-5 hover:shadow-medium transition-all duration-300 cursor-pointer border-border/50"
          >
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${group.color} flex items-center justify-center font-bold text-lg text-primary shrink-0`}>
                {group.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate mb-1">
                      {group.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 -mt-2">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    {group.members} members
                  </Badge>
                  {group.unread > 0 && (
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                      {group.unread} new
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Groups;
', 'groups', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Inbox', 'Inbox', 'import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, CheckSquare, Users, Bell } from "lucide-react";

const Inbox = () => {
  const notifications = [
    {
      type: "birthday",
      icon: Calendar,
      title: "Upcoming Birthdays",
      count: 8,
      items: [
        { name: "Sarah Johnson", date: "Today", avatar: "SJ" },
        { name: "Michael Chen", date: "Tomorrow", avatar: "MC" },
        { name: "Emma Davis", date: "Dec 17", avatar: "ED" },
      ],
    },
    {
      type: "poll",
      icon: CheckSquare,
      title: "Active Polls",
      count: 3,
      items: [
        { name: "Sunday Service Feedback", responses: "45 responses", avatar: "📊" },
        { name: "Christmas Event Planning", responses: "32 responses", avatar: "🎄" },
      ],
    },
    {
      type: "email",
      icon: Mail,
      title: "New Emails",
      count: 12,
      items: [
        { name: "Weekly Newsletter Draft", time: "1 hour ago", avatar: "📧" },
        { name: "Prayer Request Follow-up", time: "3 hours ago", avatar: "🙏" },
      ],
    },
    {
      type: "group",
      icon: Users,
      title: "Group Updates",
      count: 5,
      items: [
        { name: "Youth Group - New member joined", time: "2 hours ago", avatar: "YG" },
        { name: "Worship Team - Schedule updated", time: "4 hours ago", avatar: "WT" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">Stay updated with your notifications</p>
        </div>
        <div className="p-3 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10">
          <Bell className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((section, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-medium transition-all duration-300">
            <div className="p-4 bg-gradient-to-r from-accent to-transparent border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-semibold text-foreground">{section.title}</h2>
                </div>
                <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                  {section.count}
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-medium text-sm text-primary">
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {"date" in item && item.date}
                      {"responses" in item && item.responses}
                      {"time" in item && item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Inbox;
', 'inbox', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Index', 'Welcome to Your Blank App', '// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
', 'index', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 0, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Messages', 'Messages', 'import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Messages = () => {
  const conversations = [
    {
      id: 1,
      name: "Sarah Johnson",
      avatar: "SJ",
      lastMessage: "Thanks for the birthday wishes!",
      time: "2m ago",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "Youth Group",
      avatar: "YG",
      lastMessage: "David: See you all on Sunday!",
      time: "15m ago",
      unread: 0,
      online: false,
      isGroup: true,
    },
    {
      id: 3,
      name: "Michael Chen",
      avatar: "MC",
      lastMessage: "That sounds great, let me check",
      time: "1h ago",
      unread: 0,
      online: true,
    },
    {
      id: 4,
      name: "Worship Team",
      avatar: "WT",
      lastMessage: "Practice schedule updated",
      time: "3h ago",
      unread: 5,
      online: false,
      isGroup: true,
    },
    {
      id: 5,
      name: "Emma Davis",
      avatar: "ED",
      lastMessage: "Looking forward to the event!",
      time: "1d ago",
      unread: 0,
      online: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Connect with your community</p>
        </div>
        <Button
          size="icon"
          className="rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-medium"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-10 bg-card border-border/50"
        />
      </div>

      <div className="space-y-2">
        {conversations.map((conversation) => (
          <Link key={conversation.id} to={`/conversation/${conversation.id}`}>
            <Card className="p-4 hover:shadow-medium transition-all duration-300 cursor-pointer border-border/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                    conversation.isGroup 
                      ? "from-secondary/20 to-primary/20" 
                      : "from-primary/20 to-secondary/20"
                  } flex items-center justify-center font-semibold text-primary`}>
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground truncate">
                      {conversation.name}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {conversation.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unread > 0 && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {conversation.unread}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Messages;
', 'messages', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (20, 'Not Found', '404', 'import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
', '*', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 0, 0, '', 0, -1, 1, NULL, 1);

-- Total pages: 7