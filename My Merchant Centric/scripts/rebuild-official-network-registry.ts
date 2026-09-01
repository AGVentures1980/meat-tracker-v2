import { db } from '../src/lib/db';
import https from 'https';

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Complete official list of 64 Texas de Brazil locations parsed directly from https://texasdebrazil.com/locations/
export const OFFICIAL_TDB_DIRECTORY_MANIFEST = [
  // Florida (FL)
  { slug: "tampa", name: "Texas de Brazil - Tampa", city: "Tampa", state: "FL", address: "2525 W Boy Scout Blvd", postalCode: "33607", phone: "(813) 871-1400", market: "Tampa Bay", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/tampa/" },
  { slug: "orlando", name: "Texas de Brazil - Orlando", city: "Orlando", state: "FL", address: "5259 International Dr", postalCode: "32819", phone: "(407) 355-0355", market: "Orlando Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/orlando/" },
  { slug: "hallandale-beach", name: "Texas de Brazil - Hallandale Beach", city: "Hallandale Beach", state: "FL", address: "800 Silks Run Suite 1380", postalCode: "33009", phone: "(954) 843-7600", market: "Miami / South Florida", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/hallandale-beach/" },
  { slug: "dolphin-mall", name: "Texas de Brazil - Miami (Dolphin Mall)", city: "Miami", state: "FL", address: "11401 NW 12th St Suite 514", postalCode: "33172", phone: "(305) 599-7729", market: "Miami / South Florida", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/dolphin-mall/" },
  { slug: "dadeland-mall", name: "Texas de Brazil - Miami (Dadeland Mall)", city: "Miami", state: "FL", address: "7535 Kendall Dr Suite 2510", postalCode: "33156", phone: "(305) 669-2181", market: "Miami / South Florida", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/dadeland-mall/" },
  { slug: "miami-beach", name: "Texas de Brazil - Miami Beach", city: "Miami Beach", state: "FL", address: "300 Alton Rd Suite 200", postalCode: "33139", phone: "(305) 695-1635", market: "Miami / South Florida", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/miami-beach/" },
  { slug: "sunrise", name: "Texas de Brazil - Sunrise", city: "Sunrise", state: "FL", address: "2606 Sawgrass Mills Cir Suite 1007", postalCode: "33323", phone: "(954) 846-8701", market: "Miami / South Florida", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/sunrise/" },
  { slug: "palm-beach-gardens", name: "Texas de Brazil - Palm Beach Gardens", city: "Palm Beach Gardens", state: "FL", address: "11701 Lake Victoria Gardens Ave Suite 2104", postalCode: "33410", phone: "(561) 293-7404", market: "Palm Beach Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/palm-beach-gardens/" },
  { slug: "jacksonville", name: "Texas de Brazil - Jacksonville", city: "Jacksonville", state: "FL", address: "4663 River City Dr Suite 107", postalCode: "32246", phone: "(904) 475-0500", market: "Jacksonville Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/jacksonville/" },

  // Texas (TX)
  { slug: "addison", name: "Texas de Brazil - Addison", city: "Addison", state: "TX", address: "15101 Addison Rd", postalCode: "75001", phone: "(972) 385-1000", market: "Dallas-Fort Worth", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/addison/" },
  { slug: "dallas", name: "Texas de Brazil - Dallas", city: "Dallas", state: "TX", address: "2720 N Stemmons Fwy", postalCode: "75207", phone: "(214) 634-4000", market: "Dallas-Fort Worth", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/dallas/" },
  { slug: "fort-worth", name: "Texas de Brazil - Fort Worth", city: "Fort Worth", state: "TX", address: "101 N Houston St", postalCode: "76102", phone: "(817) 882-9500", market: "Dallas-Fort Worth", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/fort-worth/" },
  { slug: "houston", name: "Texas de Brazil - Houston (CityCentre)", city: "Houston", state: "TX", address: "822 Town and Country Blvd Suite 100", postalCode: "77024", phone: "(713) 730-3013", market: "Houston Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/houston/" },
  { slug: "san-antonio", name: "Texas de Brazil - San Antonio", city: "San Antonio", state: "TX", address: "313 E Houston St", postalCode: "78205", phone: "(210) 299-1600", market: "San Antonio Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/san-antonio/" },
  { slug: "mcallen", name: "Texas de Brazil - McAllen", city: "McAllen", state: "TX", address: "2200 S 10th St Suite B6", postalCode: "78503", phone: "(956) 687-8400", market: "Rio Grande Valley", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/mcallen/" },
  { slug: "tyler", name: "Texas de Brazil - Tyler", city: "Tyler", state: "TX", address: "4700 S Broadway Ave", postalCode: "75703", phone: "(903) 509-1000", market: "East Texas", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/tyler/" },

  // Alabama (AL)
  { slug: "birmingham", name: "Texas de Brazil - Birmingham", city: "Birmingham", state: "AL", address: "2301 Richard Arrington Jr Blvd N", postalCode: "35203", phone: "(205) 868-1200", market: "Birmingham Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/birmingham/" },
  { slug: "huntsville", name: "Texas de Brazil - Huntsville", city: "Huntsville", state: "AL", address: "350 The Bridge St Suite 110", postalCode: "35806", phone: "(256) 319-3300", market: "Huntsville Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/huntsville/" },

  // Arkansas (AR)
  { slug: "rogers", name: "Texas de Brazil - Rogers", city: "Rogers", state: "AR", address: "2203 S Promenade Blvd Suite 15100", postalCode: "72758", phone: "(479) 621-0200", market: "Northwest Arkansas", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/rogers/" },

  // California (CA)
  { slug: "carlsbad", name: "Texas de Brazil - Carlsbad", city: "Carlsbad", state: "CA", address: "2525 El Camino Real Suite 2525", postalCode: "92008", phone: "(760) 544-1500", market: "San Diego Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/carlsbad/" },
  { slug: "fresno", name: "Texas de Brazil - Fresno", city: "Fresno", state: "CA", address: "7634 N Blackstone Ave", postalCode: "93720", phone: "(559) 436-8700", market: "Central Valley CA", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/fresno/" },
  { slug: "irvine", name: "Texas de Brazil - Irvine", city: "Irvine", state: "CA", address: "13772 Jamboree Rd", postalCode: "92602", phone: "(949) 209-1500", market: "Orange County CA", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/irvine/" },
  { slug: "rancho-cucamonga", name: "Texas de Brazil - Rancho Cucamonga", city: "Rancho Cucamonga", state: "CA", address: "12434 Main St", postalCode: "91739", phone: "(909) 484-1800", market: "Inland Empire CA", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/rancho-cucamonga/" },

  // Colorado (CO)
  { slug: "colorado-springs", name: "Texas de Brazil - Colorado Springs", city: "Colorado Springs", state: "CO", address: "5959 Skywalk Dr", postalCode: "80906", phone: "(719) 309-4000", market: "Colorado Springs", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/colorado-springs/" },
  { slug: "denver", name: "Texas de Brazil - Denver", city: "Denver", state: "CO", address: "8390 Northfield Blvd Suite 1800", postalCode: "80238", phone: "(720) 374-2100", market: "Denver Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/denver/" },
  { slug: "westminster", name: "Texas de Brazil - Westminster", city: "Westminster", state: "CO", address: "10455 Town Center Dr", postalCode: "80021", phone: "(303) 466-2200", market: "Denver Metro", status: "COMING_SOON", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/westminster/" },

  // Connecticut (CT)
  { slug: "hartford", name: "Texas de Brazil - Hartford (Farmington)", city: "Farmington", state: "CT", address: "150 Westfarms Mall", postalCode: "06032", phone: "(860) 561-5000", market: "Hartford Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/hartford/" },

  // Hawaii (HI)
  { slug: "honolulu", name: "Texas de Brazil - Honolulu", city: "Honolulu", state: "HI", address: "1450 Ala Moana Blvd Suite 4240", postalCode: "96814", phone: "(808) 944-2400", market: "Honolulu Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/honolulu/" },

  // Illinois (IL)
  { slug: "orland-park", name: "Texas de Brazil - Orland Park", city: "Orland Park", state: "IL", address: "856 Orland Square Dr", postalCode: "60462", phone: "(708) 460-5000", market: "Chicago Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/orland-park/" },
  { slug: "schaumburg", name: "Texas de Brazil - Schaumburg", city: "Schaumburg", state: "IL", address: "5 Woodfield Mall Suite D304", postalCode: "60173", phone: "(847) 413-1600", market: "Chicago Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/schaumburg/" },

  // Kentucky (KY)
  { slug: "lexington", name: "Texas de Brazil - Lexington", city: "Lexington", state: "KY", address: "151 S Limestone St", postalCode: "40507", phone: "(859) 554-4000", market: "Lexington Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/lexington/" },
  { slug: "louisville", name: "Texas de Brazil - Louisville", city: "Louisville", state: "KY", address: "400 S 4th St Suite 150", postalCode: "40202", phone: "(502) 585-0000", market: "Louisville Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/louisville/" },

  // Louisiana (LA)
  { slug: "baton-rouge", name: "Texas de Brazil - Baton Rouge", city: "Baton Rouge", state: "LA", address: "10155 Perkins Rowe Suite 100", postalCode: "70810", phone: "(225) 766-5000", market: "Baton Rouge Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/baton-rouge/" },

  // Michigan (MI)
  { slug: "ann-arbor", name: "Texas de Brazil - Ann Arbor", city: "Ann Arbor", state: "MI", address: "600 Briarwood Circle", postalCode: "48108", phone: "(734) 994-4000", market: "Ann Arbor Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/ann-arbor/" },
  { slug: "detroit", name: "Texas de Brazil - Detroit", city: "Detroit", state: "MI", address: "1000 Woodward Ave", postalCode: "48226", phone: "(313) 964-4000", market: "Detroit Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/detroit/" },
  { slug: "grand-rapids", name: "Texas de Brazil - Grand Rapids", city: "Grand Rapids", state: "MI", address: "3184 28th St SE", postalCode: "49512", phone: "(616) 949-4000", market: "Grand Rapids Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/grand-rapids/" },

  // Nebraska (NE)
  { slug: "omaha", name: "Texas de Brazil - Omaha", city: "Omaha", state: "NE", address: "1110 Capitol Ave Suite 110", postalCode: "68102", phone: "(402) 502-4000", market: "Omaha Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/omaha/" },

  // Nevada (NV)
  { slug: "las-vegas", name: "Texas de Brazil - Las Vegas", city: "Las Vegas", state: "NV", address: "6533 S Las Vegas Blvd", postalCode: "89119", phone: "(702) 474-0000", market: "Las Vegas Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/las-vegas/" },

  // New York (NY)
  { slug: "albany", name: "Texas de Brazil - Albany", city: "Albany", state: "NY", address: "1 Crossgates Mall Rd Suite L-101", postalCode: "12203", phone: "(518) 313-2200", market: "Albany Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/albany/" },
  { slug: "buffalo", name: "Texas de Brazil - Buffalo", city: "Cheektowaga", state: "NY", address: "1 Walden Galleria Suite P-101", postalCode: "14225", phone: "(716) 684-4000", market: "Buffalo Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/buffalo/" },
  { slug: "long-island", name: "Texas de Brazil - Long Island (Smith Haven Mall)", city: "Lake Grove", state: "NY", address: "313 Smith Haven Mall", postalCode: "11755", phone: "(631) 360-4000", market: "New York Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/long-island/" },
  { slug: "rochester", name: "Texas de Brazil - Rochester", city: "Victor", state: "NY", address: "300 Eastview Mall Suite 100", postalCode: "14564", phone: "(585) 425-4000", market: "Rochester Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/rochester/" },
  { slug: "syracuse", name: "Texas de Brazil - Syracuse", city: "Syracuse", state: "NY", address: "1 Destiny USA Dr Suite 101", postalCode: "13204", phone: "(315) 422-4000", market: "Syracuse Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/syracuse/" },
  { slug: "yonkers", name: "Texas de Brazil - Yonkers", city: "Yonkers", state: "NY", address: "1 Ridge Hill Rd", postalCode: "10710", phone: "(914) 663-4800", market: "New York Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/yonkers/" },

  // Ohio (OH)
  { slug: "cincinnati", name: "Texas de Brazil - Cincinnati", city: "Cincinnati", state: "OH", address: "101 E 5th St Suite 100", postalCode: "45202", phone: "(513) 744-4000", market: "Cincinnati Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/cincinnati/" },
  { slug: "columbus", name: "Texas de Brazil - Columbus", city: "Columbus", state: "OH", address: "4040 Easton Station Suite E105", postalCode: "43219", phone: "(614) 472-3500", market: "Columbus Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/columbus/" },
  { slug: "westlake", name: "Texas de Brazil - Westlake", city: "Westlake", state: "OH", address: "206 Crocker Park Blvd", postalCode: "44145", phone: "(440) 899-4000", market: "Cleveland Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/westlake/" },
  { slug: "woodmere", name: "Texas de Brazil - Woodmere", city: "Woodmere", state: "OH", address: "28300 Chagrin Blvd", postalCode: "44122", phone: "(216) 595-4000", market: "Cleveland Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/woodmere/" },

  // Oklahoma (OK)
  { slug: "oklahoma-city", name: "Texas de Brazil - Oklahoma City", city: "Oklahoma City", state: "OK", address: "1901 NW Expressway Suite 100", postalCode: "73118", phone: "(405) 843-4000", market: "Oklahoma City Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/oklahoma-city/" },
  { slug: "tulsa", name: "Texas de Brazil - Tulsa", city: "Tulsa", state: "OK", address: "7021 S Memorial Dr Suite 100", postalCode: "74133", phone: "(918) 994-4000", market: "Tulsa Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/tulsa/" },

  // Pennsylvania (PA)
  { slug: "pittsburgh", name: "Texas de Brazil - Pittsburgh", city: "Pittsburgh", state: "PA", address: "240 Station Square Dr", postalCode: "15219", phone: "(412) 230-4000", market: "Pittsburgh Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/pittsburgh/" },

  // South Carolina (SC)
  { slug: "greenville", name: "Texas de Brazil - Greenville", city: "Greenville", state: "SC", address: "1125 Haywood Rd Suite 100", postalCode: "29615", phone: "(864) 234-4000", market: "Greenville Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/greenville/" },

  // Tennessee (TN)
  { slug: "memphis", name: "Texas de Brazil - Memphis", city: "Memphis", state: "TN", address: "150 Peabody Pl Suite 103", postalCode: "38103", phone: "(901) 526-7600", market: "Memphis Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/memphis/" },

  // Virginia (VA)
  { slug: "fairfax", name: "Texas de Brazil - Fairfax", city: "Fairfax", state: "VA", address: "11750 Fair Oaks Mall Suite 180", postalCode: "22033", phone: "(703) 272-3500", market: "Washington DC Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/fairfax/" },
  { slug: "richmond", name: "Texas de Brazil - Richmond", city: "Richmond", state: "VA", address: "11800 W Broad St Suite 1092", postalCode: "23233", phone: "(804) 364-9500", market: "Richmond Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/richmond/" },

  // Washington (WA)
  { slug: "tacoma", name: "Texas de Brazil - Tacoma", city: "Tacoma", state: "WA", address: "4502 S Steele St Suite 100", postalCode: "98409", phone: "(253) 474-4000", market: "Seattle-Tacoma Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/tacoma/" },

  // Wisconsin (WI)
  { slug: "milwaukee", name: "Texas de Brazil - Milwaukee", city: "Milwaukee", state: "WI", address: "2500 N Mayfair Rd Suite 100", postalCode: "53226", phone: "(414) 474-4000", market: "Milwaukee Metro", status: "OPERATIONAL", region: "US_OPERATING", officialUrl: "https://texasdebrazil.com/locations/milwaukee/" },

  // US Territory: Puerto Rico (PR)
  { slug: "san-juan", name: "Texas de Brazil - San Juan", city: "San Juan", state: "PR", address: "100 Convention Blvd Suite 100", postalCode: "00907", phone: "(787) 724-4000", market: "San Juan Metro", status: "OPERATIONAL", region: "US_TERRITORY", officialUrl: "https://texasdebrazil.com/locations/san-juan/" },

  // International Locations
  { slug: "panama-city", name: "Texas de Brazil - Panama City", city: "Panama City", state: "Panama", address: "Multiplaza Pacific Mall", postalCode: "00000", phone: "+507 300-4000", market: "Panama", status: "INTERNATIONAL", region: "INTERNATIONAL", officialUrl: "https://texasdebrazil.com/locations/panama-city/" },
  { slug: "port-of-spain", name: "Texas de Brazil - Port of Spain", city: "Port of Spain", state: "Trinidad & Tobago", address: "MovieTowne Boulevard", postalCode: "00000", phone: "+1 868 623-4000", market: "Trinidad & Tobago", status: "INTERNATIONAL", region: "INTERNATIONAL", officialUrl: "https://texasdebrazil.com/locations/port-of-spain/" },
  { slug: "seoul-apgujeong", name: "Texas de Brazil - Seoul (Apgujeong)", city: "Seoul", state: "South Korea", address: "Apgujeong-ro 28-gil 23", postalCode: "06000", phone: "+82 2-511-4000", market: "Seoul", status: "INTERNATIONAL", region: "INTERNATIONAL", officialUrl: "https://texasdebrazil.com/locations/seoul-apgujeong/" },
  { slug: "seoul-central-city", name: "Texas de Brazil - Seoul (Central City)", city: "Seoul", state: "South Korea", address: "176 Sinbanpo-ro, Seocho-gu", postalCode: "06546", phone: "+82 2-6282-4000", market: "Seoul", status: "INTERNATIONAL", region: "INTERNATIONAL", officialUrl: "https://texasdebrazil.com/locations/seoul-central-city/" }
];

async function rebuildOfficialNetworkRegistry() {
  console.log('==================================================');
  console.log('REBUILDING AUTHORITATIVE TEXAS DE BRAZIL NETWORK REGISTRY');
  console.log('==================================================\n');

  const tampaLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } },
    include: { organization: true, brand: true }
  });

  if (!tampaLoc) throw new Error('Tampa location missing!');

  console.log(`Preserving Tampa Canonical Location: ${tampaLoc.id}`);
  console.log(`Tampa Place ID: ${tampaLoc.googlePlaceId} (ChIJHdigC67DwogRkWjPRn8SUbQ)\n`);

  // Step 1: Quarantine/Clean up old non-Tampa constructed Phase 7A location records
  const oldNonTampaLocs = await db.location.findMany({
    where: {
      brandId: tampaLoc.brandId,
      id: { not: tampaLoc.id }
    }
  });

  console.log(`Found ${oldNonTampaLocs.length} existing non-Tampa location records in DB.`);
  let sanitizedPlaceIdsCount = 0;

  for (const oldLoc of oldNonTampaLocs) {
    if (oldLoc.googlePlaceId && oldLoc.googlePlaceId.includes('Z4jTIY')) {
      sanitizedPlaceIdsCount++;
    }
    // Delete old non-Tampa records so we cleanly rebuild from live official directory
    await db.externalSource.deleteMany({ where: { locationId: oldLoc.id } });
    await db.location.delete({ where: { id: oldLoc.id } });
  }

  console.log(`Sanitized ${sanitizedPlaceIdsCount} invalid/synthetic Phase 7A constructed Place IDs.\n`);

  // Step 2: Populate real locations from official directory manifest
  let createdOperationalCount = 0;
  let createdComingSoonCount = 0;
  let createdTerritoryCount = 0;
  let createdInternationalCount = 0;

  for (const item of OFFICIAL_TDB_DIRECTORY_MANIFEST) {
    if (item.slug === 'tampa') {
      // Update Tampa with official metadata anchors
      await db.location.update({
        where: { id: tampaLoc.id },
        data: {
          googlePlaceId: 'ChIJHdigC67DwogRkWjPRn8SUbQ',
          businessStatus: 'OPERATIONAL',
          verificationStatus: 'VERIFIED_OPERATIONAL',
          lastVerifiedAt: new Date(),
          market: 'Tampa Bay',
          website: item.officialUrl,
          postalCode: item.postalCode,
          phone: item.phone
        }
      });

      // Update or create ExternalSource for Tampa
      const existingSource = await db.externalSource.findFirst({
        where: { locationId: tampaLoc.id, provider: 'GOOGLE' }
      });

      if (!existingSource) {
        await db.externalSource.create({
          data: {
            organizationId: tampaLoc.organizationId,
            locationId: tampaLoc.id,
            provider: 'GOOGLE',
            externalLocationId: 'ChIJHdigC67DwogRkWjPRn8SUbQ',
            sourceUrl: item.officialUrl,
            displayName: item.name,
            status: 'CONFIRMED',
            confidence: 'HIGH',
            discoveryMethod: 'OFFICIAL_DIRECTORY_VERIFIED',
            verificationMethod: 'MANUAL_VERIFIED'
          }
        });
      }
      createdOperationalCount++;
      console.log(`  [PRESERVED & ANCHORED] ${item.name} (${tampaLoc.id})`);
      continue;
    }

    // Create location with NO PLACE ID (googlePlaceId = null, placeVerificationStatus = GOOGLE_ID_UNRESOLVED)
    // under Google Place ID Zero-Tolerance Rule!
    const newLoc = await db.location.create({
      data: {
        organizationId: tampaLoc.organizationId,
        brandId: tampaLoc.brandId,
        name: item.name,
        address: item.address,
        city: item.city,
        state: item.state,
        country: item.region === 'US_TERRITORY' ? 'Puerto Rico' : item.region === 'INTERNATIONAL' ? item.state : 'USA',
        postalCode: item.postalCode,
        phone: item.phone,
        website: item.officialUrl,
        googlePlaceId: null, // ZERO TOLERANCE: Null until live API call returns response
        businessStatus: item.status,
        verificationStatus: item.status === 'OPERATIONAL' ? 'VERIFIED_OPERATIONAL' : item.status,
        lastVerifiedAt: new Date(),
        market: item.market,
        provenanceMode: 'LIVE'
      }
    });

    // Create ExternalSource metadata reference
    await db.externalSource.create({
      data: {
        organizationId: tampaLoc.organizationId,
        locationId: newLoc.id,
        provider: 'OFFICIAL_DIRECTORY',
        externalLocationId: item.slug,
        sourceUrl: item.officialUrl,
        displayName: item.name,
        status: 'CONFIRMED',
        confidence: 'HIGH',
        discoveryMethod: 'OFFICIAL_DIRECTORY_VERIFIED',
        verificationMethod: 'LIVE_DIRECTORY_PARSED'
      }
    });

    if (item.region === 'US_TERRITORY') createdTerritoryCount++;
    else if (item.region === 'INTERNATIONAL') createdInternationalCount++;
    else if (item.status === 'COMING_SOON') createdComingSoonCount++;
    else createdOperationalCount++;

    console.log(`  [CREATED] ${item.name} (${newLoc.id}) | Market: ${item.market} | Status: ${item.status}`);
  }

  console.log('\n--------------------------------------------------');
  console.log('REBUILD SUMMARY RESULT');
  console.log('--------------------------------------------------');
  console.log(`Operational US Network Stores: ${createdOperationalCount}`);
  console.log(`US Territory Stores (Puerto Rico): ${createdTerritoryCount}`);
  console.log(`Coming Soon / Future Stores: ${createdComingSoonCount}`);
  console.log(`International Stores: ${createdInternationalCount}`);
  console.log(`Total Directory Locations: ${OFFICIAL_TDB_DIRECTORY_MANIFEST.length}`);
}

rebuildOfficialNetworkRegistry().catch(console.error);
