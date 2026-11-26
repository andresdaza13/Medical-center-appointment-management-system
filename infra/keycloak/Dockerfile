# Keycloak para la nube (Render, plan gratuito: 512 MB de RAM y 0.1 CPU).
#
# Dos etapas (multi-stage):
#   1. "builder": ejecuta `kc.sh build`, el paso que más memoria consume
#      ("Updating the server image"). Lo hacen las máquinas de construcción,
#      que no tienen el límite de 512 MB.
#   2. imagen final: solo copia el resultado y arranca con `start --optimized`,
#      saltándose ese paso pesado.

ARG KEYCLOAK_VERSION=26.0

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder
# Opciones de "build time": quedan fijas dentro de la imagen.
ENV KC_DB=postgres
# Un solo nodo: caché local, sin el clúster Infinispan/JGroups (menos memoria).
ENV KC_CACHE=local
ENV KC_HEALTH_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# El realm se importa al arrancar SOLO si todavía no existe en la base:
# los cambios que hagas luego en la consola de administración no se pierden.
COPY piedrazul-realm.json /opt/keycloak/data/import/piedrazul-realm.json

# Render termina el HTTPS en su proxy y le pasa la petición en HTTP a Keycloak,
# avisando con las cabeceras X-Forwarded-* que el cliente usó HTTPS.
ENV KC_HTTP_ENABLED=true
ENV KC_PROXY_HEADERS=xforwarded

# Memoria de Java ajustada a 512 MB. Sin esto, la JVM calcula el heap como un
# porcentaje de la memoria y no deja espacio para lo demás (metaspace, hilos).
ENV JAVA_OPTS_KC_HEAP="-Xms64m -Xmx200m"
ENV JAVA_OPTS_APPEND="-XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=48m -XX:TieredStopAtLevel=1 -Xss512k"
# Lo que cambia por entorno (y los secretos) llega por variables de entorno:
#   KC_DB_URL, KC_DB_USERNAME, KC_DB_PASSWORD, KC_HOSTNAME,
#   KC_BOOTSTRAP_ADMIN_USERNAME, KC_BOOTSTRAP_ADMIN_PASSWORD

EXPOSE 8080
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm"]