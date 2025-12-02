export function serializeToHTML(editorPages, activeIndex, canvasSize) {
  const page = editorPages[activeIndex];
  
  if (!page) {
    return { html: '', css: '' };
  }

  let html = '';
  let css = '';

  css += `.canvas-container {\n`;
  css += `  position: relative;\n`;
  css += `  width: ${canvasSize.w}px;\n`;
  css += `  height: ${canvasSize.h}px;\n`;
  css += `  background: ${page.background};\n`;
  css += `  overflow: hidden;\n`;
  css += `}\n\n`;

  html += `<div class="canvas-container">\n`;

  page.children.forEach((el, index) => {
    const elementClass = `element-${el.type}-${el.id}`;
    
    if (el.type === 'text') {
      html += `  <div class="${elementClass}">${el.text || 'Text'}</div>\n`;
    } else if (el.type === 'image') {
      html += `  <img class="${elementClass}" src="${el.src || ''}" alt="Image ${index + 1}" />\n`;
    } else {
      html += `  <div class="${elementClass}"></div>\n`;
    }

    css += `.${elementClass} {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${Math.round(el.x || 0)}px;\n`;
    css += `  top: ${Math.round(el.y || 0)}px;\n`;
    switch (el.type) {
      case 'rect':
        css += `  width: ${Math.round(el.width || 100)}px;\n`;
        css += `  height: ${Math.round(el.height || 100)}px;\n`;
        css += `  background: ${el.fill || '#000000'};\n`;
        if (el.cornerRadius) {
          css += `  border-radius: ${el.cornerRadius}px;\n`;
        }
        if (el.stroke) {
          css += `  border: ${el.strokeWidth || 1}px solid ${el.stroke};\n`;
        }
        if (el.shadowBlur) {
          css += `  box-shadow: ${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur}px ${el.shadowColor || 'rgba(0,0,0,0.5)'};\n`;
        }
        break;

      case 'circle':
        const diameter = Math.round((el.radius || 50) * 2);
        css += `  width: ${diameter}px;\n`;
        css += `  height: ${diameter}px;\n`;
        css += `  background: ${el.fill || '#000000'};\n`;
        css += `  border-radius: 50%;\n`;
        if (el.stroke) {
          css += `  border: ${el.strokeWidth || 1}px solid ${el.stroke};\n`;
        }
        break;

      case 'triangle':
        css += `  width: 0;\n`;
        css += `  height: 0;\n`;
        css += `  border-left: ${Math.round((el.radius || 50))}px solid transparent;\n`;
        css += `  border-right: ${Math.round((el.radius || 50))}px solid transparent;\n`;
        css += `  border-bottom: ${Math.round((el.radius || 50) * 1.732)}px solid ${el.fill || '#000000'};\n`;
        break;

      case 'text':
        css += `  font-size: ${el.fontSize || 16}px;\n`;
        css += `  font-family: ${el.fontFamily || 'Arial'};\n`;
        css += `  color: ${el.fill || '#000000'};\n`;
        css += `  font-weight: ${el.fontWeight || 'normal'};\n`;
        css += `  font-style: ${el.fontStyle || 'normal'};\n`;
        css += `  text-decoration: ${el.textDecoration || 'none'};\n`;
        if (el.textTransform) {
          css += `  text-transform: ${el.textTransform};\n`;
        }
        if (el.align) {
          css += `  text-align: ${el.align};\n`;
        }
        if (el.stroke) {
          css += `  -webkit-text-stroke: ${el.strokeWidth || 1}px ${el.stroke};\n`;
        }
        break;

      case 'image':
        css += `  width: ${Math.round(el.width || 100)}px;\n`;
        css += `  height: ${Math.round(el.height || 100)}px;\n`;
        css += `  object-fit: cover;\n`;
        if (el.cornerRadius) {
          css += `  border-radius: ${el.cornerRadius}px;\n`;
        }
        break;

      case 'star':
        css += `  width: ${Math.round((el.outerRadius || 50) * 2)}px;\n`;
        css += `  height: ${Math.round((el.outerRadius || 50) * 2)}px;\n`;
        css += `  background: ${el.fill || '#000000'};\n`;
        css += `  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);\n`;
        break;

      case 'line':
        const lineWidth = el.points && el.points.length >= 4 
          ? Math.abs(el.points[2] - el.points[0]) 
          : 100;
        css += `  width: ${Math.round(lineWidth)}px;\n`;
        css += `  height: ${el.strokeWidth || 2}px;\n`;
        css += `  background: ${el.stroke || '#000000'};\n`;
        break;

      case 'arrow':
        css += `  width: ${Math.round(el.pointerLength || 10)}px;\n`;
        css += `  height: ${Math.round(el.pointerLength || 10)}px;\n`;
        css += `  border-top: ${el.strokeWidth || 2}px solid ${el.stroke || '#000000'};\n`;
        css += `  border-right: ${el.strokeWidth || 2}px solid ${el.stroke || '#000000'};\n`;
        css += `  transform: rotate(45deg);\n`;
        break;

      case 'icon':
        css += `  width: ${Math.round(el.width || 50)}px;\n`;
        css += `  height: ${Math.round(el.height || 50)}px;\n`;
        css += `  color: ${el.fill || '#000000'};\n`;
        css += `  font-size: ${Math.round(el.width || 50)}px;\n`;
        break;

      default:
        css += `  width: ${Math.round(el.width || 100)}px;\n`;
        css += `  height: ${Math.round(el.height || 100)}px;\n`;
        css += `  background: ${el.fill || '#cccccc'};\n`;
    }

    if (el.opacity !== undefined && el.opacity !== 1) {
      css += `  opacity: ${el.opacity};\n`;
    }

    if (el.rotation) {
      css += `  transform: rotate(${Math.round(el.rotation)}deg);\n`;
    }

    if (el.scaleX !== undefined || el.scaleY !== undefined) {
      const scaleX = el.scaleX || 1;
      const scaleY = el.scaleY || 1;
      if (scaleX !== 1 || scaleY !== 1) {
        const existingTransform = el.rotation ? `rotate(${Math.round(el.rotation)}deg) ` : '';
        css += `  transform: ${existingTransform}scale(${scaleX}, ${scaleY});\n`;
      }
    }

    if (el.locked) {
      css += `  pointer-events: none;\n`;
    }

    css += `}\n\n`;
  });

  html += `</div>`;

  return {
    html: html.trim(),
    css: css.trim(),
    pageInfo: {
      pageNumber: activeIndex + 1,
      totalPages: editorPages.length,
      elementCount: page.children.length,
      background: page.background
    }
  };
}

export function logToConsole(serialized) {
  if (!serialized || !serialized.pageInfo) {
    return;
  }
  
  console.clear();
  console.log('%c==============================================', 'color: #FF6B35; font-weight: bold;');
  console.log('%cCANVAS STATE - HTML/CSS OUTPUT', 'color: #FF6B35; font-size: 16px; font-weight: bold;');
  console.log('%c==============================================', 'color: #FF6B35; font-weight: bold;');
  
  console.log('\n%cPage Info:', 'color: #4CAF50; font-weight: bold;');
  console.log(`Page: ${serialized.pageInfo.pageNumber} / ${serialized.pageInfo.totalPages}`);
  console.log(`Elements: ${serialized.pageInfo.elementCount}`);
  console.log(`Background: ${serialized.pageInfo.background}`);
  
  console.log('\n%cHTML:', 'color: #2196F3; font-weight: bold;');
  console.log(serialized.html);
  
  console.log('\n%cCSS:', 'color: #FF9800; font-weight: bold;');
  console.log(serialized.css);
  
  console.log('\n%c==============================================\n', 'color: #FF6B35; font-weight: bold;');
}

