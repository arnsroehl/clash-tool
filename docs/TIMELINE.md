# Zentrale Timeline

Die Timeline wird aus vorhandenen Daten aggregiert und nicht als zweite Kopie des Plans gespeichert. Gemeinsame `TimelineEvent`-Objekte entstehen aus Builder-Simulation, Queue, Labor, Zielen, Events, Ressourcenprognose, Magic-Item-Reservierungen, Benachrichtigungen und Fortschrittssnapshots.

Start- und Endzeiten von Upgrades stammen direkt aus den `BuilderAssignment`-Datensätzen. Queue-Änderungen berechnen deshalb dieselbe Timeline unmittelbar neu. Die Oberfläche formatiert UTC-Zeitpunkte in der lokalen Browser-Zeitzone und kennzeichnet simulierte Werte mit `*`.

Ansichten: Tag, Woche, Monat, Gesamtplan sowie Spuren für Builder, Labor, Ziele, Events, Ressourcen und Account. Ereignisse können geöffnet werden; Queue-Upgrades lassen sich verschieben oder bearbeiten, Erinnerungen dauerhaft speichern, Was-wäre-wenn-Szenarien ab dem Zeitpunkt erzeugen und der zukünftige Accountstand öffnen.
