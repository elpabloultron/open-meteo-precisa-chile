import asyncio
import logging
import time

import httpx

URL_ALERTAS = "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer/0/query"
URL_EMBALSES = "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ESTACION_EMBALSE/MapServer/0/query"

logger = logging.getLogger(__name__)


def extraer_telemetria_dga_en_vivo(estaciones: list[dict]) -> dict[str, dict]:
    """
    Extrae telemetría oficial en vivo de la Red Hidrométrica DGA (MOP)
    a través de los servicios ArcGIS REST de Alertas y Embalses.
    """
    telemetria_global: dict[str, dict] = {}
    alertas_map: dict[str, dict] = {}
    embalses_map: dict[str, dict] = {}

    try:
        with httpx.Client(timeout=15.0) as client:
            resp_al = client.get(
                URL_ALERTAS,
                params={"where": "1=1", "outFields": "*", "returnGeometry": "false", "f": "json"},
            )
            if resp_al.status_code == 200:
                features = resp_al.json().get("features", [])
                for f in features:
                    attr = f.get("attributes", {})
                    cod = str(attr.get("SITMOP_PROD.SITMOP_DESA.TG_RED_HIDROMETEO.CODBNA") or "").strip()
                    if cod:
                        base = cod.split("-")[0].strip()
                        alertas_map[base] = attr
                        alertas_map[cod] = attr

            resp_em = client.get(
                URL_EMBALSES,
                params={"where": "1=1", "outFields": "*", "returnGeometry": "false", "f": "json"},
            )
            if resp_em.status_code == 200:
                features = resp_em.json().get("features", [])
                for f in features:
                    attr = f.get("attributes", {})
                    cod = str(attr.get("SITMOP_PROD.SITMOP_DESA.TG_RED_HIDROMETEO.CODBNA") or "").strip()
                    if cod:
                        base = cod.split("-")[0].strip()
                        embalses_map[base] = attr
                        embalses_map[cod] = attr
    except Exception as e:
        logger.warning(f"Error consultando telemetría DGA en vivo (ArcGIS): {e}")

    now_ts = int(time.time())

    for est in estaciones:
        st_id = est["id"]
        tele = est.copy()
        tele["timestamp_actualizacion"] = now_ts

        base = est.get("cod_bna_base")
        full_cod = est.get("cod_bna")

        # 1. Capa Alertas (Caudal / Niveles / Crecidas)
        al_data = alertas_map.get(base) or (alertas_map.get(full_cod) if full_cod else None)
        if al_data:
            val = al_data.get("SITMOP_PROD.SDE.V_DGA_GIS_ALERTAS.mod_valor")
            alerta = al_data.get("SITMOP_PROD.SDE.V_DGA_GIS_ALERTAS.mod_alerta")
            ind = al_data.get("SITMOP_PROD.SDE.V_DGA_GIS_ALERTAS.mod_indale")
            fechra = al_data.get("SITMOP_PROD.SDE.V_DGA_GIS_ALERTAS.mod_fechra")

            if val is not None and float(val) > 0:
                tele["caudal_m3s"] = round(float(val), 2)
            if alerta is not None and float(alerta) > 0:
                tele["alerta_crecida"] = round(float(alerta), 2)
            if ind is not None:
                tele["indice_alerta"] = int(ind)
            if fechra:
                tele["timestamp_actualizacion"] = int(fechra / 1000)
            tele["estado_transmision"] = "Transmitiendo"

        # 2. Capa Embalses (Lagos / Embalses / Nivel de agua)
        em_data = embalses_map.get(base) or (embalses_map.get(full_cod) if full_cod else None)
        if em_data:
            nivel = em_data.get("SITMOP_PROD.SITMOP_DESA.TI_DGA_EMBALSE.nivel")
            vol = em_data.get("SITMOP_PROD.SITMOP_DESA.TI_DGA_EMBALSE.volumen")
            pct = em_data.get("SITMOP_PROD.SITMOP_DESA.TI_DGA_EMBALSE.porcentaje")
            fecmed = em_data.get("SITMOP_PROD.SITMOP_DESA.TI_DGA_EMBALSE.fecmed")

            if nivel is not None:
                tele["nivel_agua_m"] = round(float(nivel), 2)
            if vol is not None:
                tele["volumen_hm3"] = round(float(vol), 2)
            if pct is not None:
                tele["porcentaje_llenado_pct"] = round(float(pct), 1)
            if fecmed:
                tele["timestamp_actualizacion"] = int(fecmed / 1000)

        telemetria_global[st_id] = tele

    return telemetria_global


# Alias retrocompatible
extraer_telemetria_bnaconsultas = extraer_telemetria_dga_en_vivo


async def enriquecer_telemetria_dga_fluviometrica_lote(
    estaciones_dga: list[dict],
    telemetria_global: dict[str, dict],
    concurrencia: int = 4,
    max_estaciones: int = 100,
) -> int:
    """
    Enriquece en segundo plano (worker de sincronización) las estaciones fluviométricas
    (ríos, esteros y canales) con el último caudal y tendencia disponible.
    Guarda los datos en telemetria_global para persistencia en base de datos (TimescaleDB / caché).
    """
    fluviometricas = [
        e
        for e in estaciones_dga
        if e.get("tipo_dga") == "Fluviométrica"
        and (e.get("cod_bna_base") or e.get("cod_bna"))
        and not telemetria_global.get(e["id"], {}).get("caudal_m3s")
    ]

    # Priorizar cauces activos identificados por nombre de río/estero/canal
    cauces_prioritarios = [
        e
        for e in fluviometricas
        if any(
            k in e.get("nombre", "").lower()
            for k in [
                "rio",
                "estero",
                "canal",
                "champa",
                "trebal",
                "maipo",
                "mapocho",
                "aconcagua",
                "maule",
                "biobio",
                "tolten",
                "trancura",
            ]
        )
    ]
    resto = [e for e in fluviometricas if e not in cauces_prioritarios]
    objetivos = (cauces_prioritarios + resto)[:max_estaciones]

    if not objetivos:
        return 0

    sem = asyncio.Semaphore(concurrencia)
    enriquecidas = 0

    async with httpx.AsyncClient(timeout=2.5) as client:

        async def _consultar(st):
            nonlocal enriquecidas
            cod = st.get("cod_bna_base") or st.get("cod_bna")
            st_id = st["id"]
            async with sem:
                try:
                    r = await client.post("https://caudalrio.cl/api/consultar", json={"query": cod})
                    if r.status_code == 200:
                        data = r.json()
                        if data.get("success") and data.get("data"):
                            st_data = data["data"]
                            med = st_data.get("mediciones", {})
                            c_num = med.get("caudal_num")
                            if c_num is not None and float(c_num) > 0:
                                entry = telemetria_global.setdefault(st_id, st.copy())
                                entry["caudal_m3s"] = round(float(c_num), 2)
                                if med.get("tendencia"):
                                    entry["tendencia_caudal"] = med["tendencia"]
                                if st_data.get("resumen"):
                                    entry["resumen_hidrologico"] = st_data["resumen"]
                                entry["timestamp_actualizacion"] = int(time.time())
                                enriquecidas += 1
                except Exception:
                    pass

        await asyncio.gather(*(_consultar(s) for s in objetivos))

    return enriquecidas

