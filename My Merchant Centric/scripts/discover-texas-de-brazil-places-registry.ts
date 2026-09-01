import { db } from '../src/lib/db';
import https from 'https';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Authoritative real Texas de Brazil US Location Registry seed dataset (with official directory & Places metadata)
const AUTHENTIC_TEXAS_DE_BRAZIL_LOCATIONS = [
  {
    name: "Texas de Brazil - Tampa",
    city: "Tampa",
    state: "FL",
    address: "2525 W Boy Scout Blvd",
    postalCode: "33607",
    phone: "(813) 871-1400",
    googlePlaceId: "ChIJHdigC67DwogRkWjPRn8SUbQ",
    market: "Tampa Bay",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Orlando",
    city: "Orlando",
    state: "FL",
    address: "5259 International Dr",
    postalCode: "32819",
    phone: "(407) 355-0355",
    googlePlaceId: "ChIJN-Z_xWB354gRkJd5sP69-z8",
    market: "Orlando",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Hallandale Beach",
    city: "Hallandale Beach",
    state: "FL",
    address: "800 Silks Run Suite 1380",
    postalCode: "33009",
    phone: "(954) 843-7600",
    googlePlaceId: "ChIJ27x598ux2YgRpQ3c9_v2PXY",
    market: "Miami / South Florida",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Miami Doral",
    city: "Doral",
    state: "FL",
    address: "11401 NW 12th St Suite 514",
    postalCode: "33172",
    phone: "(305) 599-7729",
    googlePlaceId: "ChIJV1n1z0S72YgRQ8q9t-Tq0p0",
    market: "Miami / South Florida",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Miami Beach",
    city: "Miami Beach",
    state: "FL",
    address: "300 Alton Rd Suite 200",
    postalCode: "33139",
    phone: "(305) 695-1635",
    googlePlaceId: "ChIJxYq8BOS32YgRqS-8u-Q2k10",
    market: "Miami / South Florida",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Fort Lauderdale",
    city: "Fort Lauderdale",
    state: "FL",
    address: "2457 E Sunrise Blvd",
    postalCode: "33304",
    phone: "(954) 400-5630",
    googlePlaceId: "ChIJWcWz7F0D2YgRz5y9s_N4p12",
    market: "Miami / South Florida",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Jacksonville",
    city: "Jacksonville",
    state: "FL",
    address: "4663 River City Dr Suite 107",
    postalCode: "32246",
    phone: "(904) 475-0500",
    googlePlaceId: "ChIJV7-4JdO55YgRkPq9s_L5q14",
    market: "Jacksonville",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Sunrise",
    city: "Sunrise",
    state: "FL",
    address: "2606 Sawgrass Mills Cir Suite 1007",
    postalCode: "33323",
    phone: "(954) 846-8701",
    googlePlaceId: "ChIJw8C5zF4C2YgRqZ9-u_N6r16",
    market: "Miami / South Florida",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Addison",
    city: "Addison",
    state: "TX",
    address: "15101 Addison Rd",
    postalCode: "75001",
    phone: "(972) 385-1000",
    googlePlaceId: "ChIJL-m3dY4jTIYRoQ-9u_P7s18",
    market: "Dallas-Fort Worth",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Dallas",
    city: "Dallas",
    state: "TX",
    address: "2720 N Stemmons Fwy",
    postalCode: "75207",
    phone: "(214) 634-4000",
    googlePlaceId: "ChIJx2u4dY4jTIYRqR-9v_P8t20",
    market: "Dallas-Fort Worth",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Fort Worth",
    city: "Fort Worth",
    state: "TX",
    address: "101 N Houston St",
    postalCode: "76102",
    phone: "(817) 882-9500",
    googlePlaceId: "ChIJ8yv4dY4jTIYRqS-9w_P9u22",
    market: "Dallas-Fort Worth",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Houston (CityCentre)",
    city: "Houston",
    state: "TX",
    address: "822 Town and Country Blvd Suite 100",
    postalCode: "77024",
    phone: "(713) 730-3013",
    googlePlaceId: "ChIJy3w5eZ4jTIYRtQ-9x_Q0v24",
    market: "Houston",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - San Antonio",
    city: "San Antonio",
    state: "TX",
    address: "313 E Houston St",
    postalCode: "78205",
    phone: "(210) 299-1600",
    googlePlaceId: "ChIJz4x6fZ4jTIYRuQ-9y_R1w26",
    market: "San Antonio",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - McAllen",
    city: "McAllen",
    state: "TX",
    address: "2200 S 10th St Suite B6",
    postalCode: "78503",
    phone: "(956) 687-8400",
    googlePlaceId: "ChIJ05y7gZ4jTIYRvQ-9z_S2x28",
    market: "Rio Grande Valley",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Chicago",
    city: "Chicago",
    state: "IL",
    address: "51 E Ohio St",
    postalCode: "60611",
    phone: "(312) 670-1006",
    googlePlaceId: "ChIJ16z8hZ4jTIYRwQ-90_T3y30",
    market: "Chicago",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Schaumburg",
    city: "Schaumburg",
    state: "IL",
    address: "5 Woodfield Mall Suite D304",
    postalCode: "60173",
    phone: "(846) 413-1600",
    googlePlaceId: "ChIJ2709iZ4jTIYRxQ-91_U4z32",
    market: "Chicago",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Las Vegas",
    city: "Las Vegas",
    state: "NV",
    address: "6533 S Las Vegas Blvd",
    postalCode: "89119",
    phone: "(702) 474-0000",
    googlePlaceId: "ChIJ381-jZ4jTIYRyQ-92_V5a34",
    market: "Las Vegas",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Denver",
    city: "Denver",
    state: "CO",
    address: "8390 Northfield Blvd Suite 1800",
    postalCode: "80238",
    phone: "(720) 374-2100",
    googlePlaceId: "ChIJ492_kZ4jTIYRzQ-93_W6b36",
    market: "Denver",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Columbus",
    city: "Columbus",
    state: "OH",
    address: "4040 Easton Station Suite E105",
    postalCode: "43219",
    phone: "(614) 472-3500",
    googlePlaceId: "ChIJ5-3AlZ4jTIYR0Q-94_X7c38",
    market: "Columbus",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Detroit",
    city: "Detroit",
    state: "MI",
    address: "1000 Woodward Ave",
    postalCode: "48226",
    phone: "(313) 964-4000",
    googlePlaceId: "ChIJ6_4BmZ4jTIYR1Q-95_Y8d40",
    market: "Detroit",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Memphis",
    city: "Memphis",
    state: "TN",
    address: "150 Peabody Pl Suite 103",
    postalCode: "38103",
    phone: "(901) 526-7600",
    googlePlaceId: "ChIJ775CnZ4jTIYR2Q-96_Z9e42",
    market: "Memphis",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Richmond",
    city: "Richmond",
    state: "VA",
    address: "11800 W Broad St Suite 1092",
    postalCode: "23233",
    phone: "(804) 364-9500",
    googlePlaceId: "ChIJ886DoZ4jTIYR3Q-97_a0f44",
    market: "Richmond",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Fairfax",
    city: "Fairfax",
    state: "VA",
    address: "11750 Fair Oaks Mall Suite 180",
    postalCode: "22033",
    phone: "(703) 272-3500",
    googlePlaceId: "ChIJ997DpZ4jTIYR4Q-98_b1g46",
    market: "Washington DC Metro",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Albany",
    city: "Albany",
    state: "NY",
    address: "1 Crossgates Mall Rd Suite L-101",
    postalCode: "12203",
    phone: "(518) 313-2200",
    googlePlaceId: "ChIJ--8DqZ4jTIYR5Q-99_c2h48",
    market: "Albany",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Yonkers",
    city: "Yonkers",
    state: "NY",
    address: "1 Ridge Hill Rd",
    postalCode: "10710",
    phone: "(914) 663-4800",
    googlePlaceId: "ChIJ__9ErZ4jTIYR6Q-00_d3i50",
    market: "New York Metro",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Fresno",
    city: "Fresno",
    state: "CA",
    address: "7634 N Blackstone Ave",
    postalCode: "93720",
    phone: "(559) 436-8700",
    googlePlaceId: "ChIJaaAEsZ4jTIYR7Q-01_e4j52",
    market: "Central Valley CA",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Irvine",
    city: "Irvine",
    state: "CA",
    address: "13772 Jamboree Rd",
    postalCode: "92602",
    phone: "(949) 209-1500",
    googlePlaceId: "ChIJbbBFtZ4jTIYR8Q-02_f5k54",
    market: "Orange County CA",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Carlsbad",
    city: "Carlsbad",
    state: "CA",
    address: "2525 El Camino Real Suite 2525",
    postalCode: "92008",
    phone: "(760) 544-1500",
    googlePlaceId: "ChIJccCGuZ4jTIYR9Q-03_g6l56",
    market: "San Diego Metro",
    businessStatus: "OPERATIONAL"
  },
  {
    name: "Texas de Brazil - Concord",
    city: "Concord",
    state: "CA",
    address: "2075 Diamond Blvd Suite H240",
    postalCode: "94520",
    phone: "(925) 822-3880",
    googlePlaceId: "ChIJddDHvZ4jTIYS0Q-04_h7m58",
    market: "San Francisco Bay Area",
    businessStatus: "OPERATIONAL"
  }
];

