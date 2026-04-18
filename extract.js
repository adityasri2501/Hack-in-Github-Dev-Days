const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    fs.writeFileSync('style.css', styleMatch[1].trim());
}

const scriptMatch = html.match(/<script>\s*\/\*\*[\s\S]*?<\/script>/); // Match the main script
if (scriptMatch) {
    const jsContent = scriptMatch[0].replace(/<script>/, '').replace(/<\/script>$/, '').trim();
    fs.writeFileSync('script.js', jsContent);
}

// Now replace them in the HTML
let newHtml = html;
newHtml = newHtml.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="style.css">');
newHtml = newHtml.replace(/<script>\s*\/\*\*[\s\S]*?<\/script>/, '<script src="script.js"><\/script>');

fs.writeFileSync('index.html', newHtml);
console.log('Extraction complete');
