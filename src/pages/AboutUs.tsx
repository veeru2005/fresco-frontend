import { Card } from '@/components/ui/card';
import { Heart, MapPin, GraduationCap } from 'lucide-react';

const AboutUs = () => {
  const whatsappGroupUrl = 'https://chat.whatsapp.com/JNEHTwemdSX5LWENyAOOmd?mode=gi_t';

  return (
    <div className="min-h-screen">
      <section className="py-6 sm:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-10 flex justify-center">
            <div className="relative h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40">
              <div className="pointer-events-none absolute -inset-[8px] sm:-inset-[10px]">
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                  <rect
                    x="3"
                    y="3"
                    width="94"
                    height="94"
                    rx="10"
                    fill="none"
                    stroke="#255c45"
                    strokeWidth="1.7"
                    pathLength="250"
                    strokeDasharray="7 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
                  </rect>
                </svg>
              </div>
              <div className="absolute inset-0 rounded-[10px] bg-white" />
              <div className="absolute inset-[6px] sm:inset-[7px] rounded-[8px] overflow-hidden bg-white">
                <img
                  src="https://res.cloudinary.com/dv5qxkxmc/image/upload/v1775308892/2_oast1m.jpg"
                  alt="Fresco Organics logo"
                  className="h-full w-full object-cover scale-110"
                />
              </div>
            </div>
          </div>

          <Card className="p-8 sm:p-10 max-w-6xl mx-auto border-2 border-[#255c45]">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-stretch">
              <div>
                <h2 className="text-4xl font-extrabold mb-4 flex items-center gap-2">
                  Our Story
                  <Heart className="w-6 h-6 text-orange-500" />
                </h2>
                <div className="space-y-4 text-muted-foreground leading-8 text-xl">
                  <p>
                    Fresco Organics started with a simple vision: to bridge the gap between local farms and your kitchen table. We believe that everyone deserves access to fresh, natural, and chemical-free produce.
                  </p>
                  <p>
                    By ordering through us, you're not just getting the tastiest vegetables and fruits; you're supporting local agriculture and a healthier lifestyle. We carefully select every item to ensure it meets our high standards before it reaches your door.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-[#255c45] rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-start w-full max-w-[420px] justify-self-end">
                <h3 className="text-3xl font-extrabold mb-6 flex items-center gap-2">
                  Delivery Areas
                  <MapPin className="w-6 h-6 text-emerald-700" />
                </h3>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-2xl font-semibold">
                    <MapPin className="w-5 h-5 text-red-500" />
                    Mangalagiri
                  </div>
                  <div className="flex items-center gap-3 text-2xl font-semibold">
                    <MapPin className="w-5 h-5 text-red-500" />
                    Vadeswaram
                  </div>
                  <div className="flex items-center gap-3 text-2xl font-semibold text-emerald-800">
                    <GraduationCap className="w-5 h-5 text-amber-500" />
                    KL University
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="pt-2 pb-14 sm:pt-0 sm:pb-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h2 className="text-4xl font-extrabold mb-4">Join Our WhatsApp Group</h2>
          <p className="text-muted-foreground text-lg sm:text-xl mb-8">
            Join our Fresco community for daily updates, seasonal offers, and quick support.
          </p>
          <a
            href={whatsappGroupUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-green-500 hover:bg-green-600 text-white font-bold text-base sm:text-2xl px-5 sm:px-8 py-3 sm:py-4 rounded-xl shadow-md transition-colors whitespace-nowrap max-w-full"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 8.02 0C3.664 0 .128 3.535.128 7.892c0 1.393.364 2.754 1.054 3.954L0 16l4.274-1.121a7.86 7.86 0 0 0 3.745.952h.003c4.355 0 7.891-3.536 7.891-7.892a7.86 7.86 0 0 0-2.312-5.613zM8.022 14.5h-.002a6.53 6.53 0 0 1-3.327-.91l-.239-.142-2.536.666.677-2.473-.156-.254a6.52 6.52 0 0 1-1.002-3.492c0-3.605 2.933-6.538 6.54-6.538 1.746 0 3.387.68 4.622 1.916a6.495 6.495 0 0 1 1.913 4.626c-.001 3.606-2.934 6.538-6.49 6.538zm3.586-4.881c-.196-.098-1.158-.571-1.338-.636-.18-.066-.311-.098-.442.098s-.507.636-.622.767c-.114.131-.229.147-.425.049-.196-.098-.827-.305-1.576-.973-.582-.519-.975-1.16-1.089-1.356-.114-.196-.012-.302.086-.4.088-.088.196-.229.294-.343.098-.115.13-.197.196-.328.065-.131.032-.246-.017-.344-.049-.098-.442-1.066-.605-1.459-.159-.383-.32-.331-.442-.337l-.376-.007c-.13 0-.343.049-.523.246s-.687.672-.687 1.639.703 1.901.801 2.032c.098.131 1.385 2.115 3.357 2.964.469.202.835.322 1.12.412.471.149.9.128 1.24.078.378-.056 1.158-.473 1.322-.93.164-.458.164-.85.114-.931-.049-.082-.179-.131-.376-.229z" />
            </svg>
            Join WhatsApp Group
          </a>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
