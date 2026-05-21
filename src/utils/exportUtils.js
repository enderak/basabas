// src/utils/exportUtils.js — v6.0.0 (3-file AMS with physical mesh separation)
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import JSZip from 'jszip';

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  }, 100);
}

export const handleExport = (groupRef, fileName = "SAKRAD_Isimlik", isMultiColor = false) => {
  if (!groupRef.current) return;

  const exporter = new STLExporter();
  
  const originalScale = groupRef.current.scale.clone();
  const originalRotation = groupRef.current.rotation.clone();

  groupRef.current.scale.multiplyScalar(20);
  groupRef.current.rotation.x += Math.PI / 2;
  groupRef.current.updateMatrixWorld(true);

  const stlBuf = (res) => res instanceof ArrayBuffer ? res : (res.buffer || res);

  // Recursive: tüm mesh'leri topla
  const collectMeshes = (obj) => {
    let meshes = [];
    if (obj.isMesh && obj.geometry) meshes.push(obj);
    if (obj.children) obj.children.forEach(c => meshes.push(...collectMeshes(c)));
    return meshes;
  };

  if (isMultiColor) {
    const zip = new JSZip();
    const allChildren = [...groupRef.current.children];
    
    // 1. TABAN (BaseGroup)
    groupRef.current.children = allChildren.filter(c => c.name === 'BaseGroup');
    groupRef.current.updateMatrixWorld(true);
    zip.file(`${fileName}_TABAN.stl`, stlBuf(exporter.parse(groupRef.current, { binary: true })));

    // 2. SAP (HandleGroup)
    const handleChildren = allChildren.filter(c => c.name === 'HandleGroup');
    if (handleChildren.length > 0) {
      groupRef.current.children = handleChildren;
      groupRef.current.updateMatrixWorld(true);
      zip.file(`${fileName}_SAP.stl`, stlBuf(exporter.parse(groupRef.current, { binary: true })));
    }

    // 3. YAZI VE SİMGELER (Geri kalan her şey)
    groupRef.current.children = allChildren.filter(c => c.name !== 'BaseGroup' && c.name !== 'HandleGroup');
    groupRef.current.updateMatrixWorld(true);
    zip.file(`${fileName}_YAZI_VE_SIMGELER.stl`, stlBuf(exporter.parse(groupRef.current, { binary: true })));

    // Sahneyi eski haline getir
    groupRef.current.children = allChildren;
    
    zip.generateAsync({ type: "blob" }).then((content) => {
      downloadBlob(content, `${fileName}_CokluRenk.zip`);
    });

  } else {
    try {
      const result = exporter.parse(groupRef.current, { binary: true });
      const blob = new Blob([stlBuf(result)], { type: 'application/octet-stream' });
      downloadBlob(blob, `${fileName}_${new Date().getTime()}.stl`);
    } catch (err) {
      console.error('STL Export Error:', err);
      alert('STL dışa aktarma hatası: ' + err.message);
    }
  }

  groupRef.current.scale.copy(originalScale);
  groupRef.current.rotation.copy(originalRotation);
  groupRef.current.updateMatrixWorld(true);
};