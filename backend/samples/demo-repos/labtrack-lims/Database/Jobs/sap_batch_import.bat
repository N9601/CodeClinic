@echo off
REM Nightly SAP ECC batch master data import - registered with:
REM   schtasks /create /tn "LabTrack SAP Import" /tr "D:\LabTrack\jobs\sap_batch_import.bat" /sc daily /st 02:00
sqlcmd -S 10.20.4.15 -d LabTrack -E -Q "EXEC dbo.usp_ImportSapBatches @File='\\sapfs01\exports\batches.txt'"
