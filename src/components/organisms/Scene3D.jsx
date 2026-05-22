import React, { useMemo, useState } from 'react';
import { Text3D, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { createIconShape } from '../../utils/svgIcons';
import { createContourBaseShape } from '../../utils/contourUtils';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';

const SCALE = 0.05;

// Taban plakası için kavisli dikdörtgen şablonu (Saat yönünün tersine çizilmeli)
const createRoundedRectShape = (width, depth, radius, holeConfig) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  // Delik (Hole) ekleme
  if (holeConfig) {
    const holePath = new THREE.Path();
    holePath.absarc(holeConfig.x, holeConfig.y, holeConfig.r, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  
  return shape;
};

// Damla (Teardrop) şablonu
const createTeardropShape = (width, depth, isLeft, holeConfig) => {
  const shape = new THREE.Shape();
  
  const rMain = depth / 2;
  const rSmall = holeConfig ? holeConfig.r + 4.5 : depth / 3;

  const cxLeft = -width / 2 + (isLeft ? rSmall : rMain);
  const cxRight = width / 2 - (isLeft ? rMain : rSmall);

  const rLeft = isLeft ? rSmall : rMain;
  const rRight = isLeft ? rMain : rSmall;

  const d = cxRight - cxLeft;
  
  // Teğet açıları
  const theta = Math.asin((rMain - rSmall) / d); 
  const angleLeft = isLeft ? theta : -theta;
  const angleRight = isLeft ? theta : -theta;

  // Saat yönünün tersine (CCW) çizim:
  shape.absarc(cxRight, 0, rRight, -Math.PI/2 + angleRight, Math.PI/2 - angleRight, false);
  shape.lineTo(cxLeft - rLeft * Math.sin(angleLeft), rLeft * Math.cos(angleLeft));
  shape.absarc(cxLeft, 0, rLeft, Math.PI/2 + angleLeft, Math.PI*1.5 - angleLeft, false);
  shape.lineTo(cxRight + rRight * Math.sin(angleRight), -rRight * Math.cos(angleRight));

  // Delik (Hole)
  if (holeConfig) {
    const holePath = new THREE.Path();
    holePath.absarc(holeConfig.x, holeConfig.y, holeConfig.r, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  
  return shape;
};

// Kalp taban şekli - Three.js resmi kalp formülü (kanıtlanmış bezier eğrileri)
const createHeartBaseShape = (width, depth, holeConfig) => {
  // Önce birim kalp çiz, sonra ölçekle
  const raw = new THREE.Shape();
  
  // Three.js official heart (origin offset: x+5, y+5 based)
  raw.moveTo(5, 5);
  raw.bezierCurveTo(5, 5, 4, 0, 0, 0);
  raw.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  raw.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  raw.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  raw.bezierCurveTo(16, 7, 16, 0, 10, 0);
  raw.bezierCurveTo(7, 0, 5, 5, 5, 5);
  
  // Bu kalbin bounding box'ı: x: -6..16 (w=22), y: 0..19 (h=19)
  // Merkez: x=5, y=9.5
  const rawW = 22;
  const rawH = 19;
  const rawCx = 5;   // merkez x
  const rawCy = 9.5; // merkez y
  
  // Hedef boyut: yazıyı rahatça içine alsın
  const targetSize = Math.max(width, depth) * 0.9;
  const scaleX = targetSize / rawW;
  const scaleY = targetSize / rawH;
  const uniformScale = Math.max(scaleX, scaleY);
  
  // Yeni centered + scaled shape oluştur
  const shape = new THREE.Shape();
  const pts = raw.getPoints(64);
  
  for (let i = 0; i < pts.length; i++) {
    const px = (pts[i].x - rawCx) * uniformScale;
    const py = -(pts[i].y - rawCy) * uniformScale; // Y ters çevir: tepeler yukarı, sivri uç aşağı
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  
  // Delik: iki tepe arasındaki çukura (üst orta)
  if (holeConfig) {
    const holePath = new THREE.Path();
    // Çukur noktası: raw (5, 5) -> flipped: (0, +(9.5-5)*scale) = üst orta
    const holeY = (rawCy - 5) * uniformScale;
    holePath.absarc(0, holeY, holeConfig.r, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  
  return shape;
};

// Daire taban şekli - Daha yüksek hassasiyet
const createCircleBaseShape = (width, depth, holeConfig) => {
  const shape = new THREE.Shape();
  const radius = Math.max(width, depth) / 2;
  // absarc(x, y, radius, startAngle, endAngle, clockwise)
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  
  if (holeConfig) {
    const holePath = new THREE.Path();
    holePath.absarc(holeConfig.x, holeConfig.y, holeConfig.r, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  return shape;
};

// Ev (House) taban şekli - Hassas parametrik çizim (Saçaklar ve baca ile)
const createHouseBaseShape = (width, depth, holeConfig, inset = 0) => {
  const shape = new THREE.Shape();
  const w = width;
  const d = depth;
  
  // Evin sınırları (CCW yönünde)
  const wallLeft = -w * 0.4 + inset;
  const wallRight = w * 0.4 - inset;
  const bottom = -d * 0.45 + inset;
  const wallTop = d * 0.05 + inset;
  
  // Saçak kısımları için inset ötelemeleri
  const overhangTipLeft = -w * 0.48 + inset * 1.2;
  const overhangTipRight = w * 0.48 - inset * 1.2;
  const overhangBottomY = d * 0.09 + inset;
  
  // Çatı zirvesi (peak)
  const peakY = d * 0.46 - inset * 1.4;
  const peakX = 0;
  
  // Baca koordinatları (Sağ tarafta)
  const chimneyLeft = w * 0.18 + inset;
  const chimneyRight = w * 0.36 - inset;
  const chimneyTop = d * 0.42 - inset;
  
  // Çatı eğim çizgisi formülü: y = peakY + slope * x
  // peak'ten sağ saçak ucuna eğim (slope):
  // m = (overhangBottomY - peakY) / (overhangTipRight - peakX)
  const slope = (overhangBottomY - peakY) / (overhangTipRight - peakX);
  const getRoofY = (x) => peakY + slope * x;
  
  const chimneyLeftRoofY = getRoofY(chimneyLeft);
  const chimneyRightRoofY = getRoofY(chimneyRight);
  
  // Orijinal referans değerleri (Saçak alt çizgisi için sabit orantı)
  const wallRightOriginal = w * 0.4;
  const wallTopOriginal = d * 0.05;
  
  // Çizim başlangıcı: Sol alt köşe
  shape.moveTo(wallLeft, bottom);
  // 1. Sağ alt köşe
  shape.lineTo(wallRight, bottom);
  // 2. Sağ duvar üstü (saçak altı)
  shape.lineTo(wallRight, wallTop);
  // 3. Sağ saçak alt çizgisi
  shape.lineTo(wallRightOriginal * 1.05 - inset * 1.1, wallTopOriginal + d * 0.02 + inset);
  // 4. Sağ saçak ucu
  shape.lineTo(overhangTipRight, overhangBottomY);
  // 5. Baca sağ birleşim yerine kadar çatı eğimi
  shape.lineTo(chimneyRight, chimneyRightRoofY);
  // 6. Baca sağ kenarı yukarı
  shape.lineTo(chimneyRight, chimneyTop);
  // 7. Baca üstü yatay
  shape.lineTo(chimneyLeft, chimneyTop);
  // 8. Baca sol kenarı aşağı çatı çizgisine
  shape.lineTo(chimneyLeft, chimneyLeftRoofY);
  // 9. Çatı zirvesi (peak)
  shape.lineTo(peakX, peakY);
  // 10. Sol çatı eğimi sol saçak ucuna
  shape.lineTo(overhangTipLeft, overhangBottomY);
  // 11. Sol saçak alt çizgisi
  shape.lineTo(-wallRightOriginal * 1.05 + inset * 1.1, wallTopOriginal + d * 0.02 + inset);
  // 12. Sol duvar üstü (saçak altı)
  shape.lineTo(wallLeft, wallTop);
  
  shape.closePath();
  
  // Delik (Hole)
  if (holeConfig) {
    const holePath = new THREE.Path();
    holePath.absarc(holeConfig.x, holeConfig.y, holeConfig.r, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  
  return shape;
};

export const Scene3D = ({
  text,
  subText,
  midText,
  phoneText,
  fontFamily,
  iconTopType,
  iconBottomType,
  customSvgUrl,
  iconPosition,
  isItalic,
  textDepth,
  groupRef,
  materialColor,
  baseColor,
  handleColor,
  baseShape: selectedShape,
  textScaleMain,
  textScaleMid,
  textScaleSub,
  hasDivider,
  textOffset,
  autoCenter,
  baseHeight,
  targetWidth,
  iconScale: customIconScale = 100,
  isMirrored = true,
  handleHeight = 30.0,
  handleRadius = 12.0,
  rimType = 'simple',
  iconDepth = 2.0,
  isHandleRemovable = false,
  hasHandle = true
}) => {
  const [textSizeMain, setTextSizeMain] = useState([60, 20, 6]);
  const [textSizeSub, setTextSizeSub] = useState([0, 0, 0]);
  const [textSizeMid, setTextSizeMid] = useState([0, 0, 0]);
  const [textSizePhone, setTextSizePhone] = useState([0, 0, 0]);
  const [loadedFont, setLoadedFont] = useState(null);

  React.useEffect(() => {
    if (!text || text.trim().length === 0) {
      setTextSizeMain([0, 0, 0]);
    }
  }, [text]);

  React.useEffect(() => {
    if (!subText || subText.trim().length === 0) {
      setTextSizeSub([0, 0, 0]);
    }
  }, [subText]);

  React.useEffect(() => {
    if (!phoneText || phoneText.trim().length === 0) {
      setTextSizePhone([0, 0, 0]);
    }
  }, [phoneText]);

  const letterSizeMain = 30.0 * (textScaleMain / 100.0);
  const letterSizeMid = 30.0 * (textScaleMid / 100.0);
  const letterSizeSub = 30.0 * (textScaleSub / 100.0);
  const phoneLetterSize = 18.0; 
  const baseH = baseHeight;        

  const hasMidText = midText && midText.trim().length > 0;
  const hasSubText = subText && subText.trim().length > 0;
  const hasPhoneText = phoneText && phoneText.trim().length > 0;
  
  // Italik için Shear Matrisi
  const shearMatrix = useMemo(() => {
    const matrix = new THREE.Matrix4();
    if (isItalic) {
      const angle = Math.tan(THREE.MathUtils.degToRad(12)); 
      // xy, xz, yx, yz, zx, zy
      matrix.makeShear(angle, 0, 0, 0, 0, 0); 
    }
    return matrix;
  }, [isItalic]);

  // Font haritalama
  const fontPath = useMemo(() => {
    if (fontFamily === 'plus') return "/fonts/Plus_Jakarta_Sans_Bold.json";
    if (fontFamily === 'helvetiker') return "/fonts/helvetiker_bold.typeface.json";
    if (fontFamily === 'droid') return "/fonts/droid_sans_bold.typeface.json";
    return "/fonts/optimer_bold.typeface.json";
  }, [fontFamily]);

  // Load font synchronously for contour generation
  React.useEffect(() => {
    const loader = new FontLoader();
    loader.load(fontPath, (font) => {
      setLoadedFont(font);
    });
  }, [fontPath]);

  // Sap (Handle) için Lathe Profili
  const handlePoints = useMemo(() => {
    const pts = [];
    const r = handleRadius;
    const h = handleHeight;
    // (x, y) - X is radius, Y is height
    // Tabandan tepeye doğru profil:
    pts.push(new THREE.Vector2(0.001, 0)); // Alt merkez
    pts.push(new THREE.Vector2(r, 0));     // Alt kenar
    pts.push(new THREE.Vector2(r, 2));     // Küçük basamak
    pts.push(new THREE.Vector2(r * 0.8, 6)); 
    pts.push(new THREE.Vector2(r * 0.35, h * 0.4)); // En ince yer (Boyun)
    pts.push(new THREE.Vector2(r * 0.45, h * 0.5));
    pts.push(new THREE.Vector2(r * 0.8, h * 0.65)); // Bulb başlangıcı
    pts.push(new THREE.Vector2(r * 1.1, h * 0.82)); // En geniş yer
    pts.push(new THREE.Vector2(r * 0.6, h * 0.95)); // Kapanış
    pts.push(new THREE.Vector2(0, h));             // Tepe merkez
    return pts;
  }, [handleRadius, handleHeight]);

  // Vida (Thread) yolu için sarmal (helix) oluşturma
  const threadCurve = useMemo(() => {
    const pts = [];
    const radius = 3.9;
    const height = Math.max(8, baseH - 2); 
    const turns = Math.max(4, Math.floor(height / 1.2));
    for (let i = 0; i <= 150; i++) {
      const t = i / 150;
      const angle = t * Math.PI * 2 * turns;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        t * height,
        Math.sin(angle) * radius
      ));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  // Programatik icon shape oluştur
  const iconScale = 0.65 * (customIconScale / 100.0); // İkon yazıdan biraz küçük
  
  // Custom SVG Loading
  const [customSvgShape, setCustomSvgShape] = useState(null);
  
  useMemo(() => {
    if (iconTopType === 'custom' && customSvgUrl) {
      const loader = new SVGLoader();
      const svgData = loader.parse(atob(customSvgUrl.split(',')[1]));
      const paths = svgData.paths;
      const shapes = [];
      
      paths.forEach((path) => {
        const pathShapes = path.toShapes(true);
        shapes.push(...pathShapes);
      });
      
      // Normalize and scale custom SVG
      if (shapes.length > 0) {
        const box = new THREE.Box2();
        shapes.forEach(s => {
          const pts = s.getPoints();
          pts.forEach(p => box.expandByPoint(p));
        });
        
        const sizeX = box.max.x - box.min.x;
        const sizeY = box.max.y - box.min.y;
        const maxDim = Math.max(sizeX, sizeY);
        const targetSize = letterSizeMain;
        const s = targetSize / maxDim;
        
        const center = new THREE.Vector2();
        box.getCenter(center);
        
        shapes.forEach(shape => {
          shape.curves.forEach(curve => {
            if (curve.v1) curve.v1.sub(center).multiplyScalar(s);
            if (curve.v2) curve.v2.sub(center).multiplyScalar(s);
            if (curve.v0) curve.v0.sub(center).multiplyScalar(s);
            if (curve.cp) curve.cp.sub(center).multiplyScalar(s);
            if (curve.cp1) curve.cp1.sub(center).multiplyScalar(s);
            if (curve.cp2) curve.cp2.sub(center).multiplyScalar(s);
          });
          shape.holes.forEach(hole => {
            hole.curves.forEach(curve => {
              if (curve.v1) curve.v1.sub(center).multiplyScalar(s);
              if (curve.v2) curve.v2.sub(center).multiplyScalar(s);
              if (curve.v0) curve.v0.sub(center).multiplyScalar(s);
              if (curve.cp) curve.cp.sub(center).multiplyScalar(s);
              if (curve.cp1) curve.cp1.sub(center).multiplyScalar(s);
              if (curve.cp2) curve.cp2.sub(center).multiplyScalar(s);
            });
          });
        });
        setCustomSvgShape(shapes);
      }
    } else {
      setCustomSvgShape(null);
    }
  }, [iconTopType, customSvgUrl, letterSizeMain]);

  const iconShapeTop = useMemo(() => {
    if (iconTopType === 'none') return null;
    if (iconTopType === 'custom') return customSvgShape;
    return createIconShape(iconTopType, letterSizeMain);
  }, [iconTopType, letterSizeMain, customSvgShape]);

  const iconShapeBottom = useMemo(() => {
    if (iconBottomType === 'none') return null;
    return createIconShape(iconBottomType, letterSizeMain * 0.8);
  }, [iconBottomType, letterSizeMain]);

  const dividerShape = useMemo(() => {
    if (!hasDivider) return null;
    return createIconShape('divider', letterSizeMain * 2.5);
  }, [hasDivider, letterSizeMain]);

  const hasIconTop = iconShapeTop !== null;
  const hasIconBottom = iconShapeBottom !== null;
  const iconSpacing = 14.0; 
  const iconTopRealSize = hasIconTop ? (letterSizeMain * iconScale) : 0;
  const iconBottomRealSize = hasIconBottom ? (letterSizeMain * 0.8 * iconScale) : 0;



  // VERTICAL LAYOUT (Z-axis in 3D)
  let currentZ = 0;
  
  let iconTopZ = 0;
  let textMainZ = 0;
  let dividerZ = 0;
  let textMidZ = 0;
  let textSubZ = 0;
  let iconBottomZ = 0;

  // 1. Top Icon
  if (hasIconTop) {
    iconTopZ = currentZ + iconTopRealSize / 2;
    currentZ += iconTopRealSize + iconSpacing;
  }

  // 2. Main Text
  textMainZ = currentZ + letterSizeMain / 2;
  currentZ += letterSizeMain + (hasDivider || hasMidText ? iconSpacing : 0);

  // 3. Divider
  if (hasDivider) {
    dividerZ = currentZ + 1; // thin divider
    currentZ += 2 + iconSpacing;
  }

  // 4. Middle Text
  if (hasMidText) {
    textMidZ = currentZ + letterSizeMid / 2;
    currentZ += letterSizeMid + (hasSubText ? iconSpacing : 0);
  }

  // 5. Bottom Text
  if (hasSubText) {
    textSubZ = currentZ + letterSizeSub / 2;
    currentZ += letterSizeSub + (hasIconBottom ? iconSpacing : 0);
  }

  // 6. Bottom Icon
  if (hasIconBottom) {
    iconBottomZ = currentZ + iconBottomRealSize / 2;
    currentZ += iconBottomRealSize;
  }

  const totalContentDepth = currentZ;
  const zOffset = -totalContentDepth / 2;

  iconTopZ += zOffset;
  textMainZ += zOffset;
  dividerZ += zOffset;
  textMidZ += zOffset;
  textSubZ += zOffset;
  iconBottomZ += zOffset;

  // HORIZONTAL LAYOUT (X-axis)
  const isLeft = false;
  const isRight = false;
  const pLeft = 12.0;
  const pRight = 12.0;
  const pTop = 12.0;
  const pBottom = 12.0;

  const maxTextWidth = Math.max(textSizeMain[0], textSizeMid[0], textSizeSub[0]) || 60;
  let actualContentW = maxTextWidth;
  if (hasIconTop) actualContentW = Math.max(actualContentW, iconTopRealSize);
  if (hasIconBottom) actualContentW = Math.max(actualContentW, iconBottomRealSize);

  let baseW = actualContentW + 30; // Padding artırıldı (20 -> 30)
  let baseD = totalContentDepth + 30;

  // Daire, kare veya ev ise kare tabanlı (en-boy eşit) yapı oluştur
  if (selectedShape === 'circle' || selectedShape === 'square' || selectedShape === 'house') {
    const size = Math.max(baseW, baseD);
    baseW = size;
    baseD = size;
  }

  // Ev için dikdörtgen gövde merkezini hesapla (montaj ve yazı hizalaması için)
  const rectCenterY = useMemo(() => {
    const bottom = -baseD * 0.45;
    const wallTop = baseD * 0.05;
    return (bottom + wallTop) / 2;
  }, [baseD]);

  // Calculate local centers
  const contentCenter = (pLeft - pRight) / 2;
  const contentLeft = contentCenter - actualContentW / 2;
  const contentRight = contentCenter + actualContentW / 2;

  let textX = contentCenter;
  let iconX = contentCenter;

  const baseCenterX = 0; 
  const baseCenterZ = 0; 
  const zCenterOffset = autoCenter ? (selectedShape === 'house' ? -rectCenterY : 0) : textOffset;

  const holeR = 3.5; 
  let holeX = 0;
  let holeZ = 0;

  // Always no hole for stamp
  const innerScale = targetWidth ? (targetWidth / baseW) : 1;
  const scaledCenterZ = baseCenterZ * innerScale;
  const scaledBaseW = baseW * innerScale;
  const scaledBaseD = baseD * innerScale;

  const baseShapeSolid = useMemo(() => {
    if (selectedShape === 'circle') {
      return createCircleBaseShape(baseW, baseD, null);
    } else if (selectedShape === 'house') {
      return createHouseBaseShape(baseW, baseD, null);
    } else {
      return createRoundedRectShape(
        baseW, 
        baseD, 
        Math.min(5, baseW/2, baseD/2), 
        null
      );
    }
  }, [selectedShape, baseW, baseD]);

  const baseShapeWithHole = useMemo(() => {
    const holeConfig = { x: 0, y: selectedShape === 'house' ? rectCenterY : 0, r: 4.2 }; // 8.4mm hole for 8mm threaded pin
    if (selectedShape === 'circle') {
      return createCircleBaseShape(baseW, baseD, holeConfig);
    } else if (selectedShape === 'house') {
      return createHouseBaseShape(baseW, baseD, holeConfig);
    } else {
      return createRoundedRectShape(
        baseW, 
        baseD, 
        Math.min(5, baseW/2, baseD/2), 
        holeConfig
      );
    }
  }, [selectedShape, baseW, baseD, rectCenterY]);

  // Çerçeve için içi boş şekiller
  const rimFrameShape = useMemo(() => {
    const outer = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 1.0, baseD - 1.0)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 0.5)
        : createRoundedRectShape(baseW - 1.0, baseD - 1.0, Math.min(5, baseW/2, baseD/2)));
    
    const inner = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 3.0, baseD - 3.0)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 1.5)
        : createRoundedRectShape(baseW - 3.0, baseD - 3.0, Math.max(0, Math.min(5, baseW/2, baseD/2) - 1)));
    
    const frame = outer.clone();
    frame.holes.push(new THREE.Path().setFromPoints(inner.getPoints(128).reverse()));
    return frame;
  }, [selectedShape, baseW, baseD]);

  const rimDoubleFrameShape = useMemo(() => {
    // Daha kalın ve belirgin iki halka
    const outer1 = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 1.0, baseD - 1.0)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 0.5)
        : createRoundedRectShape(baseW - 1.0, baseD - 1.0, Math.min(5, baseW/2, baseD/2)));
    const inner1 = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 2.5, baseD - 2.5)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 1.25)
        : createRoundedRectShape(baseW - 2.5, baseD - 2.5, Math.max(0, Math.min(5, baseW/2, baseD/2) - 0.7)));
    
    const outer2 = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 4.5, baseD - 4.5)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 2.25)
        : createRoundedRectShape(baseW - 4.5, baseD - 4.5, Math.max(0, Math.min(5, baseW/2, baseD/2) - 1.5)));
    const inner2 = selectedShape === 'circle'
      ? createCircleBaseShape(baseW - 6.0, baseD - 6.0)
      : (selectedShape === 'house'
        ? createHouseBaseShape(baseW, baseD, null, 3.0)
        : createRoundedRectShape(baseW - 6.0, baseD - 6.0, Math.max(0, Math.min(5, baseW/2, baseD/2) - 2.2)));

    const frame = outer1.clone();
    frame.holes.push(new THREE.Path().setFromPoints(inner1.getPoints(128).reverse()));
    frame.holes.push(new THREE.Path().setFromPoints(outer2.getPoints(128).reverse()));
    frame.holes.push(new THREE.Path().setFromPoints(inner2.getPoints(128).reverse()));
    return frame;
  }, [selectedShape, baseW, baseD]);

  const rimPalaceShape = useMemo(() => {
    // Resimdeki Saray Çerçevesi (Palace Frame)
    const radius = Math.min(baseW, baseD) / 2 - 1.5;
    const outer = new THREE.Shape();
    outer.absarc(0, 0, radius, 0, Math.PI * 2, false);
    
    const inner1 = new THREE.Shape();
    inner1.absarc(0, 0, radius - 1.2, 0, Math.PI * 2, true);
    
    // Orta boşluk (Groove)
    const grooveOuter = new THREE.Shape();
    grooveOuter.absarc(0, 0, radius - 2.5, 0, Math.PI * 2, false);
    
    // Scalloped inner edge
    const scallopInner = new THREE.Shape();
    const segments = 180;
    const peaks = 16;
    const rBase = radius - 4.5;
    const rAmp = 1.8;
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // Scallop effect: smooth bumps with sharp valleys
      const wave = Math.pow(Math.abs(Math.sin(theta * peaks / 2)), 0.5) * rAmp;
      const r = rBase + wave;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      if (i === 0) scallopInner.moveTo(x, y);
      else scallopInner.lineTo(x, y);
    }
    
    const frame = outer.clone();
    frame.holes.push(new THREE.Path().setFromPoints(inner1.getPoints(128)));
    frame.holes.push(new THREE.Path().setFromPoints(grooveOuter.getPoints(128)));
    frame.holes.push(new THREE.Path().setFromPoints(scallopInner.getPoints(segments)));
    return frame;
  }, [baseW, baseD]);



  const processTextGeometry = (self, setSizeFunc, yOffset) => {
    if (!self.geometry.userData.morphed) {
      self.geometry.computeBoundingBox();
      let bbox = self.geometry.boundingBox;
      
      if (!bbox || bbox.min.x === Infinity || isNaN(bbox.min.x)) return;
      
      self.geometry.translate(
        -(bbox.max.x + bbox.min.x) / 2, 
        -(bbox.max.y + bbox.min.y) / 2,                    
        0 
      );

      if (isItalic) {
        self.geometry.applyMatrix4(shearMatrix);
      }

      self.geometry.rotateX(-Math.PI / 2);
      
      // Z ekseninde yerleşim
      self.geometry.translate(textX, baseH, yOffset);

      self.geometry.computeVertexNormals();
      self.geometry.computeBoundingBox();
      self.geometry.userData.morphed = true;

      const fbox = self.geometry.boundingBox;
      setSizeFunc([
        fbox.max.x - fbox.min.x,
        fbox.max.z - fbox.min.z, 
        fbox.max.y - fbox.min.y
      ]);
    }
  };

  const processPhoneGeometry = (self, setSizeFunc) => {
    if (!self.geometry.userData.morphed) {
      self.geometry.computeBoundingBox();
      let bbox = self.geometry.boundingBox;
      
      if (!bbox || bbox.min.x === Infinity || isNaN(bbox.min.x)) return;
      
      self.geometry.translate(
        -(bbox.max.x + bbox.min.x) / 2, 
        -(bbox.max.y + bbox.min.y) / 2,                    
        0 
      );
      
      // Normal yazilar gibi yukari (Y+) extrude olmasi icin X ekseni etrafinda -90 derece donder
      self.geometry.rotateX(-Math.PI / 2);
      
      // Y=0 seviyesinde taban merkezine yerleştir
      self.geometry.translate(baseCenterX, 0, baseCenterZ);

      self.geometry.computeVertexNormals();
      self.geometry.computeBoundingBox();
      self.geometry.userData.morphed = true;

      const fbox = self.geometry.boundingBox;
      setSizeFunc([
        fbox.max.x - fbox.min.x,
        fbox.max.z - fbox.min.z, 
        fbox.max.y - fbox.min.y
      ]);
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={35} />
      <OrbitControls 
        makeDefault 
        minPolarAngle={0.1} 
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0, 0]}
      />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[10, 10, 10]} intensity={1.2} castShadow />

      <group scale={[SCALE, SCALE, SCALE]} position={[0, -0.5, zCenterOffset * SCALE]}>
        <group ref={groupRef} scale={[innerScale, innerScale, innerScale]}>
          {/* TABAN (BASE PLATE) */}
          <group name="BaseGroup" position={[baseCenterX, 0, baseCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
            {isHandleRemovable && hasHandle ? (
              <>
                {/* Alt katman - delikli (3mm) */}
                <mesh>
                  <extrudeGeometry args={[baseShapeWithHole, { depth: baseH * 0.7, bevelEnabled: false, curveSegments: 64 }]} />
                  <meshStandardMaterial color={baseColor || '#0F172A'} roughness={0.8} />
                </mesh>
                {/* Üst katman - kapalı (2mm) */}
                <mesh position={[0, 0, baseH * 0.7]}>
                  <extrudeGeometry args={[baseShapeSolid, { depth: baseH * 0.3, bevelEnabled: false, curveSegments: 64 }]} />
                  <meshStandardMaterial color={baseColor || '#0F172A'} roughness={0.8} />
                </mesh>
              </>
            ) : (
              <mesh>
                <extrudeGeometry args={[baseShapeSolid, { depth: baseH, bevelEnabled: false, curveSegments: 64 }]} />
                <meshStandardMaterial color={baseColor || '#0F172A'} roughness={0.8} />
              </mesh>
            )}
          </group>

          {/* DEKORATİF ÇERÇEVELER (RIM PATTERNS) */}
          {rimType !== 'none' && (
            <group position={[baseCenterX, baseH, baseCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
              {/* RİM PATTERNS BASED ON SHAPE */}
              {(() => {
                const rimCount = selectedShape === 'circle' ? 128 : (rimType === 'wave' ? 64 : 48);
                // Get points along the perimeter, slightly offset inward
                const points = baseShapeSolid.getSpacedPoints(rimCount);
                const inset = 1.5; // Offset inward from edge
                
                return (
                  <>
                    {rimType === 'simple' && (
                      <mesh position={[0, 0, 0]}>
                        <extrudeGeometry args={[rimFrameShape, { depth: textDepth, bevelEnabled: false, curveSegments: 64 }]} />
                        <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                      </mesh>
                    )}
                    
                    {rimType === 'double' && (
                      <mesh position={[0, 0, 0]}>
                        <extrudeGeometry args={[rimDoubleFrameShape, { depth: textDepth, bevelEnabled: false, curveSegments: 64 }]} />
                        <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                      </mesh>
                    )}

                    {rimType === 'greek' && points.map((p, i) => {
                      if (i % 3 !== 0) return null;
                      const angle = Math.atan2(p.y, p.x);
                      return (
                        <group key={i} position={[p.x * 0.95, p.y * 0.95, textDepth / 2]} rotation={[0, 0, angle]}>
                          <mesh>
                            <boxGeometry args={[2, 0.6, textDepth]} />
                            <meshStandardMaterial color={materialColor} />
                          </mesh>
                          <mesh position={[0.8, 0.8, 0]} rotation={[0, 0, Math.PI/2]}>
                            <boxGeometry args={[1.5, 0.6, textDepth]} />
                            <meshStandardMaterial color={materialColor} />
                          </mesh>
                        </group>
                      );
                    })}
                    
                    {rimType === 'dotted' && points.map((p, i) => (
                      <mesh key={i} position={[p.x * 0.97, p.y * 0.97, textDepth / 2]}>
                        <cylinderGeometry args={[1.2, 1.2, textDepth, 16]} rotation={[Math.PI/2, 0, 0]} />
                        <meshStandardMaterial color={materialColor} />
                      </mesh>
                    ))}

                    {rimType === 'scalloped' && points.map((p, i) => (
                      <mesh key={i} position={[p.x * 0.94, p.y * 0.94, textDepth / 2]}>
                        <cylinderGeometry args={[2.0, 2.0, textDepth, 16]} rotation={[Math.PI/2, 0, 0]} />
                        <meshStandardMaterial color={materialColor} />
                      </mesh>
                    ))}

                    {rimType === 'zigzag' && points.map((p, i) => {
                      // Çok daha hafif zikzak, kenarda kalacak şekilde
                      const offset = i % 2 === 0 ? 0.98 : 0.92;
                      return (
                        <mesh key={i} position={[p.x * offset, p.y * offset, textDepth / 2]}>
                          <boxGeometry args={[1.5, 1.5, textDepth]} rotation={[0, 0, Math.atan2(p.y, p.x)]} />
                          <meshStandardMaterial color={materialColor} />
                        </mesh>
                      );
                    })}

                    {rimType === 'wave' && points.map((p, i) => {
                      const wave = Math.sin((i/rimCount) * Math.PI * 2 * 10) * 0.03;
                      const offset = 0.95 + wave;
                      return (
                        <mesh key={i} position={[p.x * offset, p.y * offset, textDepth / 2]}>
                          <boxGeometry args={[1.5, 1.5, textDepth]} rotation={[0, 0, Math.atan2(p.y, p.x)]} />
                          <meshStandardMaterial color={materialColor} />
                        </mesh>
                      );
                    })}

                {rimType === 'double_dotted' && (
                      <>
                        {points.map((p, i) => (
                          <mesh key={`d1-${i}`} position={[p.x * 0.98, p.y * 0.98, textDepth / 2]}>
                            <cylinderGeometry args={[0.8, 0.8, textDepth, 16]} rotation={[Math.PI/2, 0, 0]} />
                            <meshStandardMaterial color={materialColor} />
                          </mesh>
                        ))}
                        {points.map((p, i) => (
                          <mesh key={`d2-${i}`} position={[p.x * 0.94, p.y * 0.94, textDepth / 2]}>
                            <cylinderGeometry args={[0.8, 0.8, textDepth, 16]} rotation={[Math.PI/2, 0, 0]} />
                            <meshStandardMaterial color={materialColor} />
                          </mesh>
                        ))}
                      </>
                    )}
                    {rimType === 'palace' && (
                      <mesh position={[0, 0, 0]}>
                        <extrudeGeometry args={[rimPalaceShape, { depth: textDepth, bevelEnabled: false, curveSegments: 64 }]} />
                        <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                      </mesh>
                    )}
                  </>
                );
              })()}
            </group>
          )}


          {/* TUTAMAK (HANDLE) - PROFESYONEL VINTAGE SAP */}
          {hasHandle && (
            <group 
              name="HandleGroup" 
              position={[baseCenterX, 0, selectedShape === 'house' ? baseCenterZ - rectCenterY : baseCenterZ]} 
              rotation={[Math.PI, 0, 0]}
            >
              <mesh>
                <latheGeometry args={[handlePoints, 32]} />
                <meshStandardMaterial color={handleColor || '#334155'} roughness={0.6} metalness={0.2} />
              </mesh>

              {isHandleRemovable && (
                <group position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
                  {/* Vida Ana Gövdesi (Core) */}
                  <mesh position={[0, Math.max(8, baseH - 2) / 2, 0]}>
                    <cylinderGeometry args={[3.4, 3.4, Math.max(8, baseH - 2), 32]} />
                    <meshStandardMaterial color={handleColor || '#334155'} roughness={0.7} metalness={0.3} />
                  </mesh>
                  {/* Sarmal Vida Dişleri (Threads - Yiv ve Set) */}
                  <mesh position={[0, 0, 0]}>
                    <tubeGeometry args={[threadCurve, 150, 0.6, 8, false]} />
                    <meshStandardMaterial color={handleColor || '#334155'} roughness={0.4} metalness={0.5} />
                  </mesh>
                  {/* Vida Başı / Ucu */}
                  <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[3.0, 0, 1.5, 32]} />
                    <meshStandardMaterial color={handleColor || '#334155'} roughness={0.8} />
                  </mesh>
                </group>
              )}
            </group>
          )}

          {/* ANA İÇERİK GRUBU (YAZI VE İKONLAR) - AYNALAMA BURADA UYGULANIYOR */}
          <group 
            name="ContentMirrorGroup"
            scale={[isMirrored ? -1 : 1, 1, 1]}
            position={[0, 0, 0]}
          >
          {/* ÜST SİMGE */}
          {hasIconTop && (
             <group position={[0, baseH, iconTopZ]} rotation={[-Math.PI / 2, 0, 0]}>
               {Array.isArray(iconShapeTop) ? (
                 iconShapeTop.map((s, i) => (
                   <mesh key={i}>
                     <extrudeGeometry args={[s, { depth: textDepth, bevelEnabled: false }]} />
                     <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                   </mesh>
                 ))
               ) : (
                 <mesh>
                   <extrudeGeometry args={[iconShapeTop, { depth: textDepth, bevelEnabled: false }]} />
                   <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                 </mesh>
               )}
             </group>
          )}

          {/* ANA METİN */}
          {text && text.trim().length > 0 && (
            <Text3D
              name="TextMain"
              key={`main-${text}-${textDepth}-${baseHeight}-${textScaleMain}-${isItalic}-${fontFamily}-${isMirrored}`}
              font={fontPath}
              size={letterSizeMain}
              height={textDepth} 
              curveSegments={16}
              bevelEnabled={false}
              onUpdate={(self) => processTextGeometry(self, setTextSizeMain, textMainZ)}
            >
              {text}
              <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
            </Text3D>
          )}

          {/* AYRAÇ ÇİZGİSİ */}
          {hasDivider && dividerShape && (
            <group position={[0, baseH, dividerZ]} rotation={[-Math.PI / 2, 0, 0]}>
               {dividerShape.map((s, i) => (
                 <mesh key={i}>
                   <extrudeGeometry args={[s, { depth: textDepth, bevelEnabled: false }]} />
                   <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                 </mesh>
               ))}
            </group>
          )}

          {/* ORTA METİN */}
          {hasMidText && (
            <Text3D
              name="TextMid"
              key={`mid-${midText}-${textDepth}-${baseHeight}-${textScaleMid}-${isItalic}-${fontFamily}-${isMirrored}`}
              font={fontPath}
              size={letterSizeMid}
              height={textDepth} 
              curveSegments={16}
              bevelEnabled={false}
              onUpdate={(self) => processTextGeometry(self, setTextSizeMid, textMidZ)}
            >
              {midText}
              <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
            </Text3D>
          )}

          {/* ALT METİN */}
          {hasSubText && (
            <Text3D
              name="TextSub"
              key={`sub-${subText}-${textDepth}-${baseHeight}-${textScaleSub}-${isItalic}-${fontFamily}-${isMirrored}`}
              font={fontPath}
              size={letterSizeSub}
              height={textDepth} 
              curveSegments={16}
              bevelEnabled={false}
              onUpdate={(self) => processTextGeometry(self, setTextSizeSub, textSubZ)}
            >
              {subText}
              <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
            </Text3D>
          )}

          {/* ALT SİMGE */}
          {hasIconBottom && (
             <group position={[0, baseH, iconBottomZ]} rotation={[-Math.PI / 2, 0, 0]}>
               {Array.isArray(iconShapeBottom) ? (
                 iconShapeBottom.map((s, i) => (
                   <mesh key={i}>
                     <extrudeGeometry args={[s, { depth: textDepth, bevelEnabled: false }]} />
                     <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                   </mesh>
                 ))
               ) : (
                 <mesh>
                   <extrudeGeometry args={[iconShapeBottom, { depth: textDepth, bevelEnabled: false }]} />
                   <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                 </mesh>
               )}
             </group>
          )}
          </group>
        </group>

        {/* ZEMİN GÖLGE DÜZLEMI */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, scaledCenterZ]} receiveShadow>
          <planeGeometry args={[scaledBaseW + 40, scaledBaseD + 40]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
      </group>
    </>
  );
};