import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LocationsGrid, { LocationCardData } from './LocationsGrid';

export const revalidate = 0;

interface LocationsPageProps {
  searchParams?: {
    locationId?: string;
    entityId?: string;
  };
}

export default async function LocationsPage({ searchParams }: LocationsPageProps) {
  const cookieStore = cookies();
  const session = await getServerSession(cookieStore);

  if (!session) {
    redirect('/login');
  }

  const organizationId = session.organizationId;
  const selectedLocationId = searchParams?.locationId || searchParams?.entityId;

  // Fetch all locations for organization
  const allLocations = await db.location.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      businessStatus: true,
      verificationStatus: true,
      googlePlaceId: true,
      market: true,
    },
    orderBy: [{ state: 'asc' }, { name: 'asc' }],
  });

  const locationDataList: LocationCardData[] = allLocations.map(loc => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    city: loc.city,
    state: loc.state,
    postalCode: loc.postalCode,
    country: loc.country,
    businessStatus: loc.businessStatus || 'OPERATIONAL',
    verificationStatus: loc.verificationStatus || 'VERIFIED',
    googlePlaceId: loc.googlePlaceId,
    market: loc.market,
  }));

  const isSpecificSelected = selectedLocationId && selectedLocationId !== 'ALL';
  const selectedLoc = isSpecificSelected ? locationDataList.find(l => l.id === selectedLocationId) : null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="mb-4">
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Locations Overview</h1>
            <p className="text-secondary">
              {isSpecificSelected && selectedLoc
                ? `Analyzing single location context: ${selectedLoc.name}.`
                : `Explore all ${locationDataList.length} Texas de Brazil network locations across 27 States & Territories.`}
            </p>

            {isSpecificSelected && selectedLoc && (
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                  Active Selection: {selectedLoc.name} ({selectedLoc.city}, {selectedLoc.state})
                </span>
                <a
                  href="/locations"
                  style={{ fontSize: '0.78rem', color: '#ffffff', backgroundColor: '#242838', padding: '0.35rem 0.75rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}
                >
                  Clear Selection (Show All {locationDataList.length} Stores)
                </a>
              </div>
            )}
          </div>

          <LocationsGrid allLocations={locationDataList} selectedLocationId={selectedLocationId} />
        </main>
      </div>
    </div>
  );
}