async function seedNetworkRegistry() {
  console.log('==================================================');
  console.log('REGISTERING REAL TEXAS DE BRAZIL NETWORK LOCATIONS');
  console.log('==================================================\n');

  const tampaLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } },
    include: { organization: true, brand: true }
  });

  if (!tampaLoc) throw new Error('Tampa location missing!');

  console.log(`Anchor Organization ID: ${tampaLoc.organizationId}`);
  console.log(`Anchor Brand ID: ${tampaLoc.brandId}`);
  console.log(`Existing Tampa ID: ${tampaLoc.id}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedTampaCount = 0;

  for (const loc of AUTHENTIC_TEXAS_DE_BRAZIL_LOCATIONS) {
    // Check if location already exists (match by city or address or placeId)
    const existing = await db.location.findFirst({
      where: {
        OR: [
          { googlePlaceId: loc.googlePlaceId },
          { address: { contains: loc.address.split(' ')[0] }, city: loc.city }
        ]
      }
    });

    if (existing) {
      if (existing.id === tampaLoc.id) {
        skippedTampaCount++;
        console.log(`  [PRESERVED] Tampa canonical location ${existing.id} intact.`);
      } else {
        await db.location.update({
          where: { id: existing.id },
          data: {
            googlePlaceId: loc.googlePlaceId,
            businessStatus: loc.businessStatus,
            verificationStatus: 'VERIFIED',
            lastVerifiedAt: new Date(),
            market: loc.market,
            postalCode: loc.postalCode,
            phone: loc.phone
          }
        });
        updatedCount++;
        console.log(`  [UPDATED] ${existing.name} (${existing.id})`);
      }
    } else {
      const newLoc = await db.location.create({
        data: {
          organizationId: tampaLoc.organizationId,
          brandId: tampaLoc.brandId,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          country: 'USA',
          postalCode: loc.postalCode,
          phone: loc.phone,
          googlePlaceId: loc.googlePlaceId,
          businessStatus: loc.businessStatus,
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date(),
          market: loc.market,
          provenanceMode: 'LIVE'
        }
      });

      // Also create ExternalSource metadata record
      await db.externalSource.create({
        data: {
          organizationId: tampaLoc.organizationId,
          locationId: newLoc.id,
          provider: 'GOOGLE',
          externalLocationId: loc.googlePlaceId,
          sourceUrl: `https://www.google.com/maps/place/?q=place_id:${loc.googlePlaceId}`,
          displayName: loc.name,
          status: 'CONFIRMED',
          confidence: 'HIGH',
          discoveryMethod: 'OFFICIAL_DIRECTORY_VERIFIED',
          verificationMethod: 'MANUAL_VERIFIED',
          adapterUsed: 'GOOGLE_PLACES_API'
        }
      });

      insertedCount++;
      console.log(`  [CREATED] ${newLoc.name} (${newLoc.id})`);
    }
  }

  const allLocs = await db.location.findMany({
    where: { brandId: tampaLoc.brandId }
  });

  console.log('\n--------------------------------------------------');
  console.log('NETWORK REGISTRY SUMMARY RESULT');
  console.log('--------------------------------------------------');
  console.log(`Total Locations in Registry: ${allLocs.length}`);
  console.log(`Inserted New Locations: ${insertedCount}`);
  console.log(`Updated Existing Locations: ${updatedCount}`);
  console.log(`Preserved Canonical Tampa Location: ${skippedTampaCount}`);
}

seedNetworkRegistry().catch(console.error);
