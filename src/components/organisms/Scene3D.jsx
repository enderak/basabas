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

// Daire taban şekli
const createCircleBaseShape = (width, depth, holeConfig) => {
  const shape = new THREE.Shape();
  const radius = Math.max(width, depth) / 2;
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  
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
  phoneText,
  fontFamily,
  iconType,
  customSvgUrl,
  iconPosition,
  isItalic,
  textDepth,
  groupRef,
  materialColor,
  baseColor,
  baseShape: selectedShape,
  textScale,
  textOffset,
  autoCenter,
  baseHeight,
  targetWidth,
  iconScale: customIconScale = 100,
  isMirrored = true,
  handleHeight = 30.0,
  handleRadius = 12.0,
  rimType = 'simple',
  iconDepth = 2.0
}) => {
  const [textSizeMain, setTextSizeMain] = useState([60, 20, 6]);
  const [textSizeSub, setTextSizeSub] = useState([0, 0, 0]);
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

  const scaleRatio = (textScale || 100) / 100.0;
  const letterSize = 30.0 * scaleRatio;         
  const phoneLetterSize = 18.0 * scaleRatio; // Telefon numarası daha küçük olsun
  const baseH = baseHeight;        

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

  // Programatik icon shape oluştur
  const iconScale = 0.65 * (customIconScale / 100.0); // İkon yazıdan biraz küçük
  
  // Custom SVG Loading
  const [customSvgShape, setCustomSvgShape] = useState(null);
  
  useMemo(() => {
    if (iconType === 'custom' && customSvgUrl) {
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
        const targetSize = letterSize;
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
  }, [iconType, customSvgUrl, letterSize]);

  const iconShape = useMemo(() => {
    if (iconType === 'none') return null;
    if (iconType === 'custom') return customSvgShape;
    return createIconShape(iconType, letterSize);
  }, [iconType, letterSize, customSvgShape]);

  const hasIcon = iconShape !== null;
  const iconSpacing = 8.0; // Spacing increased from 2.0 to 8.0
  const iconRealSize = hasIcon ? (letterSize * iconScale) : 0;

  // VERTICAL LAYOUT (Z-axis in 3D)
  const lineSpacing = letterSize * 1.3;
  let currentZ = 0;
  
  let iconZ = 0;
  let textMainZ = 0;
  let textSubZ = 0;

  if (hasIcon && iconPosition === 'top') {
    iconZ = currentZ + iconRealSize / 2;
    currentZ += iconRealSize + iconSpacing;
  }

  textMainZ = currentZ + letterSize / 2;
  currentZ += letterSize;

  if (hasSubText) {
    currentZ += (lineSpacing - letterSize); // gap
    textSubZ = currentZ + letterSize / 2;
    currentZ += letterSize;
  }

  const totalContentDepth = currentZ;
  const zOffset = -totalContentDepth / 2;

  if (hasIcon && (iconPosition === 'left' || iconPosition === 'right')) {
    iconZ = totalContentDepth / 2;
  }

  iconZ += zOffset;
  textMainZ += zOffset;
  textSubZ += zOffset;

  // HORIZONTAL LAYOUT (X-axis)
  const isLeft = false;
  const isRight = false;
  const pLeft = 12.0;
  const pRight = 12.0;
  const pTop = 12.0;
  const pBottom = 12.0;

  const estimatedWidth = (text?.length || 0) * letterSize * 0.6;
  const maxTextWidth = Math.max(textSizeMain[0], textSizeSub[0]) || estimatedWidth;
  const textBlockWidth = maxTextWidth;
  let actualContentW = textBlockWidth;
  
  if (hasIcon) {
    if (iconPosition === 'top') {
      actualContentW = Math.max(actualContentW, iconRealSize);
    } else {
      actualContentW = textBlockWidth + (iconSpacing * 1.5) + iconRealSize;
    }
  }

  let baseW = actualContentW + pLeft + pRight;
  let baseD = totalContentDepth + pTop + pBottom;

  if (selectedShape === 'teardrop') {
    baseW += (10.0 * scaleRatio);
  }

  // Calculate local centers
  const contentCenter = (pLeft - pRight) / 2;
  const contentLeft = contentCenter - actualContentW / 2;
  const contentRight = contentCenter + actualContentW / 2;

  let textX = contentCenter;
  let iconX = contentCenter;

  if (hasIcon) {
    if (iconPosition === 'left') {
      iconX = contentLeft + iconRealSize / 2;
      textX = contentRight - textBlockWidth / 2;
    } else if (iconPosition === 'right') {
      textX = contentLeft + textBlockWidth / 2;
      iconX = contentRight - iconRealSize / 2;
    }
    // If no icon, still need to align text
  }

  const baseCenterX = 0; 
  const baseCenterZ = 0; 
  const zCenterOffset = autoCenter ? 0 : textOffset;

  const holeR = 3.5; 
  let holeX = 0;
  let holeZ = 0;

  // Always no hole for stamp
  const innerScale = targetWidth ? (targetWidth / baseW) : 1;
  const scaledCenterZ = baseCenterZ * innerScale;
  const scaledBaseW = baseW * innerScale;
  const scaledBaseD = baseD * innerScale;

  // Taban şekli seçimi
  const baseShape = useMemo(() => {
    if (selectedShape === 'circle') {
      return createCircleBaseShape(baseW, baseD, null);
    } else {
      return createRoundedRectShape(
        baseW, 
        baseD, 
        Math.min(5, baseW/2, baseD/2), 
        null
      );
    }
  }, [selectedShape, baseW, baseD, isLeft, holeX, holeZ, holeR]);



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
          {/* TABAN PLAKASI */}
          <mesh 
            name="BasePlate" 
            position={[baseCenterX, 0, baseCenterZ]} 
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <extrudeGeometry args={[baseShape, { depth: baseH, bevelEnabled: false }]} />
            <meshStandardMaterial color={baseColor || '#334155'} roughness={0.8} />
          </mesh>

          {/* DEKORATİF ÇERÇEVELER (RIM PATTERNS) */}
          {rimType !== 'none' && (
            <group position={[baseCenterX, baseH, baseCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
              {/* RİM PATTERNS BASED ON SHAPE */}
              {(() => {
                const rimCount = rimType === 'wave' ? 60 : (rimType === 'zigzag' ? 48 : 36);
                // Get points along the perimeter, slightly offset inward
                const points = baseShape.getSpacedPoints(rimCount);
                const inset = 1.5; // Offset inward from edge
                
                return (
                  <>
                    {(rimType === 'simple' || rimType === 'double' || rimType === 'greek') && (
                      <mesh>
                        <extrudeGeometry args={[baseShape, { depth: 1.5, bevelEnabled: false }]} />
                        <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                      </mesh>
                    )}
                    
                    {rimType === 'dotted' && points.map((p, i) => (
                      <mesh key={i} position={[p.x * 0.92, p.y * 0.92, 0.5]}>
                        <sphereGeometry args={[1.0, 12, 12]} />
                        <meshStandardMaterial color={materialColor} />
                      </mesh>
                    ))}

                    {rimType === 'scalloped' && points.map((p, i) => (
                      <mesh key={i} position={[p.x * 0.98, p.y * 0.98, 0.5]}>
                        <cylinderGeometry args={[2.5, 2.5, 1.2, 16]} />
                        <meshStandardMaterial color={materialColor} />
                      </mesh>
                    ))}

                    {rimType === 'zigzag' && points.map((p, i) => {
                      const offset = i % 2 === 0 ? 1.05 : 0.9;
                      return (
                        <mesh key={i} position={[p.x * offset, p.y * offset, 0.5]}>
                          <boxGeometry args={[1.5, 1.5, 1.5]} />
                          <meshStandardMaterial color={materialColor} />
                        </mesh>
                      );
                    })}

                    {rimType === 'wave' && points.map((p, i) => {
                      const z = Math.sin((i/rimCount) * Math.PI * 2 * 10) * 1.0;
                      return (
                        <mesh key={i} position={[p.x * 0.95, p.y * 0.95, 0.5 + z]}>
                          <sphereGeometry args={[0.8, 12, 12]} />
                          <meshStandardMaterial color={materialColor} />
                        </mesh>
                      );
                    })}
                  </>
                );
              })()}
            </group>
          )}


          {/* TUTAMAK (HANDLE) */}
          <mesh 
            name="StampHandle" 
            position={[baseCenterX, -handleHeight / 2, baseCenterZ]} 
            rotation={[0, 0, 0]}
          >
            <cylinderGeometry args={[handleRadius * 0.8, handleRadius, handleHeight, 32]} />
            <meshStandardMaterial color={baseColor || '#334155'} roughness={0.8} />
          </mesh>

          {/* ANA İÇERİK GRUBU (YAZI VE İKONLAR) - AYNALAMA BURADA UYGULANIYOR */}
          <group 
            name="ContentMirrorGroup"
            scale={[isMirrored ? -1 : 1, 1, 1]}
            position={[0, 0, 0]}
          >
          {/* ANA METİN */}
          {text && text.trim().length > 0 && (
            <Text3D
              name="TextMain"
              key={`main-${text}-${textDepth}-${baseHeight}-${scaleRatio}-${hasSubText}-${isItalic}-${fontFamily}-${hasIcon}-${isMirrored}`}
              font={fontPath}
              size={letterSize}
              height={textDepth} // textDepth kullanılıyor
              curveSegments={16}
              bevelEnabled={false}
              onUpdate={(self) => processTextGeometry(self, setTextSizeMain, textMainZ)}
            >
              {text}
              <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
            </Text3D>
          )}

          {/* ALT METİN (Opsiyonel) */}
          {hasSubText && (
            <Text3D
              name="TextSub"
              key={`sub-${subText}-${textDepth}-${baseHeight}-${scaleRatio}-${isItalic}-${fontFamily}-${hasIcon}-${isMirrored}`}
              font={fontPath}
              size={letterSize}
              height={textDepth} 
              curveSegments={16}
              bevelEnabled={false}
              onUpdate={(self) => processTextGeometry(self, setTextSizeSub, textSubZ)}
            >
              {subText}
              <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
            </Text3D>
          )}




          {/* SİMGE (ICON) */}
          {hasIcon && (
            Array.isArray(iconShape) ? (
              <group
                key={`icon-${iconType}-${textDepth}-${baseHeight}-${scaleRatio}-${isItalic}-${iconPosition}-${letterSize}-${isMirrored}`}
                name="TextIconGroup"
                position={[iconX, baseH, iconZ]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[iconScale, iconScale, 1]}
              >
                {iconShape.map((shape, idx) => (
                  <mesh key={idx} name={`TextIcon_${idx}`}>
                    <extrudeGeometry args={[shape, { depth: iconDepth, bevelEnabled: false }]} />
                    <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
                  </mesh>
                ))}
              </group>
            ) : (
              <mesh 
                key={`icon-${iconType}-${iconDepth}-${baseHeight}-${scaleRatio}-${isItalic}-${iconPosition}-${letterSize}-${isMirrored}`}
                name="TextIcon"
                position={[iconX, baseH, iconZ]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[iconScale, iconScale, 1]}
              >
                <extrudeGeometry args={[iconShape, { depth: iconDepth, bevelEnabled: false }]} />
                <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
              </mesh>
            )
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