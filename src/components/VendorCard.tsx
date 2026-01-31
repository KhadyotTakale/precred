import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VendorCardProps {
  name: string;
  specialty: string;
  rating: number;
  description: string;
  tags: string[];
  slug: string;
}

const VendorCard = ({ name, specialty, rating, description, tags, slug }: VendorCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="hover:shadow-xl transition-all duration-300 group cursor-pointer"
      onClick={() => navigate(`/vendors/${slug}`)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{specialty}</p>
          </div>
          <div className="flex items-center gap-1 bg-secondary/20 px-2 py-1 rounded-full">
            <Star className="h-4 w-4 fill-secondary text-secondary" />
            <span className="text-sm font-semibold">{rating}</span>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 text-sm">{description}</p>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorCard;
