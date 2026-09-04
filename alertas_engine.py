"""
Motor de Alertas Agro-Climáticas e Higiénico-Ambientales para MeteoPrecisa Chile.
Evalúa parámetros en tiempo real contra umbrales técnicos agronómicos y de la OMM.
"""


def evaluar_alertas_meteorologicas(clima_data: dict) -> list:
    alertas = []

    # 1. Extraer datos relevantes
    modo_agricola = clima_data.get("modo_agricola", {})
    modo_urbano = clima_data.get("modo_urbano", {})
    metadatos = clima_data.get("metadatos", {})

    temp_actual = metadatos.get("temperatura_c") if metadatos.get("temperatura_c") is not None else 15.0
    temp_min = modo_agricola.get("temperatura_minima_hoy_c") if modo_agricola.get("temperatura_minima_hoy_c") is not None else temp_actual
    punto_rocio = modo_agricola.get("punto_rocio_c") if modo_agricola.get("punto_rocio_c") is not None else 5.0
    viento_kmh = metadatos.get("viento_kmh") if metadatos.get("viento_kmh") is not None else 0.0
    rafaga_kmh = modo_agricola.get("rafagas_max_kmh") if modo_agricola.get("rafagas_max_kmh") is not None else viento_kmh
    indice_uv = modo_urbano.get("indice_uv") if modo_urbano.get("indice_uv") is not None else 0
    vpd = modo_agricola.get("deficit_presion_vapor_vpd_kpa") if modo_agricola.get("deficit_presion_vapor_vpd_kpa") is not None else 1.0

    # --- ❄️ HELADAS RADIATIVAS / ADVECTIVAS (AGRÍCOLA) ---
    if temp_min <= 0.0 or (temp_actual <= 2.0 and punto_rocio <= 0.0):
        if viento_kmh >= 10.0:
            alertas.append(
                {
                    "id": "helada_advectiva",
                    "nivel": "critico",
                    "tipo": "agricola",
                    "titulo": "❄️ Alerta Crítica de Helada Advectiva (Viento Polar)",
                    "mensaje": f"Temperatura de {temp_min}°C con viento de {viento_kmh} km/h y rocío a {punto_rocio}°C.",
                    "recomendacion": "Helada por viento polar. NO usar hélices antiheladas (inútiles sin inversión térmica). Proteger con cubiertas o calefacción activa.",
                    "icono": "Snowflake",
                }
            )
        else:
            alertas.append(
                {
                    "id": "helada_critica",
                    "nivel": "critico",
                    "tipo": "agricola",
                    "titulo": "❄️ Alerta Crítica de Helada Radiativa",
                    "mensaje": f"Temperatura prevista de {temp_min}°C con punto de rocío a {punto_rocio}°C.",
                    "recomendacion": "Activar inmediatamente hélices antiheladas o microaspersión de riego sobre el follaje antes de las 04:00 AM.",
                    "icono": "Snowflake",
                }
            )
    elif temp_min <= 3.0:
        alertas.append(
            {
                "id": "helada_advertencia",
                "nivel": "advertencia",
                "tipo": "agricola",
                "titulo": "🌡️ Riesgo de Helada Temprana",
                "mensaje": f"Temperatura mínima esperada de {temp_min}°C.",
                "recomendacion": "Monitorear telemetría nocturna y preparar quemadores o mantas térmicas en brotes jóvenes.",
                "icono": "ThermometerSnow",
            }
        )

    # --- 🌬️ DERIVA FITOSANITARIA Y VIENTO (AGRÍCOLA) ---
    if viento_kmh >= 15.0:
        alertas.append(
            {
                "id": "deriva_fitosanitaria",
                "nivel": "advertencia",
                "tipo": "agricola",
                "titulo": "🌬️ Alerta de Deriva Fitosanitaria",
                "mensaje": f"Viento continuo de {viento_kmh} km/h (Ráfagas {rafaga_kmh} km/h).",
                "recomendacion": "SUSPENDER pulverizaciones de plaguicidas y herbicidas. El viento supera los 15 km/h permitidos por norma INIA.",
                "icono": "Wind",
            }
        )

    # --- 💧 DÉFICIT DE PRESIÓN DE VAPOR / ESTRÉS HÍDRICO ---
    if vpd >= 2.0:
        alertas.append(
            {
                "id": "vpd_extremo",
                "nivel": "advertencia",
                "tipo": "agricola",
                "titulo": "🏜️ Alto Déficit Presión Vapor (VPD > 2.0 kPa)",
                "mensaje": f"Aire extremadamente seco con VPD de {vpd} kPa.",
                "recomendacion": "El cultivo ha cerrado estomas para evitar deshidratación. Aplicar riego de refresco por aspersión.",
                "icono": "Droplets",
            }
        )
    elif vpd < 0.3 and temp_actual >= 12.0:
        alertas.append(
            {
                "id": "vpd_saturado",
                "nivel": "advertencia",
                "tipo": "agricola",
                "titulo": "🍄 Riesgo Fitopatológico (VPD < 0.3 kPa y T ≥ 12°C)",
                "mensaje": f"Humedad saturada y temperatura favorable ({temp_actual}°C) con VPD de {vpd} kPa.",
                "recomendacion": "Condiciones críticas para proliferación de hongos (Botrytis, Oídio). Ventilar invernaderos y suspender riegos foliares.",
                "icono": "Droplets",
            }
        )

    # --- ☀️ RADIACIÓN UV (URBANO/SALUD) ---
    if indice_uv >= 8:
        alertas.append(
            {
                "id": "uv_extremo",
                "nivel": "critico" if indice_uv >= 11 else "advertencia",
                "tipo": "urbano",
                "titulo": f"☀️ Radiación UV {'Extrema' if indice_uv >= 11 else 'Muy Alta'} (Nivel {indice_uv})",
                "mensaje": "Intensidad solar potencialmente dañina para la piel y córnea.",
                "recomendacion": "Usar bloqueador solar FPS 50+, anteojos UV400 y evitar exposición directa entre 11:00 y 16:00 hrs.",
                "icono": "Sun",
            }
        )

    # --- 😷 CALIDAD DEL AIRE SINCA (URBANO) ---
    caq_dict = modo_urbano.get("calidad_aire_sinca", {})
    norma_info = caq_dict.get("norma_chilena_mma", {})
    nivel_codigo = norma_info.get("nivel_codigo") or (
        "emergencia"
        if "emergencia" in str(caq_dict.get("norma_chilena", "")).lower()
        else (
            "preemergencia"
            if "preemergencia" in str(caq_dict.get("norma_chilena", "")).lower()
            else ("alerta" if "alerta" in str(caq_dict.get("norma_chilena", "")).lower() else "bueno")
        )
    )

    if nivel_codigo in ["alerta", "preemergencia", "emergencia"]:
        nombre_nivel = nivel_codigo.capitalize()
        alertas.append(
            {
                "id": "aqi_alerta",
                "nivel": "critico" if nivel_codigo in ["preemergencia", "emergencia"] else "advertencia",
                "tipo": "urbano",
                "titulo": f"😷 Calidad del Aire SINCA en {nombre_nivel.upper()}",
                "mensaje": "Altas concentraciones de Material Particulado MP2.5/MP10 en cuenca urbana.",
                "recomendacion": "Prohibido uso de calefactores a leña no certificados. Suspender actividad física en recintos abiertos.",
                "icono": "AlertTriangle",
            }
        )

    return alertas
