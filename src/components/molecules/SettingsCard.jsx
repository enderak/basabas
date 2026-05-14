import React from 'react';
import { Button } from "../atoms/Button";
import { Download, Globe } from "lucide-react";
import { useTranslation } from 'react-i18next';

const RangeInput = ({ label, value, min, max, step, onChange, suffix = "%" }) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalValue(val);
    // Use a small timeout to debounce the heavy 3D update
    if (window.rangeTimer) clearTimeout(window.rangeTimer);
    window.rangeTimer = setTimeout(() => {
      onChange(val);
    }, 16); // ~1 frame delay
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
        <span>{label}</span>
        <span>{localValue}{suffix}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={localValue}
        onChange={handleChange}
        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 outline-none"
      />
    </div>
  );
};

export const SettingsCard = ({ 
  text, setText, 
  subText, setSubText,
  midText, setMidText,
  phoneText, setPhoneText,
  fontFamily, setFontFamily,
  iconTopType, setIconTopType,
  iconBottomType, setIconBottomType,
  customSvgUrl, setCustomSvgUrl,
  iconPosition, setIconPosition,
  isItalic, setIsItalic,
  textDepth, setTextDepth,
  materialColor, setMaterialColor,
  baseColor, setBaseColor,
  handleColor, setHandleColor,
  baseShape, setBaseShape,
  textScaleMain, setTextScaleMain,
  textScaleMid, setTextScaleMid,
  textScaleSub, setTextScaleSub,
  hasDivider, setHasDivider,
  iconScale, setIconScale,
  textOffset, setTextOffset,
  autoCenter, setAutoCenter,
  baseHeight, setBaseHeight,
  targetWidth, setTargetWidth,
  isMirrored, setIsMirrored,
  handleHeight, setHandleHeight,
  handleRadius, setHandleRadius,
  rimType, setRimType,
  iconDepth, setIconDepth,
  isHandleRemovable, setIsHandleRemovable,
  onExport 
}) => {
  const { t, i18n } = useTranslation();

  const colors = [
    { value: '#22C55E', label: 'Sakarya Green' }, 
    { value: '#0F172A', label: 'Sakarya Black' }, 
    { value: '#3B82F6', label: 'Blue' },   
    { value: '#FBBF24', label: 'Yellow' }, 
    { value: '#F87171', label: 'Coral' },  
  ];

  const hasAnyIcon = iconTopType !== 'none' || iconBottomType !== 'none';

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col gap-6 w-full max-w-sm shrink-0 overflow-y-auto max-h-[90vh]">
      
      {/* Language Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
          <Globe size={12} />
          {t('language')}
        </label>
        <div className="bg-slate-100/80 p-1 rounded-xl flex items-center h-11 w-full relative">
          {[
            { code: 'TR', name: 'TÜRKÇE' },
            { code: 'EN', name: 'ENGLISH' }
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`z-10 flex-1 text-[11px] font-bold tracking-wider rounded-lg h-full transition-all flex items-center justify-center ${
                i18n.language === lang.code 
                  ? 'bg-white shadow-sm text-emerald-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {lang.code}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 border-b border-slate-100 pb-5">
        {/* YAZI TİPİ (FONT) SEÇİMİ */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('font_family')}</label>
          <div className="relative">
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="plus">Jakarta Sans (TR Support)</option>
              <option value="droid">Droid Sans</option>
              <option value="helvetiker">Helvetiker</option>
              <option value="optimer">Optimer</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        {/* Metin Girişleri */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500">{t('label_text')}</label>
            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-white border border-slate-200/80 text-sm font-bold text-slate-800 py-2.5 px-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all shadow-sm"
              placeholder={t('placeholder_text')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500">{t('mid_text')}</label>
            <input 
              value={midText}
              onChange={(e) => setMidText(e.target.value)}
              className="w-full bg-white border border-slate-200/80 text-sm font-bold text-slate-800 py-2.5 px-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all shadow-sm"
              placeholder={t('placeholder_mid_text')}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500">{t('sub_text')}</label>
            <input 
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              className="w-full bg-white border border-slate-200/80 text-sm font-bold text-slate-800 py-2.5 px-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all shadow-sm"
              placeholder={t('placeholder_sub_text')}
            />
          </div>
        </div>

        {/* Metin Boyutları Sliderları */}
        <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('text_sizes')}</label>
          
          <RangeInput 
            label={t('label_text')}
            value={textScaleMain}
            min="20" max="150" step="1"
            onChange={setTextScaleMain}
          />

          {midText && (
            <RangeInput 
              label={t('mid_text')}
              value={textScaleMid}
              min="20" max="150" step="1"
              onChange={setTextScaleMid}
            />
          )}

          {subText && (
            <RangeInput 
              label={t('sub_text')}
              value={textScaleSub}
              min="20" max="150" step="1"
              onChange={setTextScaleSub}
            />
          )}
        </div>
      </div>

      {/* Fiziksel Ayarlar */}
      <div className="flex flex-col gap-5">
        
        <RangeInput 
          label={t('text_depth')}
          value={textDepth}
          min="0.5" max="5.0" step="0.1"
          suffix="mm"
          onChange={setTextDepth}
        />

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('transform')}</label>
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center h-11 w-full relative">
            <button 
              onClick={() => setIsItalic(false)}
              className={`z-10 flex-1 text-[11px] font-bold tracking-wider rounded-lg h-full transition-colors ${
                !isItalic ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('normal_text')}
            </button>
            <button 
              onClick={() => setIsItalic(true)}
              className={`z-10 flex-1 text-[11px] font-bold tracking-wider rounded-lg h-full transition-colors italic ${
                isItalic ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('italic')}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100/80 transition-colors">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              checked={isMirrored}
              onChange={(e) => setIsMirrored(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </div>
          <span className="text-xs font-bold text-emerald-800">{t('is_mirrored')}</span>
        </label>
      </div>

      {/* Simgeler ve Ayraç */}
      <div className="flex flex-col gap-5 pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('icon_top')}</label>
          <select
            value={iconTopType}
            onChange={(e) => setIconTopType(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="none">{t('icon_none')}</option>
            <option value="olive_detailed">{t('icon_olive_detailed')} 🌿</option>
            <option value="clover">{t('icon_clover')} 🍀</option>
            <option value="star_crescent">{t('icon_star_crescent')} 🌙</option>
            <option value="heart">{t('icon_heart')} ❤️</option>
            <option value="custom">{t('icon_custom')} 📁</option>
          </select>
        </div>

        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
           <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('has_divider')}</span>
              <span className="text-[9px] text-slate-400">Metinler arası desen</span>
           </div>
           <button 
             onClick={() => setHasDivider(!hasDivider)}
             className={`w-12 h-6 rounded-full relative transition-colors ${hasDivider ? 'bg-emerald-500' : 'bg-slate-300'}`}
           >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasDivider ? 'left-7' : 'left-1'}`} />
           </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('icon_bottom')}</label>
          <select
            value={iconBottomType}
            onChange={(e) => setIconBottomType(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="none">{t('icon_none')}</option>
            <option value="ornament">{t('icon_ornament')} ⚜</option>
            <option value="leaf">{t('icon_leaf')} 🍃</option>
            <option value="clover">{t('icon_clover')} 🍀</option>
          </select>
        </div>

        {hasAnyIcon && (
          <div className="flex flex-col gap-4">
            <RangeInput 
              label={t('icon_depth')}
              value={iconDepth}
              min="0.5" max="5.0" step="0.1"
              suffix="mm"
              onChange={setIconDepth}
            />
            <RangeInput 
              label="Simge Boyutu"
              value={iconScale}
              min="20" max="200" step="5"
              onChange={setIconScale}
            />
          </div>
        )}
      </div>

      {/* Renk Seçimi */}
      <div className="flex flex-col gap-5 pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500">{t('label_text_color')}</label>
          <div className="flex gap-3">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setMaterialColor(color.value)}
                className={`w-8 h-8 rounded-full relative transition-transform hover:scale-110 shadow-sm ${
                  materialColor === color.value ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500">{t('label_base_color')}</label>
          <div className="flex gap-3">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setBaseColor(color.value)}
                className={`w-8 h-8 rounded-full relative transition-transform hover:scale-110 shadow-sm ${
                  baseColor === color.value ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Taban ve Sap Ayarları */}
      <div className="flex flex-col gap-5 pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('base_shape')}</label>
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center h-11 w-full relative">
            <button 
              onClick={() => setBaseShape('rectangle')}
              className={`z-10 flex-1 text-[11px] font-bold tracking-wider rounded-lg h-full transition-colors ${
                baseShape === 'rectangle' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('shape_rectangle')}
            </button>
            <button 
              onClick={() => setBaseShape('circle')}
              className={`z-10 flex-1 text-[11px] font-bold tracking-wider rounded-lg h-full transition-colors ${
                baseShape === 'circle' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('shape_circle')}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('rim_type')}</label>
          <select
            value={rimType}
            onChange={(e) => setRimType(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="none">{t('rim_none')}</option>
            <option value="simple">{t('rim_simple')}</option>
            <option value="double">{t('rim_double')}</option>
            <option value="dotted">{t('rim_dotted')}</option>
            <option value="scalloped">{t('rim_scalloped')}</option>
            <option value="greek">{t('rim_greek')}</option>
            <option value="zigzag">{t('rim_zigzag')}</option>
            <option value="wave">{t('rim_wave')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('handle_settings')}</label>
          <RangeInput 
            label={t('handle_height')}
            value={handleHeight}
            min="10" max="60" step="1"
            suffix="mm"
            onChange={setHandleHeight}
          />
          <RangeInput 
            label={t('handle_radius')}
            value={handleRadius}
            min="5" max="25" step="1"
            suffix="mm"
            onChange={setHandleRadius}
          />
          <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={isHandleRemovable}
                onChange={(e) => setIsHandleRemovable(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-900">{t('handle_removable')}</span>
              <span className="text-[9px] text-emerald-700/70 leading-none">{t('handle_removable_desc')}</span>
            </div>
          </label>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col gap-3 mt-auto pt-4">
        <button 
          onClick={() => onExport(false)}
          className="w-full bg-[#059669] hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-200"
        >
          <Download size={20} />
          {t('export_single')}
        </button>
        <button 
          onClick={() => onExport(true)}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          </div>
          {t('export_multi')}
        </button>
      </div>

    </div>
  );
};
