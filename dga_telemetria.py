import time


def extraer_telemetria_bnaconsultas(estaciones):
    """
    Retorna la estructura vacía. El usuario solicitó explícitamente no usar datos simulados.
    La extracción real de BNAConsultas es inviable masivamente por ser JSF.
    Se requiere API Key oficial (MEE o HIDROlínea) de la DGA para continuar.
    """
    telemetria_global = {}

    for est in estaciones:
        st_id = est["id"]
        tele = est.copy()
        tele["timestamp_actualizacion"] = int(time.time())
        # No se inyectan variables físicas para forzar el "Sin reporte"
        telemetria_global[st_id] = tele

    return telemetria_global
