const fs = require('fs');

// Configuration
const PACKAGES_TO_FETCH = 20; // How many packages to track
const OUTPUT_FILE = 'market_data.json';

// Utility: Delay to be polite to the API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTopPackages() {
    console.log(`🤖 Robot starting... Fetching top ${PACKAGES_TO_FETCH} packages.`);

    try {
        // 1. Get the list of popular packages
        // We use the search endpoint sorted by popularity
        const searchUrl = `https://pub.dev/api/search?page=1&sort=top`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        // Extract just the names
        const packageNames = searchData.packages.map(p => p.package).slice(0, PACKAGES_TO_FETCH);
        console.log(`📋 Found packages: ${packageNames.join(', ')}`);

        const detailedPackages = [];

        // 2. Loop through each package to get details
        for (const name of packageNames) {
            console.log(`Populating data for: ${name}...`);
            
            try {
                const pkgUrl = `https://pub.dev/api/packages/${name}`;
                const pkgResponse = await fetch(pkgUrl);
                const pkgData = await pkgResponse.json();

                const latest = pkgData.latest;
                const likes = pkgData.likes || 0;
                
                // 3. Calculate the "Fundamental Price"
                // Formula: (Likes * 0.15) + Base $10
                // This is the "Real Truth" price the market will correct to
                const basePrice = (likes * 0.15) + 10;

                detailedPackages.push({
                    id: latest.pubspec.name,
                    name: latest.pubspec.name,
                    version: latest.version,
                    desc: latest.pubspec.description || "No description",
                    likes: likes,
                    price: parseFloat(basePrice.toFixed(2)), // The "Official" price
                    lastUpdated: new Date().toISOString()
                });

                // Wait 200ms between requests to avoid spamming pub.dev
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
        console.log(`✅ Success! Data saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Critical Robot Error:", error);
        process.exit(1); // Tell GitHub Actions that we failed
    }
}

// Run the function
fetchTopPackages();