/**
 * Geometry utility for spatial calculations
 */

export function getBoundingBox(element) {
  console.log(`📐 [GEOMETRY UTIL] getBoundingBox called for: ${element.id || 'unnamed'}`);
  console.log(`  ↳ Element type: ${element.type}`);
  
  const x = element.x || 0;
  const y = element.y || 0;
  let width = element.width || 100;
  let height = element.height || 50;
  
  // Special handling for text elements
  if (element.type === 'text') {
    const fontSize = element.fontSize || 16;
    const text = element.text || 'Text';
    // Rough estimate: 0.6 * fontSize per character
    width = Math.max(width, text.length * fontSize * 0.6);
    height = Math.max(height, fontSize * 1.2);
    console.log(`  ↳ Text element detected, estimated dimensions`);
  }
  
  const box = {
    x1: x,
    y1: y,
    x2: x + width,
    y2: y + height,
    width,
    height
  };
  
  console.log(`  ↳ Bounding box: {x: ${x}, y: ${y}, w: ${width.toFixed(1)}, h: ${height.toFixed(1)}}`);
  
  return box;
}

export function intersects(box1, box2) {
  console.log(`🔍 [GEOMETRY UTIL] intersects called`);
  console.log(`  ↳ Box 1: [${box1.x1},${box1.y1}] to [${box1.x2},${box1.y2}]`);
  console.log(`  ↳ Box 2: [${box2.x1},${box2.y1}] to [${box2.x2},${box2.y2}]`);
  
  const result = !(
    box1.x2 < box2.x1 ||
    box1.x1 > box2.x2 ||
    box1.y2 < box2.y1 ||
    box1.y1 > box2.y2
  );
  
  console.log(`  ↳ Intersects? ${result}`);
  return result;
}

export function isInSafeZone(element, safeZones, canvasHeight) {
  console.log(`🛡️ [GEOMETRY UTIL] isInSafeZone called for: ${element.id || 'unnamed'}`);
  console.log(`  ↳ Safe zones: ${JSON.stringify(safeZones)}, Canvas height: ${canvasHeight}`);
  
  const box = getBoundingBox(element);
  
  if (box.y1 < safeZones.topClear) {
    const distance = safeZones.topClear - box.y1;
    console.log(`  ⚠️ In TOP safe zone! Distance: ${distance}px`);
    return { safe: false, zone: 'top', distance };
  }
  
  if (box.y2 > canvasHeight - safeZones.bottomClear) {
    const distance = box.y2 - (canvasHeight - safeZones.bottomClear);
    console.log(`  ⚠️ In BOTTOM safe zone! Distance: ${distance}px`);
    return { safe: false, zone: 'bottom', distance };
  }
  
  console.log(`  ✅ Element is in safe zone`);
  return { safe: true };
}
