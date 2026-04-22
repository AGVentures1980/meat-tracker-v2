import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Utensils, GlassWater, ChefHat, Users, ArrowRight } from 'lucide-react';
import { NavigationBreadcrumb } from '../../components/enterprise/NavigationBreadcrumb';

export const OutletSelector = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { propertySlug } = useParams();
    const [outlets, setOutlets] = useState<any[]>([]);
    const [property, setProperty] = useState<{ store_name: string, location: string } | null>(null);

    useEffect(() => {
        if (user?.defaultLandingLevel === 'OUTLET' && user.outletIds && user.outletIds.length > 0) {
            navigate(`/dashboard/outlet/${user.outletIds[0]}/kpi`);
            return;
        }

        const fetchOutlets = async () => {
            try {
                const storeId = propertySlug || user?.storeId;
                if (!storeId) return;

                const res = await fetch(`/api/v1/enterprise/property/${storeId}/outlet-summary`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setOutlets(data.outlets || []);
                    if (data.property) setProperty(data.property);
                }
            } catch (err) {
                console.error('Failed to fetch outlets', err);
            }
        };

        if (user) {
            fetchOutlets();
        }
    }, [user, navigate, propertySlug]);

    const grouped = {
        RESTAURANT: outlets.filter(o => o.outlet_type === 'RESTAURANT'),
        BAR: outlets.filter(o => o.outlet_type === 'BAR'),
        KITCHEN: outlets.filter(o => o.outlet_type === 'KITCHEN'),
        EMPLOYEE: outlets.filter(o => o.outlet_type === 'EMPLOYEE')
    };

    const OutletGroup = ({ title, items, icon: Icon }: any) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                    <Icon className="w-5 h-5 text-[#C5A059]" />
                    <h2 className="text-lg font-bold tracking-widest uppercase text-gray-300">{title}</h2>
                    <span className="ml-2 text-xs font-mono bg-[#333] text-gray-400 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map((outlet: any, idx: number) => (
                        <div 
                            key={idx}
                            onClick={() => navigate(`/dashboard/outlet/${outlet.slug}/kpi`, { state: { propertyName: property?.store_name } })}
                            className="bg-[#1a1a1a] border border-[#333] hover:border-[#C5A059] p-4 rounded-lg cursor-pointer transition-all flex flex-col items-start gap-4 shadow-lg group"
                        >
                            <h3 className="font-bold text-sm tracking-wide text-white group-hover:text-[#C5A059] transition-colors">{outlet.name}</h3>
                            <div className="mt-auto self-end">
                                <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto py-8 text-white space-y-6">
            <NavigationBreadcrumb levels={[
                { label: 'Network', href: '/dashboard/network' },
                { label: property?.store_name || 'Property', href: '#' }
            ]} />

            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/dashboard/network')} className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest border border-[#333] hover:border-[#C5A059] text-gray-400 hover:text-[#C5A059] rounded transition-colors">&larr; Back</button>
                <div>
                    <h1 className="text-2xl font-bold text-[#C5A059] tracking-widest uppercase">{property?.store_name || 'Property Outlets'}</h1>
                    {property?.location && <span className="text-sm text-gray-500 font-mono tracking-widest">{property.location}</span>}
                </div>
            </div>

            <div className="bg-[#121212] rounded-xl p-4">
                <OutletGroup title="Restaurants" items={grouped.RESTAURANT} icon={Utensils} />
                <OutletGroup title="Bars & Lounges" items={grouped.BAR} icon={GlassWater} />
                <OutletGroup title="Production Kitchens" items={grouped.KITCHEN} icon={ChefHat} />
                <OutletGroup title="Employee Dining" items={grouped.EMPLOYEE} icon={Users} />

                {outlets.length === 0 && (
                    <div className="text-center py-12 text-gray-500 font-mono tracking-widest uppercase">
                        No outlets provisioned for this property
                    </div>
                )}
            </div>
        </div>
    );
};
