import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ServicesPage() {
  const services = [
    {
      icon: "🚗",
      title: "Self-Drive Rentals",
      description: "Experience the ultimate freedom. Choose from our pristine fleet and take the wheel yourself. Perfect for spontaneous road trips, flexible business itineraries, and those who simply love to drive.",
      features: ["Flexible Pick-up/Drop-off", "Comprehensive Insurance Options", "24/7 Roadside Assistance"]
    },
    {
      icon: "👔",
      title: "Chauffeur Driven Services",
      description: "Sit back and reclaim your time. Our highly trained, professional drivers ensure you reach your destination safely and punctually, allowing you to focus on work or simply relax.",
      features: ["Vetted Professional Drivers", "Stress-free Navigation", "VIP Treatment"]
    },
    {
      icon: "✈️",
      title: "Airport Transfers",
      description: "Start or end your journey with pristine comfort. We monitor your flight schedule to ensure prompt pick-ups from General Santos or Davao airports, straight to your hotel or meeting.",
      features: ["Flight Monitoring", "Meet & Greet Service", "Luggage Assistance"]
    },
    {
      icon: "🏢",
      title: "Corporate Fleet Leasing",
      description: "Tailored mobility solutions for enterprise clients. We offer competitive long-term leasing packages with full maintenance and dedicated account management to keep your business moving.",
      features: ["Custom Rate Packages", "Priority Fleet Access", "Dedicated Support Manager"]
    }
  ];

  return (
    <>
    <Navbar />
    <div className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Premium Mobility Solutions</h1>
          <p className="text-lg text-slate-600 font-medium">
            Designed for uncompromising standards. Explore our range of tailored services crafted for both individuals and corporate entities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {services.map((svc, i) => (
             <div key={i} className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-16 h-16 bg-green-50 text-3xl flex items-center justify-center rounded-2xl mb-8">
                   {svc.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">{svc.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-8">
                   {svc.description}
                </p>
                <div className="space-y-3">
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Included Features</p>
                   <ul className="space-y-2">
                       {svc.features.map((feat, j) => (
                           <li key={j} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                               <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px]">✓</div>
                               {feat}
                           </li>
                       ))}
                   </ul>
                </div>
             </div>
          ))}
        </div>

        <div className="mt-20 bg-green-900 rounded-[2rem] p-12 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
           <h2 className="text-3xl font-black mb-4 relative z-10">Need a custom mobility solution?</h2>
           <p className="text-green-100 mb-8 max-w-xl mx-auto relative z-10">Our deployment team can architect a specific transportation plan tailored precisely to your logistical requirements.</p>
           <Link href="/dashboard/support" className="relative z-10 inline-block bg-white text-green-900 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors">
               Contact Dispatch Team
           </Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
