import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Leaf, Truck, ShieldCheck } from 'lucide-react';

const Dashboard = () => {

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1f5a42] via-[#2f7656] to-[#5a9d6f] text-white min-h-[calc(100svh-4rem)] md:min-h-[calc(100svh-5rem)] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-32"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-[#103626]/55 backdrop-blur-[2px]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 px-5 py-7 sm:px-8 sm:py-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight [text-shadow:0_3px_14px_rgba(0,0,0,0.75)]">
              Fresh Organic Fruits and Vegetables
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
              Farm-fresh produce delivered quickly with trusted quality and transparent sourcing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/products">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                  View Products
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Why Choose Fresco Organics?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="p-6 text-center border-2 border-[#255c45]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Leaf className="h-6 w-6 text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold mb-2">100% Natural</h3>
              <p className="text-sm text-muted-foreground">Pure, organic produce grown without harmful chemicals or pesticides.</p>
            </Card>

            <Card className="p-6 text-center border-2 border-[#255c45]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <Truck className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm text-muted-foreground">Directly from the farm to your doorstep in pristine condition.</p>
            </Card>

            <Card className="p-6 text-center border-2 border-[#255c45]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <ShieldCheck className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quality Assured</h3>
              <p className="text-sm text-muted-foreground">Every item is handpicked to ensure only the best reaches your family.</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
