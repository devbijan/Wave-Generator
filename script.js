// DOM Elements
const complexitySlider = document.getElementById("complexity");
const gradientAngleSlider = document.getElementById("gradient-angle");
const colorStartPicker = document.getElementById("color-start");
const colorEndPicker = document.getElementById("color-end");
const colorThemeSelect = document.getElementById("color-theme");
const svgPath = document.querySelector("#wave-container svg path");
const svgFillPath = document.querySelector(".wave-fill");
const svgStrokePath = document.querySelector(".wave-stroke");

let currentType = "smooth";
let colorMode = "gradient";

const colorThemes = {
  graphite: { start: "#3A3A3A", end: "#1F1F1F", angle: 180 },
  ocean: { start: "#0099ff", end: "#0066cc", angle: 180 },
  sunset: { start: "#ff6b6b", end: "#ffd93d", angle: 45 },
  forest: { start: "#28a745", end: "#155d27", angle: 180 },
  candy: { start: "#ff61d8", end: "#7e2ecc", angle: 135 },
  midnight: { start: "#2c3e50", end: "#3498db", angle: 225 },
  volcano: { start: "#ff4b1f", end: "#ff9068", angle: 45 },
  nordic: { start: "#86a8e7", end: "#91eae4", angle: 160 },
};

// Utility function
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generatePoints(type, numPoints) {
  const points = [];
  const width = 1440;
  const height = 320;
  const baseY = height * 0.6;
  const maxAmp = height * 0.3;

  switch (type) {
    case "smooth": {
      const controlPoints = [];
      for (let i = 0; i <= numPoints; i++) {
        controlPoints.push(randomInRange(-maxAmp, maxAmp));
      }
      const segments = width / 10;
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const section = (i / segments) * numPoints;
        const index = Math.floor(section);
        const t = section - index;

        let y;
        if (index >= numPoints) {
          y = controlPoints[numPoints];
        } else {
          const y0 = controlPoints[Math.max(0, index - 1)];
          const y1 = controlPoints[index];
          const y2 = controlPoints[Math.min(numPoints, index + 1)];
          const y3 = controlPoints[Math.min(numPoints, index + 2)];

          const t2 = t * t;
          const t3 = t2 * t;
          y =
            (-0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3) * t3 +
            (y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3) * t2 +
            (-0.5 * y0 + 0.5 * y2) * t +
            y1;
        }
        points.push([x, baseY + y]);
      }
      break;
    }
    case "jagged": {
      const segmentWidth = width / numPoints;
      for (let i = 0; i <= numPoints; i++) {
        const x = i * segmentWidth;
        const y = randomInRange(-maxAmp, maxAmp);
        points.push([x, baseY + y]);
      }
      break;
    }
    case "sharp": {
      const teethWidth = width / numPoints;
      const teethHeight = maxAmp * 0.8;
      for (let i = 0; i <= numPoints; i++) {
        const x = i * teethWidth;
        points.push([x, baseY]);
        if (i < numPoints) {
          const peakX = x + teethWidth / 2;
          const peakY = baseY - teethHeight;
          points.push([peakX, peakY]);
        }
      }
      break;
    }
    case "steps": {
      const stepWidth = width / numPoints;
      let currentX = 0;
      let currentY = baseY;
      points.push([0, baseY]);
      for (let i = 0; i < numPoints; i++) {
        currentX += stepWidth;
        currentY = baseY - randomInRange(-maxAmp, maxAmp);
        points.push([currentX, points[points.length - 1][1]]);
        points.push([currentX, currentY]);
      }
      break;
    }
    case "arc": {
      /**
       * We’ll interpret “complexity” (3–20) as controlling arc height:
       *   - Minimal complexity (3) -> a small arc
       *   - Max complexity (20) -> a tall arc
       *
       * The factor below can be adjusted to taste.
       * We'll map complexity => arcHeight between 0 and ~height*0.6
       */
      const arcHeight = (numPoints / 20) * (height * 0.6);

      // The number of segments to build the arc path
      // (Doesn’t need to match numPoints exactly;
      //  we can just pick something fairly smooth like 50–80 steps)
      const segments = 60;

      for (let i = 0; i <= segments; i++) {
        // t goes from 0 (left) to 1 (right)
        const t = i / segments;

        // x goes from 0 to width
        const x = t * width;

        // Use a half-sine wave:
        //  y = baseY - arcHeight * sin(π * t)
        // so at t=0 or t=1 => sin(0 or π)=0 => y=baseY
        // at t=0.5        => sin(π/2)=1 => y=baseY - arcHeight (peak)
        const y = baseY - arcHeight * Math.sin(Math.PI * t);
        points.push([x, y]);
      }
      break;
    }

    default:
      break;
  }
  return points;
}
function generatePaths(type, complexity) {
  const points = generatePoints(type, parseInt(complexity));

  // ===== Fill Path =====
  let fillPath = `M0,320`;

  // ===== Stroke Path =====
  let strokePath = `M${points[0][0]},${points[0][1]}`;

  if (type === "smooth") {
    // First, move to the initial point
    fillPath += ` L${points[0][0]},${points[0][1]}`;

    // For cubic curves, we need to calculate control points
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points using tension
      const tension = 0.1; // Adjust this value between 0 and 1 to control curve smoothness

      // First control point
      const cp1x =
        current[0] + (next[0] - points[Math.max(0, i - 1)][0]) * tension;
      const cp1y =
        current[1] + (next[1] - points[Math.max(0, i - 1)][1]) * tension;

      // Second control point
      const cp2x =
        next[0] -
        (points[Math.min(points.length - 1, i + 2)][0] - current[0]) * tension;
      const cp2y =
        next[1] -
        (points[Math.min(points.length - 1, i + 2)][1] - current[1]) * tension;

      // Add cubic Bézier curve command
      const cubicCommand = ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${next[0]},${next[1]}`;
      fillPath += cubicCommand;
      strokePath += cubicCommand;
    }
  } else {
    // For non-smooth types (sharp, jagged, steps)
    fillPath += ` L${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      fillPath += ` L${points[i][0]},${points[i][1]}`;
      strokePath += ` L${points[i][0]},${points[i][1]}`;
    }
  }

  // Complete the fill path by returning to bottom-right and closing
  fillPath += ` L1440,320 Z`;

  return { fillPath, strokePath };
}
function setupInputs() {
  const complexityInput = document.getElementById("complexity-value");
  const gradientAngleInput = document.getElementById("gradient-angle-value");

  // Complexity range and number input
  complexitySlider.addEventListener("input", function () {
    complexityInput.value = this.value;
    updateWave();
  });
  complexityInput.addEventListener("input", function () {
    const value = Math.min(
      Math.max(parseInt(this.value) || 0, this.min),
      this.max
    );
    this.value = value;
    complexitySlider.value = value;
    updateWave();
  });

  // Gradient angle range and number input
  gradientAngleSlider.addEventListener("input", function () {
    gradientAngleInput.value = this.value;
    updateGradient();
  });
  gradientAngleInput.addEventListener("input", function () {
    const value = Math.min(
      Math.max(parseInt(this.value) || 0, this.min),
      this.max
    );
    this.value = value;
    gradientAngleSlider.value = value;
    updateGradient();
  });

  // Color pickers
  colorStartPicker.addEventListener("input", updateGradient);
  colorEndPicker.addEventListener("input", updateGradient);
}
function setColorMode(mode) {
  colorMode = mode;
  const solidColorControls = document.querySelector(".solid-color-controls");
  const gradientControls = document.querySelector(".gradient-controls");

  if (mode === "solid") {
    solidColorControls.style.display = "block";
    gradientControls.style.display = "none";
    updateSolidColor();
  } else {
    solidColorControls.style.display = "none";
    gradientControls.style.display = "block";
    updateGradient();
  }
}
function updateSolidColor() {
  const color = document.getElementById("solid-color").value;
  // Only the fill path
  svgFillPath.style.fill = color;

  // Make sure the stroke path doesn't get the fill
  svgStrokePath.style.fill = "none";

  updateSVGCode();
}
function updateStroke() {
  const strokeColor = document.getElementById("stroke-color").value;
  const strokeWidth = parseInt(
    document.getElementById("stroke-width").value,
    10
  );

  // wave-stroke <path> reference
  svgStrokePath.style.stroke = strokeColor;
  svgStrokePath.style.strokeWidth = strokeWidth;

  // Also mirror the numeric display if you like
  document.getElementById("stroke-width-value").value = strokeWidth;

  updateSVGCode(); // if you’re updating code preview, etc.
}
function updateGradient() {
  // if user is on solid mode
  if (colorMode === "solid") {
    updateSolidColor();
    return;
  }

  // otherwise, gradient logic
  const gradient = document.getElementById("wave-gradient");
  const angle = parseInt(gradientAngleSlider.value);
  const rad = (angle - 90) * (Math.PI / 180);
  const x2 = 50 + 50 * Math.cos(rad) + "%";
  const y2 = 50 + 50 * Math.sin(rad) + "%";

  gradient.setAttribute("x2", x2);
  gradient.setAttribute("y2", y2);

  // Update the stops directly
  const startStop = gradient.querySelector("stop:first-child");
  const endStop = gradient.querySelector("stop:last-child");

  startStop.setAttribute("stop-color", colorStartPicker.value);
  endStop.setAttribute("stop-color", colorEndPicker.value);

  // Remove class names from stops if they exist
  startStop.removeAttribute("class");
  endStop.removeAttribute("class");

  svgFillPath.style.fill = "url(#wave-gradient)";
  svgFillPath.setAttribute("fill", "url(#wave-gradient)");

  // Ensure the stroke path has fill=none
  svgStrokePath.style.fill = "none";
  svgStrokePath.setAttribute("fill", "none");

  updateSVGCode();
}
function updateColorTheme() {
  const theme = colorThemeSelect.value;
  if (theme !== "custom") {
    const colors = colorThemes[theme];
    colorStartPicker.value = colors.start;
    colorEndPicker.value = colors.end;
    gradientAngleSlider.value = colors.angle;
    document.getElementById("gradient-angle-value").value = colors.angle;
  }
  updateGradient();
}
function updateWave() {
  const { fillPath, strokePath } = generatePaths(
    currentType,
    complexitySlider.value
  );

  // Update the <path> with class="wave-fill"
  svgFillPath.setAttribute("d", fillPath);

  // Update the <path> with class="wave-stroke"
  svgStrokePath.setAttribute("d", strokePath);

  updateGradient();
  updateSVGCode();
}
function setWaveType(type) {
  currentType = type;
  updateWave();
}
function randomizeWaveType() {
  const types = ["smooth", "sharp", "steps", "jagged"];
  currentType = types[Math.floor(Math.random() * types.length)];
  updateWave();
}
function randomizeComplexity() {
  const value = Math.floor(Math.random() * 15) + 5;
  complexitySlider.value = value;
  document.getElementById("complexity-value").value = value;
  updateWave();
}
function randomizeColors() {
  // If in gradient mode
  if (colorMode === "gradient") {
    colorStartPicker.value =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    colorEndPicker.value =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    const angle = Math.floor(Math.random() * 360);
    gradientAngleSlider.value = angle;
    document.getElementById("gradient-angle-value").value = angle;
    colorThemeSelect.value = "custom";
    updateGradient();
  } else {
    // If in solid mode, randomize the solid color
    const solidColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    document.getElementById("solid-color").value = solidColor;
    updateSolidColor();
  }
}
function randomizeAll() {
  randomizeWaveType();
  randomizeComplexity();
  randomizeColors();
}
function resetTheme() {
  // Just an example: reset to default "custom" gradient
  colorMode = "gradient";
  document.querySelector(".solid-color-controls").style.display = "none";
  document.querySelector(".gradient-controls").style.display = "block";

  colorThemeSelect.value = "graphite";

  colorStartPicker.value = "#3A3A3A";
  colorEndPicker.value = "#1F1F1F";
  gradientAngleSlider.value = 180;
  document.getElementById("gradient-angle-value").value = 180;

  svgPath.style.stroke = "#000000";
  svgPath.style.strokeWidth = "2";
  document.getElementById("stroke-color").value = "#000000";
  document.getElementById("stroke-width").value = 2;
  document.getElementById("stroke-width-value").textContent = "2";

  updateWave();
}
// Helper function to prepare clean SVG code
function prepareCleanSVG() {
  const svgElement = document.querySelector("#wave-container svg");

  const exportSvg = svgElement.cloneNode(true);
  const exportFillPath = exportSvg.querySelector(".wave-fill");
  const exportStrokePath = exportSvg.querySelector(".wave-stroke");
  const gradient = exportSvg.querySelector("#wave-gradient");

  // Remove class names and styles
  exportFillPath.removeAttribute("class");
  exportStrokePath.removeAttribute("class");
  exportFillPath.removeAttribute("style");
  exportStrokePath.removeAttribute("style");

  const startStop = gradient.querySelector("stop:first-child");
  const endStop = gradient.querySelector("stop:last-child");
  startStop.removeAttribute("class");
  endStop.removeAttribute("class");

  if (colorMode === "gradient") {
    startStop.setAttribute("stop-color", colorStartPicker.value);
    endStop.setAttribute("stop-color", colorEndPicker.value);
    exportFillPath.setAttribute("fill", "url(#wave-gradient)");
  } else {
    const solidColor = document.getElementById("solid-color").value;
    exportFillPath.setAttribute("fill", solidColor);
  }

  const strokeColor = document.getElementById("stroke-color").value;
  const strokeWidth = document.getElementById("stroke-width").value;
  exportStrokePath.setAttribute("stroke", strokeColor);
  exportStrokePath.setAttribute("stroke-width", strokeWidth);
  exportStrokePath.setAttribute("fill", "none");

  let cleanSvg = exportSvg.outerHTML
    .replace(/><\/path>/g, "/>")
    .replace(/><\/stop>/g, "/>")
    .replace(/\n\s+/g, "\n  ")
    .replace(/class="[^"]*"/g, "")
    .replace(/style="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s\/>/g, "/>")
    .trim();

  return cleanSvg;
}

function createHighlightedElement(type, content) {
  const span = document.createElement("span");
  span.className = type;
  span.textContent = content;
  return span;
}

function createTruncatedValue(value) {
  if (value.length <= 100) {
    return createHighlightedElement("value", value);
  }

  const span = document.createElement("span");
  span.className = "value truncated-value";
  span.textContent = value.substring(0, 97) + "...";
  span.setAttribute("data-full", value);
  span.setAttribute("role", "button");
  span.setAttribute("tabindex", "0");
  span.setAttribute("aria-expanded", "false");
  span.setAttribute("aria-label", "Expandable code value");

  span.onclick = function () {
    const isExpanded = this.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      this.textContent = value.substring(0, 97) + "...";
      this.setAttribute("aria-expanded", "false");
    } else {
      this.textContent = value;
      this.setAttribute("aria-expanded", "true");
    }
  };

  span.onkeydown = function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.click();
    }
  };

  return span;
}

