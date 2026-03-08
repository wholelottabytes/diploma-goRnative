FROM docker.elastic.co/beats/filebeat:8.6.2
USER root
COPY filebeat.docker.yml /usr/share/filebeat/filebeat.yml
RUN chown root:root /usr/share/filebeat/filebeat.yml
USER filebeat
