const fs = require('fs');

// Configuration
const PACKAGES_TO_FETCH = 20; 
const OUTPUT_FILE = 'market_data.json';

// Utility: Delay to be polite to the API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTopPackages() {
    console.log(`🤖 Robot starting... Target: ${PACKAGES_TO_FETCH} packages.`);

    try {
        let allPackageNames = [];
        let page = 1;

        // 1. Pagination Loop: Get the list of names
        while (allPackageNames.length < PACKAGES_TO_FETCH) {
            console.log(`🔎 Scanning Page ${page}...`);
            const searchUrl = `https://pub.dev/api/search?page=${page}&sort=top`;
            const searchResponse = await fetch(searchUrl);
            
            if (!searchResponse.ok) break;

            const searchData = await searchResponse.json();
            const namesOnPage = searchData.packages.map(p => p.package);
            
            if (namesOnPage.length === 0) break;

            allPackageNames = allPackageNames.concat(namesOnPage);
            page++;
            await delay(500);
        }

        const finalNames = allPackageNames.slice(0, PACKAGES_TO_FETCH);
        console.log(`📋 Processing details for ${finalNames.length} packages...`);

        const detailedPackages = [];

        // 2. Loop through each package to get details AND METRICS
        for (const name of finalNames) {
            console.log(`Fetching data for: ${name}...`);
            
            try {
                // Call 1: Get Basic Info (Version, Description)
                const pkgUrl = `https://pub.dev/api/packages/${name}`;
                const pkgResponse = await fetch(pkgUrl);
                const pkgData = await pkgResponse.json();

                // Call 2: Get Metrics (Likes, Popularity) << THIS IS THE FIX
                const metricsUrl = `https://pub.dev/api/packages/${name}/metrics`;
                const metricsResponse = await fetch(metricsUrl);
                const metricsData = await metricsResponse.json();

                // Extract Data
                const latest = pkgData.latest;
                // Safely access the like count from the ScoreCard
                const likes = metricsData.score?.likeCount || 0;
                
                // Price Formula: (Likes * 0.15) + Base $10
                const basePrice = (likes * 0.15) + 10;

                detailedPackages.push({
                    id: latest.pubspec.name,
                    name: latest.pubspec.name,
                    version: latest.version,
                    desc: latest.pubspec.description || "No description",
                    likes: likes, // Now using the correct variable
                    price: parseFloat(basePrice.toFixed(2)),
                    lastUpdated: new Date().toISOString()
                });

                await delay(300); // Slightly longer delay for double requests

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
        console.log(`✅ Success! Data saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Critical Robot Error:", error);
        process.exit(1); 
    }
}

fetchTopPackages();
