import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import clubLogo from "@/assets/club-logo-new.png";

interface QRCodeCardProps {
  url: string;
  title?: string;
  filename?: string;
  itemType?: "Event" | "Class" | "Raffle" | "Vendor" | "Membership";
}

const QRCodeCard = ({ 
  url, 
  title = "QR Code", 
  filename = "qrcode",
  itemType = "Event"
}: QRCodeCardProps) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [includeLogo, setIncludeLogo] = useState(true);

  const handleDownloadQRCode = () => {
    if (!qrCodeRef.current) return;
    
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0, size, size);
      
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${filename}-qrcode.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success("QR Code downloaded!");
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5 text-primary" />
          {title} QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={qrCodeRef} className="bg-white p-3 rounded-lg shadow-sm flex justify-center">
          <QRCodeSVG 
            value={url} 
            size={160}
            level="H"
            includeMargin={true}
            imageSettings={includeLogo ? {
              src: clubLogo,
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            } : undefined}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="include-logo" className="text-sm text-muted-foreground cursor-pointer">
            Include club logo
          </Label>
          <Switch
            id="include-logo"
            checked={includeLogo}
            onCheckedChange={setIncludeLogo}
          />
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={handleDownloadQRCode}
        >
          <Download className="h-4 w-4 mr-2" />
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
};

export default QRCodeCard;
