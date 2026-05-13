const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf16le');
if (content.includes('has-tooltip')) {
    // Attempting to read as utf8 since it was mixed
    content = fs.readFileSync('app/globals.css', 'utf8');
    const goodPart = content.substring(0, content.indexOf('/* Tooltips */')).trim();
    
    const correctCss = `\n
/* Tooltips */
.has-tooltip {
  position: relative;
  cursor: help;
}

.has-tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: pre-wrap;
  width: max-content;
  max-width: 250px;
  text-align: center;
  line-height: 1.4;
  z-index: 9999;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  pointer-events: none;
  animation: tooltipFadeIn 0.2s ease-out forwards;
}

@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
`;
    
    fs.writeFileSync('app/globals.css', goodPart + correctCss, 'utf8');
    console.log("Fixed globals.css");
}
