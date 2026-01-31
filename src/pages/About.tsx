import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Target, History, Mail, Award } from "lucide-react";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

const About = () => {
  // Trigger workflow on page view for About page (static page with fixed slug)
  usePageViewTrigger('about', 'page', { title: 'About Us' }, true);

  const boardMembers = [
    {
      name: "John Anderson",
      position: "President",
      bio: "Leading the club with over 20 years of experience in mineralogy and geology",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
      initials: "JA"
    },
    {
      name: "Sarah Mitchell",
      position: "Vice President",
      bio: "Expert in gem identification and lapidary arts with 15 years of experience",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
      initials: "SM"
    },
    {
      name: "Michael Chen",
      position: "Treasurer",
      bio: "Managing club finances and ensuring sustainable growth for our community",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      initials: "MC"
    },
    {
      name: "Emily Rodriguez",
      position: "Secretary",
      bio: "Keeping our records and communications organized for all members",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      initials: "ER"
    },
    {
      name: "David Thompson",
      position: "Field Trip Coordinator",
      bio: "Planning exciting mineral collecting adventures and educational field trips",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      initials: "DT"
    },
    {
      name: "Lisa Park",
      position: "Education Director",
      bio: "Developing workshops and classes to inspire the next generation of rockhounds",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200",
      initials: "LP"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Us - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Learn about our mission, history, and board members dedicated to promoting earth sciences education in Tampa Bay since 1958." />
        <link rel="canonical" href={`${window.location.origin}/about`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="About Us - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Learn about our mission, history, and board members dedicated to promoting earth sciences education in Tampa Bay since 1958." />
        <meta property="og:url" content={`${window.location.origin}/about`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Us - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Learn about our mission, history, and board members dedicated to promoting earth sciences education in Tampa Bay since 1958." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">About Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Tampa Bay Minerals & Science Club
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fostering a passion for earth sciences, mineral collecting, and lapidary arts in the Tampa Bay community since 1958
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Target className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold text-foreground">Our Mission</h2>
            </div>
            <Card className="border-2">
              <CardContent className="p-8">
                <p className="text-lg text-foreground leading-relaxed mb-6">
                  The Tampa Bay Minerals & Science Club is dedicated to promoting the study, collection, and appreciation of minerals, fossils, and gemstones. We strive to educate our members and the public about earth sciences through hands-on learning, field trips, and workshops.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-primary/5 rounded-lg">
                    <Award className="h-10 w-10 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2 text-foreground">Education</h3>
                    <p className="text-sm text-muted-foreground">Providing learning opportunities for all ages and skill levels</p>
                  </div>
                  <div className="text-center p-6 bg-primary/5 rounded-lg">
                    <Users className="h-10 w-10 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2 text-foreground">Community</h3>
                    <p className="text-sm text-muted-foreground">Building connections among mineral enthusiasts and collectors</p>
                  </div>
                  <div className="text-center p-6 bg-primary/5 rounded-lg">
                    <History className="h-10 w-10 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2 text-foreground">Preservation</h3>
                    <p className="text-sm text-muted-foreground">Protecting and sharing geological heritage for future generations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <History className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold text-foreground">Our History</h2>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary">1958</Badge>
                    The Beginning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Founded by a small group of passionate rockhounds in Tampa Bay, the club started with just 12 members meeting monthly to share their mineral collections and field trip stories. What began in a small community center has grown into one of the region's most active earth science organizations.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary">1970s-1980s</Badge>
                    Growth & Expansion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    During these decades, the club expanded its activities to include lapidary workshops, annual gem and mineral shows, and educational programs in local schools. Membership grew to over 200 active members, establishing the club as a cornerstone of the Tampa Bay rockhounding community.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary">1990s-2000s</Badge>
                    Modernization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    The club established its first permanent workshop facility, complete with lapidary equipment, a library, and meeting spaces. Regular field trips to Florida's fossil beds, Georgia's quartz deposits, and North Carolina's gem mines became club traditions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary">Present Day</Badge>
                    Continuing the Legacy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Today, the Tampa Bay Minerals & Science Club continues to thrive with over 300 members of all ages. We host monthly meetings, organize field trips, offer hands-on workshops, and maintain an active online community. Our annual show attracts thousands of visitors and features dealers, exhibits, and demonstrations from across the country.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Board of Directors Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold text-foreground">Board of Directors</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl">
              Our dedicated board members bring decades of combined experience in mineralogy, geology, and lapidary arts. They volunteer their time and expertise to guide the club and serve our community.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boardMembers.map((member, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={member.image} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {member.name}
                        </h3>
                        <Badge variant="secondary" className="mb-3">
                          {member.position}
                        </Badge>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {member.bio}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2">
              <CardContent className="p-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-3xl font-bold mb-4 text-foreground">
                  Get Involved
                </h3>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Interested in joining our club or learning more about our activities? We welcome rockhounds of all experience levels, from beginners to seasoned collectors.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="#membership"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Become a Member
                  </a>
                  <a 
                    href="#newsletter"
                    className="inline-flex items-center justify-center px-6 py-3 bg-card border-2 border-border text-foreground rounded-md hover:bg-accent transition-colors font-semibold"
                  >
                    Subscribe to Newsletter
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
