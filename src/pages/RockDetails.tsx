import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  Gem,
  Layers,
  Mountain,
  Search,
  Sparkles,
  Info,
} from "lucide-react";
import { useState } from "react";

const RockDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string>("");

  const { data: rockData, isLoading } = useQuery({
    queryKey: ["rock-details", slug],
    queryFn: () => elegantAPI.getItemDetails(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!rockData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Mineral Not Found</h1>
          <Button onClick={() => navigate("/rock-identification")}>
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const rockInfo = rockData.item_info || {};
  const tags = rockData.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const images = rockData._item_images_of_items?.items?.filter(
    (img) => img.image_type === "Image"
  ) || [];
  const mainImage = selectedImage || images[0]?.display_image || "/placeholder.svg";

  // Extract properties from item_info
  const properties = {
    chemicalFormula: rockInfo.chemicalFormula || rockInfo.formula || "Unknown",
    crystalSystem: rockInfo.crystalSystem || rockInfo.crystal_system || "Unknown",
    hardness: rockInfo.hardness || rockInfo.mohs_hardness || "Unknown",
    specificGravity: rockInfo.specificGravity || rockInfo.specific_gravity || "Unknown",
    color: rockInfo.color || "Varies",
    luster: rockInfo.luster || "Unknown",
    streak: rockInfo.streak || "Unknown",
    fracture: rockInfo.fracture || "Unknown",
    cleavage: rockInfo.cleavage || "Unknown",
  };

  const formation = rockInfo.formation || rockInfo.geological_formation || 
    "Formation information not available";
  
  const identificationTips = rockInfo.identification_tips || rockInfo.identification || 
    "Look for characteristic properties like color, hardness, crystal form, and luster";
  
  const uses = rockInfo.uses || rockInfo.applications || 
    "Collected for educational and aesthetic purposes";

  // Mock related specimens (would come from API in production)
  const relatedSpecimens = rockInfo.related_specimens || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{rockData.title} - Mineral Details | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={rockData.description || `Detailed information about ${rockData.title}`} />
        <link rel="canonical" href={`${window.location.origin}/rocks/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${rockData.title} - Mineral Details | Tampa Bay Minerals & Science Club`} />
        <meta property="og:description" content={rockData.description || `Detailed information about ${rockData.title}`} />
        <meta property="og:url" content={`${window.location.origin}/rocks/${slug}`} />
        {mainImage && <meta property="og:image" content={mainImage} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${rockData.title} - Mineral Details | Tampa Bay Minerals & Science Club`} />
        <meta name="twitter:description" content={rockData.description || `Detailed information about ${rockData.title}`} />
        {mainImage && <meta name="twitter:image" content={mainImage} />}
      </Helmet>
      
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-20">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/rock-identification")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Directory
        </Button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image and Gallery */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                {/* Main Image */}
                <div className="mb-4">
                  <img
                    src={mainImage}
                    alt={rockData.title}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                </div>

                {/* Image Gallery */}
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((image) => (
                      <img
                        key={image.id}
                        src={image.display_image}
                        alt="Gallery"
                        onClick={() => setSelectedImage(image.display_image)}
                        className={`w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          selectedImage === image.display_image
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Information Tabs */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="description">
                      <Info className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="formation">
                      <Mountain className="h-4 w-4 mr-2" />
                      Formation
                    </TabsTrigger>
                    <TabsTrigger value="identification">
                      <Search className="h-4 w-4 mr-2" />
                      ID Tips
                    </TabsTrigger>
                    <TabsTrigger value="uses">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Uses
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="mt-4">
                    <div className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {rockData.description || "No description available"}
                      </p>
                      {tags.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Categories</h4>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="formation" className="mt-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Mountain className="h-5 w-5 text-primary" />
                        Geological Formation
                      </h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {formation}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="identification" className="mt-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Identification Tips
                      </h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {identificationTips}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="uses" className="mt-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Uses & Applications
                      </h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {uses}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Related Specimens */}
            {relatedSpecimens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5" />
                    Related Specimens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {relatedSpecimens.map((specimen: any, index: number) => (
                      <div
                        key={index}
                        onClick={() => navigate(`/rocks/${specimen.slug}`)}
                        className="group cursor-pointer"
                      >
                        <img
                          src={specimen.image || "/placeholder.svg"}
                          alt={specimen.name}
                          className="w-full h-32 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                        />
                        <p className="text-sm font-medium mt-2 group-hover:text-primary transition-colors">
                          {specimen.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Properties */}
          <div className="space-y-6">
            {/* Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Gem className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {rockData.title}
                    </h1>
                    <Badge variant="secondary" className="mt-1">
                      {rockData.item_type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Physical Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Physical Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PropertyRow
                  label="Chemical Formula"
                  value={properties.chemicalFormula}
                />
                <PropertyRow
                  label="Crystal System"
                  value={properties.crystalSystem}
                />
                <PropertyRow
                  label="Hardness (Mohs)"
                  value={properties.hardness}
                />
                <PropertyRow
                  label="Specific Gravity"
                  value={properties.specificGravity}
                />
                <PropertyRow label="Color" value={properties.color} />
                <PropertyRow label="Luster" value={properties.luster} />
                <PropertyRow label="Streak" value={properties.streak} />
                <PropertyRow label="Fracture" value={properties.fracture} />
                <PropertyRow label="Cleavage" value={properties.cleavage} />
              </CardContent>
            </Card>

            {/* Quick Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Collectible</Badge>
                  <Badge variant="outline">Educational</Badge>
                </div>
                <p className="text-muted-foreground pt-2">
                  Perfect for collectors, students, and mineral enthusiasts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertyRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-start border-b border-border pb-2 last:border-0">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
  </div>
);

export default RockDetails;
