import httpx
import time
import logging

ARCGIS_URL = "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Red_Hidrometrica/MapServer/0/query"

def obtener_estaciones_dga():
    estaciones = []
    telemetria = {}
    
    last_oid = 0
    has_more = True
    
    try:
        while has_more:
            params = {
                "where": f"VIGENCIA = 'Vigentes' AND OBJECTID BETWEEN {last_oid + 1} AND {last_oid + 1500}",
                "outFields": "OBJECTID,ID_IDE,NOM_ESTACION,TIPO_ESTACION,LATITUD,LONGITUD",
                "orderByFields": "OBJECTID ASC",
                "f": "json",
                "returnGeometry": "false",
            }
            response = httpx.get(ARCGIS_URL, params=params, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            
            features = data.get("features", [])
            max_batch_oid = last_oid
            if not features:
                last_oid += 1500
                if last_oid > 10000: break
                continue
                
            for feat in features:
                attr = feat.get("attributes", {})
                oid = attr.get('OBJECTID', 0)
                if oid > max_batch_oid:
                    max_batch_oid = oid
                    
                st_id = attr.get('ID_IDE', '')
                if not st_id:
                    continue
                st_id = f"dga_{str(st_id).lower()}"
                
                lat = attr.get("LATITUD")
                lon = attr.get("LONGITUD")
                if lat is None or lon is None:
                    continue
                    
                nombre = attr.get("NOM_ESTACION", "Estación DGA")
                tipo_crudo = attr.get("TIPO_ESTACION", "")
                
                if "Fluviom" in tipo_crudo:
                    tipo = "Fluviométrica"
                elif "Meteor" in tipo_crudo:
                    tipo = "Meteorológica"
                elif "Nivo" in tipo_crudo:
                    tipo = "Nivométrica"
                elif "Lagos" in tipo_crudo or "Embalses" in tipo_crudo:
                    tipo = "Lagos y Embalses"
                elif "Piezo" in tipo_crudo:
                    tipo = "Piezométrica"
                else:
                    tipo = tipo_crudo
                    
                est_data = {
                    "id": st_id,
                    "red": "DGA",
                    "nombre": nombre,
                    "lat": lat,
                    "lon": lon,
                    "tipo_dga": tipo
                }
                estaciones.append(est_data)
                
                tele = est_data.copy()
                tele["timestamp_actualizacion"] = int(time.time())
                telemetria[st_id] = tele
            
            last_oid += 1500
            if last_oid > 10000:
                has_more = False
                
    except Exception as e:
        logging.error(f"Error extrayendo DGA ArcGIS: {e}")
        
    return estaciones, telemetria

if __name__ == "__main__":
    est, tele = obtener_estaciones_dga()
    print(f"Obtenidas {len(est)} estaciones DGA vigentes de la Red Hidrométrica Nacional.")
