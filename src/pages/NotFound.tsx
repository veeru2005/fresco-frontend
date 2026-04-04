import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";

const NotFound = () => {
  const location = useLocation();
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    fetch("/404.json")
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => {
        console.error("Error loading 404 animation:", error);
      });
  }, []);

  return (
    <section className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col items-center justify-center text-center">
        {animationData && (
          <div className="mx-auto w-full max-w-[400px] sm:max-w-[580px] lg:max-w-[700px]">
            <Lottie animationData={animationData} loop autoplay />
          </div>
        )}
        <p className="mt-2 text-lg font-semibold text-foreground sm:text-xl">Something went wrong</p>

        <div className="mt-6 flex w-full justify-center">
          <Button asChild size="lg" className="w-full max-w-[320px]">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
