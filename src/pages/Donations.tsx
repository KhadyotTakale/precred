import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Heart, Target, Users, TrendingUp } from "lucide-react";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Link } from "react-router-dom";

const Donations = () => {
  const [campaigns, setCampaigns] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const response = await elegantAPI.getPublicItems(1, 50, 'Donation');
        // Filter out disabled campaigns
        const activeCampaigns = response.items.filter(item => !item.Is_disabled);
        setCampaigns(activeCampaigns);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const getProgressPercentage = (campaign: PublicItem) => {
    const goalAmount = campaign.item_info?.goal_amount || 0;
    const goalAchieved = campaign.item_info?.goal_achieved || 0;
    return goalAmount > 0 ? Math.min((goalAchieved / goalAmount) * 100, 100) : 0;
  };

  const getCampaignImage = (campaign: PublicItem) => {
    const images = (campaign as any)._item_images_of_items?.items;
    if (images && images.length > 0) {
      return images[0].display_image;
    }
    return null;
  };

  const totalRaised = campaigns.reduce((sum, c) => sum + (c.item_info?.goal_achieved || 0), 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + (c.item_info?.goal_amount || 0), 0);
  const activeCampaignsCount = campaigns.length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Support Our Campaigns - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Support our fundraising campaigns and help us continue our mission of promoting earth sciences education in the Tampa Bay community." />
        <link rel="canonical" href={`${window.location.origin}/donation`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Support Our Campaigns - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Support our fundraising campaigns and help us continue our mission of promoting earth sciences education." />
        <meta property="og:url" content={`${window.location.origin}/donation`} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Support Our Campaigns - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Support our fundraising campaigns and help us continue our mission." />
      </Helmet>
      
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 mt-24 mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Donate</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <section className="relative py-12 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Support Our Mission</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Fundraising Campaigns
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your generous donations help us continue our mission of promoting earth sciences education, 
              organizing community events, and supporting aspiring geologists and collectors.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-foreground">
                    {activeCampaignsCount}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-foreground">
                    ${totalRaised.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Total Raised</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span className="text-2xl font-bold text-foreground">
                    ${totalGoal.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Combined Goal</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Campaigns Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="max-w-2xl mx-auto text-center py-16">
              <CardContent>
                <Heart className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-4 text-foreground">No Active Campaigns</h3>
                <p className="text-muted-foreground mb-6">
                  There are no active fundraising campaigns at the moment. 
                  Check back soon for new opportunities to support our mission!
                </p>
                <Button asChild variant="outline">
                  <Link to="/">Return Home</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign) => {
                const progress = getProgressPercentage(campaign);
                const goalAmount = campaign.item_info?.goal_amount || 0;
                const goalAchieved = campaign.item_info?.goal_achieved || 0;
                const campaignImage = getCampaignImage(campaign);
                const isGoalReached = progress >= 100;

                return (
                  <Card key={campaign.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                    {/* Campaign Image */}
                    {campaignImage ? (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={campaignImage}
                          alt={campaign.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        {isGoalReached && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 text-white">Goal Reached!</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                        <Heart className="h-16 w-16 text-primary/40" />
                        {isGoalReached && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 text-white">Goal Reached!</Badge>
                          </div>
                        )}
                      </div>
                    )}

                    <CardHeader className="flex-grow">
                      <CardTitle className="text-xl line-clamp-2">{campaign.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {campaign.description || 'Support this campaign and help us reach our goal.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-foreground">
                            ${goalAchieved.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {progress.toFixed(0)}% of ${goalAmount.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <p className="text-xs text-muted-foreground">
                          ${(goalAmount - goalAchieved).toLocaleString()} remaining to reach goal
                        </p>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button className="w-full" size="lg" asChild>
                        <Link to={`/donation/${campaign.slug}`}>
                          <Heart className="h-4 w-4 mr-2" />
                          Donate Now
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How Your Donation Helps */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">How Your Donation Helps</h2>
            <p className="text-muted-foreground">
              Every contribution makes a difference in our community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Educational Programs</h3>
              <p className="text-sm text-muted-foreground">
                Fund workshops, classes, and educational materials for members of all ages
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Community Events</h3>
              <p className="text-sm text-muted-foreground">
                Support gem shows, field trips, and community gatherings throughout the year
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Equipment & Facilities</h3>
              <p className="text-sm text-muted-foreground">
                Maintain and upgrade lapidary equipment, library resources, and meeting spaces
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Donations;