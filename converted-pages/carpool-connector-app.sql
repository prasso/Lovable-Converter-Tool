-- Generated SQL for Prasso Site Pages
-- Site ID: 15
-- Generated: 2025-11-08T12:36:47.818Z
-- WARNING: Review before executing in production

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'Find Ride', 'Search Carpools', 'import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function FindRide() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || !date) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success(`Searching rides from ${from} to ${to} on ${date}`);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header title="Find a Ride" />
      
      <main className="pt-20 px-4 max-w-screen-xl mx-auto">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl shadow-medium p-6 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Search Carpools</h2>
                <p className="text-sm text-muted-foreground">Find your perfect ride</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="from" className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Pickup Location
                </Label>
                <Input
                  id="from"
                  placeholder="Enter starting point"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to" className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-accent" />
                  Destination
                </Label>
                <Input
                  id="to"
                  placeholder="Enter destination"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Rides
              </Button>
            </form>
          </div>

          <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              Find eco-friendly carpools near you
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
', '', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'Index', 'Welcome to Your Blank App', '// Update this page (the content is just a fallback if you fail to update the page)

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
VALUES (15, 'Messages', 'mockMessages', 'import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";

const mockMessages = [
  {
    id: 1,
    name: "Sarah Johnson",
    message: "Thanks for accepting my ride request!",
    time: "2h ago",
    unread: true,
  },
  {
    id: 2,
    name: "Mike Chen",
    message: "What time should I be ready?",
    time: "5h ago",
    unread: false,
  },
];

export default function Messages() {
  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header title="Messages" />
      
      <main className="pt-20 px-4 max-w-screen-xl mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mt-6 space-y-3">
            {mockMessages.map((msg) => (
              <Card 
                key={msg.id} 
                className={`p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer ${
                  msg.unread ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {msg.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {msg.name}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {msg.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {msg.message}
                    </p>
                  </div>
                </div>
              </Card>
            ))}

            {mockMessages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
', 'messages', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'My Rides', 'Upcoming Rides', 'import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

const mockRides = [
  {
    id: 1,
    from: "San Francisco",
    to: "Los Angeles",
    date: "2025-10-20",
    time: "8:00 AM",
    seats: 2,
    type: "upcoming",
  },
  {
    id: 2,
    from: "Oakland",
    to: "Sacramento",
    date: "2025-10-18",
    time: "6:30 PM",
    seats: 3,
    type: "upcoming",
  },
];

export default function MyRides() {
  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header title="My Rides" />
      
      <main className="pt-20 px-4 max-w-screen-xl mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground px-2">Upcoming Rides</h2>
            
            {mockRides.map((ride) => (
              <Card key={ride.id} className="p-4 shadow-soft hover:shadow-medium transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">{ride.from}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-medium text-foreground">{ride.to}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{ride.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{ride.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{ride.seats} seats</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-3 py-1 bg-primary/10 rounded-full">
                    <span className="text-xs font-medium text-primary">Active</span>
                  </div>
                </div>
              </Card>
            ))}

            {mockRides.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No rides yet</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
', 'my-rides', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'Not Found', '404', 'import { useLocation } from "react-router-dom";
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

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'Offer Ride', 'Create Carpool', 'import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function OfferRide() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || !date || !seats) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Carpool posted successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header title="Offer a Ride" />
      
      <main className="pt-20 px-4 max-w-screen-xl mx-auto">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl shadow-medium p-6 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-accent rounded-full">
                <PlusCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Create Carpool</h2>
                <p className="text-sm text-muted-foreground">Share your ride</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="from" className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Starting Point
                </Label>
                <Input
                  id="from"
                  placeholder="Enter starting location"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border-border focus:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to" className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-accent" />
                  Destination
                </Label>
                <Input
                  id="to"
                  placeholder="Enter destination"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border-border focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border-border focus:ring-accent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seats" className="flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    Seats
                  </Label>
                  <Input
                    id="seats"
                    type="number"
                    placeholder="1-4"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    className="border-border focus:ring-accent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2 text-foreground">
                  <DollarSign className="h-4 w-4 text-accent" />
                  Price per Seat (optional)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="border-border focus:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-border focus:ring-accent min-h-20"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-accent hover:shadow-glow transition-all"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Post Carpool
              </Button>
            </form>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
', 'offer', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

INSERT INTO site_pages (fk_site_id, section, title, description, url, headers, masterpage, template, style, login_required, user_level, where_value, page_notifications_on, menu_id, type, external_url, is_published)
VALUES (15, 'Profile', 'handleSave', 'import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, Car, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [phone, setPhone] = useState("+1 555-0123");
  const [vehicle, setVehicle] = useState("Toyota Camry");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header title="Profile" />
      
      <main className="pt-20 px-4 max-w-screen-xl mx-auto">
        <div className="max-w-md mx-auto">
          <Card className="p-6 shadow-medium mt-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-3">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 mt-2">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-sm font-semibold text-foreground">4.8</span>
                <span className="text-sm text-muted-foreground">(24 rides)</span>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle" className="flex items-center gap-2 text-foreground">
                  <Car className="h-4 w-4 text-primary" />
                  Vehicle
                </Label>
                <Input
                  id="vehicle"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="border-border focus:ring-primary"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              >
                Save Changes
              </Button>
            </form>
          </Card>

          <div className="mt-4 p-4 bg-card/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground text-center">
              Keep your profile updated for better carpool matches
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
', 'profile', '', 'sitepage.templates.blankpage', 'sitepage.templates.blankpage', '', 1, 0, '', 0, -1, 1, NULL, 1);

-- Total pages: 7