const fs = require('fs');

// Configuration
const PACKAGES_TO_FETCH = 20; // Changed to 20, works for up to 50 easily
const OUTPUT_FILE = 'market_data.json';

// Utility: Delay to be polite to the API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTopPackages() {
    console.log(`🤖 Robot starting... Target: ${PACKAGES_TO_FETCH} packages.`);

    try {
        let allPackageNames = [];
        let page = 1;

        // 1. Pagination Loop: Keep fetching pages until we have enough names
        while (allPackageNames.length < PACKAGES_TO_FETCH) {
            console.log(`🔎 Scanning Page ${page}...`);
            
            const searchUrl = `https://pub.dev/api/search?page=${page}&sort=top`;
            const searchResponse = await fetch(searchUrl);
            
            if (!searchResponse.ok) {
                console.warn(`⚠️ Warning: Failed to fetch page ${page}`);
                break;
            }

            const searchData = await searchResponse.json();
            
            // Collect names from this page
            const namesOnPage = searchData.packages.map(p => p.package);
            
            if (namesOnPage.length === 0) {
                console.log("No more packages found.");
                break;
            }

            allPackageNames = allPackageNames.concat(namesOnPage);
            
            // Move to next page for next loop
            page++;
            
            // Polite delay between search pages
            await delay(500);
        }

        // Trim the list to exactly the number we want (e.g., if we fetched 30 but want 20)
        const finalNames = allPackageNames.slice(0, PACKAGES_TO_FETCH);
        console.log(`📋 Final List (${finalNames.length}): ${finalNames.join(', ')}`);

        const detailedPackages = [];

        // 2. Loop through each package to get details (Same as before)
        for (const name of finalNames) {
            console.log(`Populating data for: ${name}...`);
            
            try {
                const pkgUrl = `https://pub.dev/api/packages/${name}`;
                const pkgResponse = await fetch(pkgUrl);
                
                if (!pkgResponse.ok) throw new Error(`HTTP ${pkgResponse.status}`);
                
                const pkgData = await pkgResponse.json();

                const latest = pkgData.latest;
                const likes = pkgData.likes || 0;
                
                // 3. Calculate the "Fundamental Price"
                const basePrice = (likes * 0.15) + 10;

                detailedPackages.push({
                    id: latest.pubspec.name,
                    name: latest.pubspec.name,
                    version: latest.version,
                    desc: latest.pubspec.description || "No description",
                    likes: likes,
                    price: parseFloat(basePrice.toFixed(2)),
                    lastUpdated: new Date().toISOString()
                });

                await delay(200);

            } catch (err) {
                console.error(`Failed to fetch details for ${name}:`, err.message);
            }
        }

        // 3. Save to file
        const output = {
            timestamp: new Date().toISOString(),
            status: "active",
            data: detailedPackages
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`✅ Success! Saved ${detailedPackages.length} packages to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Critical Robot Error:", error);
        process.exit(1); 
    }
}

// Run the function
fetchTopPackages();