// Updated syntax highlighting with truncation
function updateSVGCode() {
  const cleanSvg = prepareCleanSVG();
  const codeElement = document.getElementById("svg-code");

  // Clear existing content
  codeElement.innerHTML = "";

  // Create a container for the highlighted code
  const container = document.createElement("code");

  // Split the SVG code into tokens
  const tokens = cleanSvg.split(/(<[^>]+>|<!--[^-]*-->)/);

  tokens.forEach((token) => {
    if (!token) return; // Skip empty tokens

    if (token.startsWith("<!--")) {
      // Comment
      container.appendChild(createHighlightedElement("comment", token));
    } else if (token.startsWith("<")) {
      // Tag
      const parts = token.match(/(<\/?[^\s>]+)|(\s+[^\s=]+="[^"]*")/g) || [
        token,
      ];

      parts.forEach((part) => {
        if (part.startsWith("<")) {
          // Tag name
          container.appendChild(createHighlightedElement("tag", part));
        } else {
          // Attribute
          const [attrName, attrValue] = part.trim().split('="');
          container.appendChild(document.createTextNode(" "));
          container.appendChild(createHighlightedElement("attr", attrName));
          container.appendChild(document.createTextNode('="'));
          // Use truncation for attribute values
          container.appendChild(createTruncatedValue(attrValue.slice(0, -1)));
          container.appendChild(document.createTextNode('"'));
        }
      });
    } else {
      // Text content
      container.appendChild(document.createTextNode(token));
    }
  });

  codeElement.appendChild(container);
}

