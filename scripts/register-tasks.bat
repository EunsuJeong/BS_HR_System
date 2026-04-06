@echo off
chcp 65001 > nul

schtasks /create /tn "BS-HR-AnnualRenew" /tr "C:\BS_HR_System\scripts\annual-leave-renew.bat" /sc daily /st 21:00 /f
schtasks /create /tn "BS-HR-AnnualCheck" /tr "C:\BS_HR_System\scripts\annual-leave-check.bat" /sc daily /st 00:01 /f
schtasks /create /tn "BS-HR-BackupJSON" /tr "C:\BS_HR_System\scripts\backup-json.bat" /sc daily /st 00:03 /f
schtasks /create /tn "BS-HR-BackupExcel" /tr "C:\BS_HR_System\scripts\backup-excel.bat" /sc daily /st 01:03 /f

echo.
echo === 등록된 작업 확인 ===
schtasks /query /tn "BS-HR-AnnualRenew" /fo list /nh
schtasks /query /tn "BS-HR-AnnualCheck" /fo list /nh
schtasks /query /tn "BS-HR-BackupJSON" /fo list /nh
schtasks /query /tn "BS-HR-BackupExcel" /fo list /nh
