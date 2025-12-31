/* file: tools/src/js/tools-home.js */
document.addEventListener('DOMContentLoaded', () => { // --- 1. Loading State Management --- // The loader is visible by default in HTML. We fade it out here. const loader = document.getElementById('global-loader'); if (loader) { // Force a slight delay to ensure smooth transition perception // or wait for window 'load' if assets are heavy. setTimeout(() => { loader.style.opacity = '0'; // Remove from DOM flow after transition finishes setTimeout(() => { loader.style.display = 'none'; }, 500); // Matches CSS transition duration usually found in commonstyles }, 300); }
// --- 2. Search Functionality --- const searchInput = document.querySelector('.tool-search'); const mainContainer = document.querySelector('main');
if (searchInput) { const categories = Array.from(document.querySelectorAll('.tool-category')); // Store original index for reset categories.forEach((cat, index) => { cat.dataset.originalIndex = index; });
searchInput.addEventListener('input', (e) => { const rawQuery = e.target.value.toLowerCase().trim(); // Parse category filter (e.g., "category:pdf") let filterCategory = null; let textQuery = rawQuery;
const catMatch = rawQuery.match(/category:\s*(\w+)/); if (catMatch) { filterCategory = catMatch[1]; textQuery = rawQuery.replace(catMatch[0], '').trim(); }
const scores = [];
categories.forEach(section => { const catName = section.dataset.category; const cards = section.querySelectorAll('.tool-card'); let visibleCount = 0; let sectionMatchesCategory = true;
// 1. Check Category Filter if (filterCategory && catName !== filterCategory && !catName.includes(filterCategory)) { sectionMatchesCategory = false; }
// 2. Filter Cards if (sectionMatchesCategory) { cards.forEach(card => { const title = card.querySelector('h3')?.innerText.toLowerCase() || ''; const desc = card.querySelector('p')?.innerText.toLowerCase() || ''; const matchesText = !textQuery || title.includes(textQuery) || desc.includes(textQuery); if (matchesText) { card.style.display = 'flex'; visibleCount++; } else { card.style.display = 'none'; } }); } else { visibleCount = 0; }
// Visibility of Section section.style.display = (visibleCount > 0) ? 'block' : 'none';
scores.push({ section, count: visibleCount, originalIndex: parseInt(section.dataset.originalIndex) }); });
// 3. Sort Sections by Relevance (Visible Count) if (rawQuery) { scores.sort((a, b) => b.count - a.count); } else { // Restore original order if query is empty scores.sort((a, b) => a.originalIndex - b.originalIndex); }
// Re-append in new order scores.forEach(item => { mainContainer.appendChild(item.section); }); }); }});});