function copySVGCode() {
  const cleanSvg = prepareCleanSVG();
  const copyButton = document.querySelector(".copy-button");

  navigator.clipboard
    .writeText(cleanSvg)
    .then(() => {
      const originalText = copyButton.innerHTML;
      copyButton.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
      setTimeout(() => {
        copyButton.innerHTML = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
}
function expandValue(element) {
  const isExpanded = element.getAttribute("aria-expanded") === "true";
  const fullValue = element.getAttribute("data-full");

  if (isExpanded) {
    element.textContent = fullValue.substring(0, 97) + "...";
    element.setAttribute("aria-expanded", "false");
  } else {
    element.textContent = fullValue;
    element.setAttribute("aria-expanded", "true");
  }
}
function tokenizeSVG(code) {
  const tokens = [];
  let current = 0;

  while (current < code.length) {
    let char = code[current];

    // Handle tags
    if (char === "&" && code.substr(current, 4) === "&lt;") {
      let tagMatch = code.substr(current).match(/&lt;(\/?[a-zA-Z0-9-]+)/);
      if (tagMatch) {
        tokens.push({
          type: "tag",
          content: code.substr(current, tagMatch[0].length),
        });
        current += tagMatch[0].length;
        continue;
      }
    }

    // Handle attributes and their values
    let attrMatch = code.substr(current).match(/\s([a-zA-Z0-9-]+)="([^"]*)"/);
    if (attrMatch) {
      const [fullMatch, name, value] = attrMatch;
      if (name === "class") {
        tokens.push({
          type: "text",
          content: fullMatch,
        });
      } else {
        tokens.push({
          type: "attr",
          name,
          content: ` ${name}`,
          value: `="${value}"`,
        });
      }
      current += fullMatch.length;
      continue;
    }

    // Handle comments
    if (
      char === "&" &&
      code.substr(current, 4) === "&lt;" &&
      code.substr(current, 7) === "&lt;!--"
    ) {
      let endComment = code.indexOf("--&gt;", current);
      if (endComment !== -1) {
        tokens.push({
          type: "comment",
          content: code.substring(current, endComment + 6),
        });
        current = endComment + 6;
        continue;
      }
    }

    // Handle other characters
    tokens.push({
      type: "text",
      content: char,
    });
    current++;
  }

  return tokens;
}
function handleValue(value) {
  if (value.length > 100) {
    const truncated = value.substring(0, 97) + "...";
    return `<span class="value truncated-value"
            data-full="${value}"
            onclick="expandValue(this)"
            role="button"
            tabindex="0"
            aria-expanded="false"
            aria-label="Expandable code value. Click to show full content"
            onkeydown="if(event.key==='Enter'||event.key===' '){expandValue(this);event.preventDefault()}">${truncated}</span>`;
  }
  return `<span class="value">${value}</span>`;
}
function toggleCodeVisibility() {
  const codeHeader = document.getElementById("code-header");
  const codeContent = document.getElementById("code-content");
  const isExpanded = codeContent.classList.contains("visible");

  codeContent.classList.toggle("visible");
  codeHeader.classList.toggle("expanded");
  codeHeader.setAttribute("aria-expanded", !isExpanded);
}
function toggleControlSection(header) {
  const content = header.nextElementSibling;
  const isExpanded = content.classList.contains("visible");

  content.classList.toggle("visible");
  header.classList.toggle("expanded");
  header.setAttribute("aria-expanded", String(!isExpanded));
  content.setAttribute("aria-hidden", String(isExpanded));

  const focusableElements = content.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (!isExpanded) {
    // Panel is expanding
    focusableElements.forEach((el) => {
      el.removeAttribute("tabindex");
      el.removeAttribute("aria-hidden");
    });
  } else {
    // Panel is collapsing
    focusableElements.forEach((el) => {
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
    });
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const strokeRange = document.getElementById("stroke-width");
  const strokeNumber = document.getElementById("stroke-width-value");
  setupInputs();
  updateColorTheme();
  updateWave();

  strokeRange.addEventListener("input", function () {
    strokeNumber.value = this.value;
    updateStroke();
  });

  strokeNumber.addEventListener("input", function () {
    let value = parseInt(this.value, 10);
    // Validate user input
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > 15) value = 15;

    strokeRange.value = value;
    updateStroke();
  });

  const codeHeader = document.getElementById("code-header");
  codeHeader.addEventListener("click", (e) => {
    if (!e.target.closest(".copy-button")) {
      toggleCodeVisibility();
    }
  });

  // Avoid toggling code if we click the copy button
  const copyButton = document.querySelector(".copy-button");
  copyButton.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Setup collapsible control sections
  const controlHeaders = document.querySelectorAll(".control-header");
  controlHeaders.forEach((header) => {
    // Start expanded
    header.classList.add("expanded");
    header.setAttribute("aria-expanded", "true");

    header.addEventListener("click", () => toggleControlSection(header));
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleControlSection(header);
      }
    });
  });
});
