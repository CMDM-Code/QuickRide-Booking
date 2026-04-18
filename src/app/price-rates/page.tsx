import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PriceRatesPage() {
  const customPricingData = [
    {
      category: "Mini Van",
      rates12hr: { "GenSan": 700, "South Cotabato": 1100, "Saranggani": 1100, "Davao del Sur": 1400, "Davao del Norte": 1400, "Outside Region 11": "N/A" },
      rates24hr: { "GenSan": 1300, "South Cotabato": 1600, "Saranggani": 1600, "Davao del Sur": 1900, "Davao del Norte": 1900, "Outside Region 11": "N/A" }
    },
    {
      category: "Hatchback",
      rates12hr: { "GenSan": 800, "South Cotabato": 1300, "Saranggani": 1300, "Davao del Sur": 1500, "Davao del Norte": 1500, "Outside Region 11": 1900 },
      rates24hr: { "GenSan": 1400, "South Cotabato": 1800, "Saranggani": 1800, "Davao del Sur": 2000, "Davao del Norte": 2000, "Outside Region 11": 2400 }
    },
    {
      category: "Sedan",
      rates12hr: { "GenSan": 1000, "South Cotabato": 1400, "Saranggani": 1400, "Davao del Sur": 1600, "Davao del Norte": 1600, "Outside Region 11": 2100 },
      rates24hr: { "GenSan": 1600, "South Cotabato": 1900, "Saranggani": 1900, "Davao del Sur": 2100, "Davao del Norte": 2100, "Outside Region 11": 2600 }
    },
    {
      category: "SUV",
      rates12hr: { "GenSan": 1300, "South Cotabato": 1900, "Saranggani": 1900, "Davao del Sur": 2100, "Davao del Norte": 2100, "Outside Region 11": 2400 },
      rates24hr: { "GenSan": 1900, "South Cotabato": 2400, "Saranggani": 2400, "Davao del Sur": 2600, "Davao del Norte": 2600, "Outside Region 11": 2900 }
    },
    {
      category: "L300",
      rates12hr: { "GenSan": 2000, "South Cotabato": 2500, "Saranggani": 2500, "Davao del Sur": 3000, "Davao del Norte": 3000, "Outside Region 11": 3400 },
      rates24hr: { "GenSan": 2500, "South Cotabato": 3000, "Saranggani": 3000, "Davao del Sur": 3500, "Davao del Norte": 3500, "Outside Region 11": 3900 }
    },
    {
      category: "Pick Up",
      note: "Driver Only",
      rates12hr: { "GenSan": 2500, "South Cotabato": 3000, "Saranggani": 3000, "Davao del Sur": 3500, "Davao del Norte": 3500, "Outside Region 11": 3800 },
      rates24hr: { "GenSan": 3000, "South Cotabato": 3500, "Saranggani": 3500, "Davao del Sur": 4000, "Davao del Norte": 4000, "Outside Region 11": 4300 }
    }
  ];

  const regions = ["GenSan", "South Cotabato", "Saranggani", "Davao del Sur", "Davao del Norte", "Outside Region 11"];

  return (
    <>
    <Navbar />
    <div className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
           <div className="inline-block px-4 py-1.5 bg-green-50 border border-green-100 rounded-full text-green-700 font-bold text-xs uppercase tracking-widest mb-6">
              Pricing Matrix
            </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Transparent Rate Structure</h1>
          <p className="text-lg text-slate-600 font-medium">
            Review our standardized regional pricing tiers based on vehicle classification and rental duration.
          </p>
        </div>

        <div className="space-y-16">
           {customPricingData.map((data, i) => (
               <div key={i} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                     <h2 className="text-2xl font-black text-white">{data.category}</h2>
                     {data.note && (
                         <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold uppercase tracking-widest">
                             {data.note}
                         </span>
                     )}
                  </div>
                  
                  <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-200">
                               <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-wider text-[11px] w-1/3">Region</th>
                               <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-wider text-[11px]">12-Hour Block (₱)</th>
                               <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-wider text-[11px]">24-Hour Block (₱)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-100">
                           {regions.map((region, j) => (
                               <tr key={j} className="hover:bg-green-50/50 transition-colors">
                                  <td className="py-4 px-6 text-sm font-bold text-slate-700">{region}</td>
                                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                                      {data.rates12hr[region as keyof typeof data.rates12hr] !== "N/A" 
                                          ? data.rates12hr[region as keyof typeof data.rates12hr]?.toLocaleString() 
                                          : <span className="text-slate-300 italic">Not Available</span>}
                                  </td>
                                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                                      {data.rates24hr[region as keyof typeof data.rates24hr] !== "N/A" 
                                          ? data.rates24hr[region as keyof typeof data.rates24hr]?.toLocaleString() 
                                          : <span className="text-slate-300 italic">Not Available</span>}
                                  </td>
                               </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
           ))}
        </div>

        <div className="mt-16 text-center">
             <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-colors shadow-lg shadow-green-700/20">
                 Book A Vehicle Now
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
             </Link>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
