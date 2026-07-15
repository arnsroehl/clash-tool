# Rathaus-Entscheidungsmodell

`town-hall-v1.0.0` bewertet einen Rathauswechsel ohne pauschale Maxing-Regel. Offensive, Helden, Labor, Schlüsselgebäude, Lager/Ressourcen, Verteidigung und Ziele erhalten je nach Strategie unterschiedliche Gewichte. Restzeit, Events, Magic Items und der erwartete Nutzen des nächsten Rathauses ergänzen den Score.

Das Ergebnis trennt Empfehlung und Confidence. Fehlende Bereiche oder Schlüsselgebäude reduzieren die Confidence, werden aber nicht als Nullfortschritt gewertet. Positive und negative Reason Codes bleiben in Deutsch und Englisch prüfbar.

Die drei Varianten „aktuelles Rathaus weiter maxen“, „sofort upgraden“ und „zu Datum upgraden“ verwenden die isolierte Szenario-Engine. Verglichen werden Gesamtdauer, Ressourcenbedarf, Helden- und Offensivfortschritt, Rush-Risiko und Zielerreichung. Jede Variante kann als normales Was-wäre-wenn-Szenario gespeichert werden, ohne Account- oder Queue-Daten zu verändern.
