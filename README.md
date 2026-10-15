# INCLISIRAN SCA/ICP — prototipo v1

## Qué incluye
- Aplicación web adaptable a móvil y escritorio.
- Formulario de registro clínico con folio codificado.
- Persistencia local en IndexedDB del navegador.
- Búsqueda, edición y eliminación de registros locales.
- Exportación CSV (abrible en Excel) y respaldo/importación JSON.
- Service worker y manifest para preparar uso tipo PWA.
- Esquema SQL inicial para la futura base compartida en Supabase.

## Limitaciones importantes
Esta versión **no sincroniza entre médicos**, no cifra el contenido de IndexedDB y no tiene inicio de sesión. El aviso de conexión solo indica conectividad; los datos se mantienen localmente. No introducir información identificable ni usar con pacientes reales hasta completar seguridad, aprobación institucional y pruebas.

## Probar localmente
1. Extrae el ZIP.
2. Desde esta carpeta inicia un servidor estático, por ejemplo:
   `python3 -m http.server 8000`
3. Abre `http://localhost:8000` en el navegador.
4. Crea un folio ficticio, guarda, busca y exporta un CSV.
5. Para comprobar instalación/offline, publícalo por HTTPS en un entorno de prueba; el service worker no funciona desde `file://`.

## Arquitectura de producción propuesta
- Frontend PWA: alojamiento estático HTTPS (por ejemplo, GitHub Pages solo para la interfaz).
- Autenticación: Supabase Auth con cuentas individuales, MFA si está disponible y acceso mínimo necesario.
- Datos centrales: PostgreSQL administrado con Row Level Security (RLS), membresías/roles y auditoría.
- Offline: IndexedDB + cola de sincronización; antes de sincronizar, validar versión del registro y resolver conflictos. No usar `last-write-wins` silencioso para campos clínicos.
- Protección local: cifrado de datos en reposo con gestión segura de claves; el cifrado no debe depender de una clave hardcodeada en el código público.
- Exportación: CSV/XLSX generado desde datos autorizados; registrar quién exporta y cuándo.
- Gobierno clínico: folio pseudonimizado; llave de reidentificación separada; acceso por rol; copias de seguridad; política de retención; autorización del comité de ética/investigación y del responsable institucional de datos.

## Variables de v1
Incluye variables basales, tratamiento, LDL-C basal/alta/1/3/6/12 meses, múltiples lesiones coronarias por paciente (culpable, intermedias y otras), anatomía angiográfica, fisiología cuando se realiza, tratamiento de lesión y campos de OCT por lesión, espesor de grasa epicárdica basal y seguimiento, eventos y notas sin identificadores directos. Exporta pacientes y lesiones en CSV separados. Ampliar los campos OCT, ecocardiograma y eventos usando el diccionario definitivo del protocolo antes de reclutar.

## Siguiente desarrollo recomendado
1. Aprobar diccionario de datos y roles.
2. Configurar proyecto Supabase, Auth y políticas RLS.
3. Implementar cola offline, sincronización idempotente y detección de conflictos.
4. Cifrado local y pruebas de seguridad.
5. Piloto con datos ficticios; luego aprobación institucional para datos reales.


## Ampliación del módulo de cateterismo/OCT (v3)
- Datos angiográficos por lesión: bifurcación, oclusión total crónica y TIMI final.
- OCT de placa: grosor mínimo de capa fibrosa, arco/longitud lipídica, área luminal mínima, diámetro luminal mínimo, área de referencia, TCFA, macrófagos, nódulo calcificado y disección.
- OCT post-ICP: área mínima del stent, expansión, aposición/malaposición, disección de bordes y prolapso tisular.
- Las variables de OCT requieren definiciones operativas, protocolo de lectura y entrenamiento; no todas serán evaluables en todos los casos.
