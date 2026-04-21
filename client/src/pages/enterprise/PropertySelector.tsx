import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, ArrowRight } from 'lucide-react';
import { NavigationBreadcrumb } from '../../components/enterprise/NavigationBreadcrumb';

export const PropertySelector = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [properties, setProperties] = useState<any[]>([]);

    useEffect(() => {
        // Auto-redirect map based on landing levels
        if (user?.defaultLandingLevel === 'PROPERTY' && user.storeId) {
            navigate(`/dashboard/property/${user.storeId}`);
            return;
        } else if (user?.defaultLandingLevel === 'OUTLET' && user.outletIds && user.outletIds.length > 0) {
            navigate(`/dashboard/outlet/${user.outletIds[0]}`);
            return;
        } else if (user?.defaultLandingLevel === 'OPERATIONAL' && user.outletIds && user.outletIds.length > 0) {
            navigate(`/dashboard/ops/${user.outletIds[0]}`);
            return;
        }

        const fetchProperties = async () => {
            try {
                const res = await fetch('/api/v1/enterprise/network-summary', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProperties(data.properties || []);
                }
            } catch (err) {
                console.error('Failed to fetch properties', err);
            }
        };

        if (user) {
            fetchProperties();
        }
    }, [user, navigate]);

    return (
        <div className="max-w-6xl mx-auto py-8 text-white space-y-6">
            <h1 className="text-2xl font-bold text-[#C5A059] tracking-widest uppercase">Network Properties</h1>
            <NavigationBreadcrumb />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop, idx) => (
                    <div 
                        key={idx} 
                        className="bg-[#1a1a1a] border border-[#333] hover:border-[#C5A059] transition-all p-6 rounded-lg cursor-pointer flex flex-col justify-between h-48"
                        onClick={() => navigate(`/dashboard/property/${prop.store_id}`)}
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-[#252525] rounded-full border border-[#444]">
                                    <Building2 className="w-6 h-6 text-[#C5A059]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-wide">Store #{prop.store_id}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Property</p>
                                </div>
                            </div>
                            <div className="text-sm font-mono text-gray-400">
                                7-Day Consumption: <span className="text-white font-bold">{prop._sum?.lbs_total?.toFixed(2) || 0} lbs</span>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <ArrowRight className="w-5 h-5 text-[#C5A059] opacity-50 hover:opacity-100" />
                        </div>
                    </div>
                ))}

                {properties.length === 0 && (
                     <div className="col-span-full text-center py-12 text-gray-500 font-mono">
                         No properties available in your scope.
                     </div>
                )}
            </div>
        </div>
    );
};
