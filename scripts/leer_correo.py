#!/usr/bin/env python3
import email
import imaplib
import os
import sys
from email.header import decode_header
from dotenv import load_dotenv

# Cargar variables desde .env
load_dotenv()

USER = os.getenv("EMAIL_USER", "").strip()
PASS = os.getenv("EMAIL_PASS", "").strip()
SERVER = os.getenv("EMAIL_IMAP_SERVER", "imap.gmail.com").strip()

def decode_mime(header_val):
    if not header_val:
        return ""
    decoded_fragments = decode_header(header_val)
    parts = []
    for text, enc in decoded_fragments:
        if isinstance(text, bytes):
            parts.append(text.decode(enc or "utf-8", errors="replace"))
        else:
            parts.append(str(text))
    return "".join(parts)

def obtener_cuerpo(msg):
    cuerpo = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdisp = str(part.get("Content-Disposition"))
            if ctype == "text/plain" and "attachment" not in cdisp:
                payload = part.get_payload(decode=True)
                if payload:
                    cuerpo = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            cuerpo = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
    return cuerpo.strip()

def listar_ultimos_correos(limite=5, solo_no_leidos=False):
    if not USER or not PASS:
        print("❌ Error: EMAIL_USER o EMAIL_PASS no están configurados en .env")
        sys.exit(1)

    print(f"📡 Conectando a {SERVER} con {USER}...")
    mail = imaplib.IMAP4_SSL(SERVER)
    mail.login(USER, PASS)
    mail.select("inbox")

    criterio = "UNSEEN" if solo_no_leidos else "ALL"
    status, messages = mail.search(None, criterio)
    if status != "OK" or not messages[0]:
        print("📭 No se encontraron correos.")
        mail.logout()
        return

    email_ids = messages[0].split()
    total = len(email_ids)
    print(f"📬 Total correos encontrados: {total}. Mostrando últimos {min(limite, total)}:\n")

    for e_id in email_ids[-limite:]:
        res, msg_data = mail.fetch(e_id, "(RFC822)")
        if res != "OK":
            continue

        for part in msg_data:
            if isinstance(part, tuple):
                msg = email.message_from_bytes(part[1])
                asunto = decode_mime(msg.get("Subject"))
                remitente = decode_mime(msg.get("From"))
                fecha = msg.get("Date", "")
                cuerpo = obtener_cuerpo(msg)
                preview = (cuerpo[:200] + "...") if len(cuerpo) > 200 else cuerpo

                print(f"🔹 ID: {e_id.decode()}")
                print(f"   📅 Fecha: {fecha}")
                print(f"   👤 De: {remitente}")
                print(f"   📌 Asunto: {asunto}")
                if preview:
                    print(f"   📝 Extracto: {preview}")
                print("-" * 60)

    mail.logout()

if __name__ == "__main__":
    lim = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    listar_ultimos_correos(limite=lim)
