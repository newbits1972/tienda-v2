# Guía Definitiva: Sincronización de Alias (Fin del Error 401)

El error 401 ocurre porque el permiso de facturación está en un alias (`datasenseTest`) que no podés usar, mientras que vos estás generando el certificado para otro (`datasensepostest`). **Para que funcione, el Alias del Certificado y el Alias del Permiso deben ser el mismo.**

Seguí estos pasos exactos (es la única forma):

## 1️⃣ Paso A: Generar el Certificado para el alias visible
1.  En AFIP (**WSASS**), ve a **"Agregar certificado a alias"**.
2.  Seleccioná el que dice **`datasensepostest`**.
3.  **Subí el archivo CSR**: Usá el archivo **`afip_datasensepostest.csr`** que está en tu carpeta raíz (o copiá el código de abajo).
4.  Generá el certificado, copiá el resultado y pegalo aquí en el chat.

## 2️⃣ Paso B: ¡IMPORTANTE! Actualizar el permiso (Vincular)
Una vez que me pases el certificado y lo subas a la app, tenés que hacer esto para que AFIP te deje pasar:
1.  Andá al **Administrador de Relaciones**.
2.  Buscá la relación de **Facturación Electrónica** que ya tenés.
3.  **MODIFICALA o BORRALA y CREALA de nuevo** eligiendo como Representante el alias **`datasensepostest`** (en lugar de `datasenseTest`).
4.  Guardá los cambios.

---

## 📦 CSR para `datasensepostest` (Copiá esto):
```text
-----BEGIN CERTIFICATE REQUEST-----
MIICozCCAYsCAQAwXjEZMBcGA1UEAxMQZGF0YXNlbnNlcG9zdGVzdDELMAkGA1UE
BhMCQVIxGTAXBgNVBAoTEGRhdGFzZW5zZXBvc3Rlc3QxGTAXBgNVBAUTEENVSVQg
MjcyNDc2NjkyMTkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC0bOk8
pF/JFrvTX7DkKfGYskBfzD6uq5TVdUyI//Gq2v1bPS6AE0RsBCpolL+aqEuUPwKO
zH3/MF8Sj7j33uzURHdHui2GeYRcMv74QfVOkXRTrAddml1DMykApavM4PFOqsr/
LvrZUyxGyZNmpSWhZA+8mEo6AXc793kWQJWO4RNhKcBZcqij3UNMeohjRnbGvTWi
ykGw/w7BW2tlKMMtpEa5i/dN+3vj9veubnFHmynqv/BJqbrQhKQZ6QhvXD52pxM6
8xs6njr27s0+Gm4uyyFvpXcLs5hM8BBNLZBws2xy/sX1dDYHY+FWNrOgmOLp2ydG
cNJGjLE5BRMKnau5AgMBAAGgADANBgkqhkiG9w0BAQUFAAOCAQEADiKHz+LbqCu5
asu8sTlQUpJcuDPALZvdrSowN1NjIMfHc811WghzlVy1uDnW4f0XSABbjONo/rx0
4ybNYz1mmVDzhOIDxQsUjbo/qfynvWC+JvgNTYJgdnE7Xzz6oLp7GZlYqKIDJvxG
rjZLsyXbusiCFysGf2MbUCpRSdlixA2xI9XnBcCs87T68G/zQifqr25E5PPuBiLa
okxZTacpztRn9D+mWYpbjT364l4m5WP4CkOArTjoaTDVyPZJnU1FoLdYqwQDDwNP
u2XaP9UbxY52O/04Ke/3QexlF5coEbdhAzrDiVEVf4HYlaHrvHxuJ6m044UU2Dgg
OMZsqm+5cA==
-----END CERTIFICATE REQUEST-----
```
*(Usar con la llave `afip_datasensepostest.key`)*

---

**Resumen:** AFIP te rechaza (401) porque le mostrás un documento a nombre de "Postest" pero el permiso que tenés guardado dice "Test". Haciendo esto, los dos dirán "Postest" y todo funcionará. 🚀✨🏁
