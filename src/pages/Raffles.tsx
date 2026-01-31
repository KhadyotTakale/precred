import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Ticket, Clock, Gift, Users } from "lucide-react";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Link } from "react-router-dom";
import { format, differenceInDays, isPast } from "date-fns";

const Raffles = () => {
  const [raffles, setRaffles] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaffles = async () => {
      setLoading(true);
      try {
        const response = await elegantAPI.getPublicItems(1, 50, 'Raffle');
        // Filter out disabled raffles
        const activeRaffles = response.items.filter(item => !item.Is_disabled);
        setRaffles(activeRaffles);
      } catch (error) {
        console.error('Failed to fetch raffles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRaffles();
  }, []);

  const getRaffleImage = (raffle: PublicItem) => {
    const images = (raffle as any)._item_images_of_items?.items;
    if (images && images.length > 0) {
      return images[0].display_image;
    }
    return null;
  };

  const getTimeRemaining = (endDateStr: string | undefined) => {
    if (!endDateStr) return null;
    const endDate = new Date(endDateStr);
    if (isPast(endDate)) return { text: 'Ended', isEnded: true };
    
    const days = differenceInDays(endDate, new Date());
    if (days > 1) return { text: `${days} days left`, isEnded: false };
    if (days === 1) return { text: '1 day left', isEnded: false };
    return { text: 'Ends today!', isEnded: false };
  };

  const activeRaffles = raffles.filter(r => {
    const endDate = r.item_info?.['end-date'];
    return !endDate || !isPast(new Date(endDate));
  });

  const endedRaffles = raffles.filter(r => {
    const endDate = r.item_info?.['end-date'];
    return endDate && isPast(new Date(endDate));
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Raffles & Giveaways - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Enter our exciting raffles and giveaways for a chance to win amazing prizes. Support the Tampa Bay Minerals & Science Club." />
        <link rel="canonical" href={`${window.location.origin}/raffles`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Raffles & Giveaways - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Enter our exciting raffles for a chance to win amazing prizes." />
        <meta property="og:url" content={`${window.location.origin}/raffles`} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Raffles & Giveaways - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Enter our exciting raffles for a chance to win amazing prizes." />
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
              <BreadcrumbPage>Raffles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <section className="relative py-12 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Ticket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Win Amazing Prizes</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Raffles & Giveaways
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter our exciting raffles for a chance to win amazing prizes while supporting 
              our mission of promoting earth sciences education in the Tampa Bay community.
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
                  <Ticket className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-foreground">
                    {activeRaffles.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Active Raffles</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-foreground">
                    {raffles.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Total Raffles</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span className="text-2xl font-bold text-foreground">
                    {endedRaffles.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Active Raffles Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-foreground">Active Raffles</h2>
          
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
          ) : activeRaffles.length === 0 ? (
            <Card className="max-w-2xl mx-auto text-center py-16">
              <CardContent>
                <Ticket className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-4 text-foreground">No Active Raffles</h3>
                <p className="text-muted-foreground mb-6">
                  There are no active raffles at the moment. 
                  Check back soon for new opportunities to win!
                </p>
                <Button asChild variant="outline">
                  <Link to="/">Return Home</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeRaffles.map((raffle) => {
                const raffleImage = getRaffleImage(raffle);
                const endDate = raffle.item_info?.['end-date'];
                const timeRemaining = getTimeRemaining(endDate);
                const ticketPrice = raffle.item_info?.ticket_price || raffle.price || 0;
                const prizeDescription = raffle.item_info?.prize_description;

                return (
                  <Link to={`/raffles/${raffle.slug}`} key={raffle.id}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                      {/* Raffle Image */}
                      {raffleImage ? (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={raffleImage}
                            alt={raffle.title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                          {timeRemaining && !timeRemaining.isEnded && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-primary text-primary-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {timeRemaining.text}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                          <Ticket className="h-16 w-16 text-primary/40" />
                          {timeRemaining && !timeRemaining.isEnded && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-primary text-primary-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {timeRemaining.text}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      <CardHeader className="flex-grow">
                        <CardTitle className="text-xl line-clamp-2">{raffle.title}</CardTitle>
                        <CardDescription className="line-clamp-3">
                          {raffle.description || 'Enter for a chance to win!'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Prize Info */}
                        {prizeDescription && (
                          <div className="flex items-center gap-2 text-sm">
                            <Gift className="h-4 w-4 text-primary" />
                            <span className="font-medium">{prizeDescription}</span>
                          </div>
                        )}
                        
                        {/* Ticket Price */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Ticket Price:</span>
                          <span className="font-bold text-lg">
                            {ticketPrice > 0 ? `$${ticketPrice.toFixed(2)}` : 'Free'}
                          </span>
                        </div>

                        {/* End Date */}
                        {endDate && (
                          <div className="text-sm text-muted-foreground">
                            Drawing: {format(new Date(endDate), 'PPP')}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-0">
                        <Button className="w-full" size="lg">
                          <Ticket className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Past Raffles Section */}
      {endedRaffles.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-foreground">Past Raffles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {endedRaffles.map((raffle) => {
                const raffleImage = getRaffleImage(raffle);
                const endDate = raffle.item_info?.['end-date'];

                return (
                  <Card key={raffle.id} className="overflow-hidden opacity-75">
                    {raffleImage ? (
                      <div className="relative h-32 overflow-hidden">
                        <img
                          src={raffleImage}
                          alt={raffle.title}
                          className="w-full h-full object-cover grayscale"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary">Ended</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 bg-muted flex items-center justify-center relative">
                        <Ticket className="h-8 w-8 text-muted-foreground" />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary">Ended</Badge>
                        </div>
                      </div>
                    )}
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm line-clamp-1">{raffle.title}</CardTitle>
                      {endDate && (
                        <CardDescription className="text-xs">
                          Ended: {format(new Date(endDate), 'PP')}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">How It Works</h2>
            <p className="text-muted-foreground">
              Entering our raffles is easy and helps support our mission
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                1
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Choose a Raffle</h3>
              <p className="text-sm text-muted-foreground">
                Browse our active raffles and find one with a prize you'd love to win
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center text-xl font-bold text-accent">
                2
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Get Your Tickets</h3>
              <p className="text-sm text-muted-foreground">
                Purchase your raffle tickets - the more you have, the better your chances!
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center text-xl font-bold text-secondary">
                3
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Wait for the Drawing</h3>
              <p className="text-sm text-muted-foreground">
                Winners are announced on the end date - check back to see if you won!
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Raffles;