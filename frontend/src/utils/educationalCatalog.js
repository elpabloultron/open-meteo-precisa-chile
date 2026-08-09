/**
 * Diccionario Educativo Universal para MeteoPrecisa Chile.
 * Proporciona explicaciones pedagógicas detalladas para cada métrica, botón e indicador.
 */

export const EDUCATIONAL_METRICS = {
  // --- MÓDULO AGRÍCOLA Y GEE ---
  "Evapotranspiración ETo (FAO-56)": {
    categoria: "Riego & Evaporación",
    queEs: "Es la cantidad teórica de agua (en mm/día) que pierde por evaporación del suelo y transpiración foliar una pradera de pasto verde de 12 cm de altura sin restricciones hídricas.",
    comoSeMide: "Se calcula con la ecuación internacional Penman-Monteith (FAO-56) combinando temperatura, humedad relativa, velocidad del viento a 2m e insolación solar.",
    queHacer: "Multiplica este valor por el coeficiente de tu cultivo (Kc) para programar la lámina exacta de riego a reponer hoy.",
    normaOficial: "Norma Internacional FAO-56 / OMM WMO-No. 8"
  },
  "Horas Frío Acumuladas": {
    categoria: "Receso Invernal",
    queEs: "Suma continua de horas en que la temperatura ambiente se mantiene menor o igual a 7.0°C. Los árboles caducos (cerezos, nogales, manzanos) necesitan acumular frío en invierno para romper la dormancia de las yemas y florecer uniformemente en primavera.",
    comoSeMide: "Contador horario procesado desde sensores de temperatura a 2m de altura.",
    queHacer: "Compara las horas acumuladas contra los requerimientos específicos de tu variedad frutícola (ej. Cerezos Lapins necesitan ~600 horas frío).",
    normaOficial: "Modelo Clásico de Weinberger (≤ 7.0°C)"
  },
  "Riesgo de Helada Radiativa": {
    categoria: "Heladas & Punto de Rocío",
    queEs: "Alerta de caída térmica bajo 0°C causada por enfriamiento nocturno del suelo despejado con pérdida de radiación infrarroja hacia el espacio.",
    comoSeMide: "Monitoreo del Punto de Rocío (Dew Point) y caída de temperatura nocturna.",
    queHacer: "Si la temperatura bordea 1.5°C y el punto de rocío es bajo cero, activa inmediatamente hélices antiheladas, riego por aspersión o quemadores antes del amanecer.",
    normaOficial: "Estándar Agrometeorológico INIA / OMM"
  },
  "Índice Vegetativo NDVI (Sentinel-2)": {
    categoria: "Vigor Vegetativo Satelital",
    queEs: "El Índice de Vegetación de Diferencia Normalizada (NDVI) mide la densidad y salud de la biomasa verde. Las plantas sanas absorben luz roja para fotosíntesis y reflejan masivamente luz infrarroja cercana (NIR).",
    comoSeMide: "Procesado en tiempo real con reflectancia Sentinel-2 (Banda 8 NIR - Banda 4 Red) / (Banda 8 + Banda 4) a 10 metros de resolución espacial.",
    queHacer: "Valores entre 0.6 y 0.85 indican cultivo sano. Si ves parches bajo 0.40, inspecciona esa zona por posible ataque de plagas, fallas de riego o compactación de suelo.",
    normaOficial: "Agencia Espacial Europea (ESA Copernicus) / GEE"
  },
  "Índice NDRE (Clorofila & Nitrógeno)": {
    categoria: "Nutrición & Clorofila",
    queEs: "El Normalized Difference Red Edge (NDRE) mide la concentración de clorofila y nitrógeno en hojas maduras del dosel sin saturarse en vegetación muy densa.",
    comoSeMide: "Calculado con las bandas Red-Edge (B8A y B5) del satélite Sentinel-2 a 10 metros por píxel.",
    queHacer: "Si el NDRE cae por debajo de 0.35 mientras el NDVI sigue alto, la planta está perdiendo nitrógeno. Aplica fertirriego nítrico localizado antes de que las hojas amarilleen.",
    normaOficial: "Sentinel-2 Red-Edge Spectral Index"
  },
  "Déficit de Presión de Vapor (VPD)": {
    categoria: "Fisiología Vegetal",
    queEs: "Es la diferencia entre la cantidad de agua que el aire puede retener y la que realmente contiene. Mide qué tan seco está el aire para la planta.",
    comoSeMide: "Calculado a partir de la temperatura de superficie de suelo y presión de vapor de saturación de la capa ERA5-Land.",
    queHacer: "Un VPD ideal para fotosíntesis es de 0.8 a 1.2 kPa. Si supera 2.0 kPa, la planta cierra sus estomas para no deshidratarse; aplica riegos de refrescamiento.",
    normaOficial: "Fisiología Vegetal Avanzada / ECMWF ERA5"
  },

  // --- MÓDULO URBANO ---
  "Temperatura Ambiente": {
    categoria: "Clima Urbano",
    queEs: "Medición estándar del calor presente en el aire atmosférico a la sombra.",
    comoSeMide: "Sensor termométrico abrigado dentro de una garita meteorológica a 2 metros sobre suelo plano de césped.",
    queHacer: "Mantener ventilación e hidratación constante en días calurosos.",
    normaOficial: "OMM WMO-No. 8"
  },
  "Velocidad y Dirección del Viento": {
    categoria: "Viento & Deriva",
    queEs: "Velocidad de desplazamiento del aire a 10 metros de altura y su rumbo de origen.",
    comoSeMide: "Anemómetro de cazoletas o sónico a 10m de altura sobre el suelo.",
    queHacer: "Si el viento supera los 15 km/h, suspende aplicaciones pulverizadas de productos fitosanitarios para evitar la deriva hacia predios vecinos.",
    normaOficial: "OMM WMO-No. 8 / Dirección Meteorológica de Chile"
  },
  "Índice de Radiación UV": {
    categoria: "Salud & Insolación",
    queEs: "Indicador de la intensidad de la radiación ultravioleta del sol que alcanza la superficie terrestre y que causa quemaduras cutáneas y daño ocular.",
    comoSeMide: "Sensor radiométrico UV o estimación por ángulo solar e inclinación zenital.",
    queHacer: "Para valores UV ≥ 6 (Alto), aplica bloqueador solar FPS 50+, usa sombrero de ala ancha y anteojos con filtro UV400 entre las 11:00 y 16:00 hrs.",
    normaOficial: "Organización Mundial de la Salud (OMS) / DMC"
  },
  "Calidad del Aire SINCA MMA": {
    categoria: "Medio Ambiente & Calidad del Aire",
    queEs: "Evaluación de la concentración de Material Particulado Fino MP2.5 y MP10 suspendido en el aire urbano.",
    comoSeMide: "Estaciones de monitoreo continuo del Sistema de Información Nacional de Calidad del Aire (SINCA) del Ministerio del Medio Ambiente.",
    queHacer: "En días de Alerta, Preemergencia o Emergencia, respeta la prohibición de uso de calefactores a leña no certificados y evita actividad física intensa al aire libre.",
    normaOficial: "Decreto Supremo DS 12/2011 Ministerio del Medio Ambiente Chile"
  }
};

export function getEducationalInfo(title) {
  if (EDUCATIONAL_METRICS[title]) {
    return EDUCATIONAL_METRICS[title];
  }

  // Fallback genérico educacional
  return {
    categoria: "Información Meteorológica",
    queEs: `Métrica climática "${title}" captada en tiempo real por la red de estaciones de Chile o reanálisis satelital.`,
    comoSeMide: "Instrumentación electrónica calibrada a 2 metros de altura o sensado remoto por satélite.",
    queHacer: "Consultar las condiciones locales antes de realizar labores de campo o desplazamientos.",
    normaOficial: "Organización Meteorológica Mundial (OMM)"
  };
}
