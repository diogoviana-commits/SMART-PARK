# Agenda o backup semanal do banco no Agendador de Tarefas do Windows.
#
#   npm run backup:agendar            cria ou atualiza a tarefa
#   npm run backup:agendar -- -Remover   apaga a tarefa
#
# Roda aos domingos, 10h, com o usuario logado; se o computador estiver desligado
# na hora, roda assim que ele for ligado. O resultado de cada execucao fica em
# backup.log, na pasta dos backups.
param([switch]$Remover)

$nome = 'SmartPark - Backup do banco'
$projeto = Split-Path -Parent $PSScriptRoot

if ($Remover) {
  Unregister-ScheduledTask -TaskName $nome -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Tarefa '$nome' removida."
  exit 0
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -WorkingDirectory $projeto `
  -Argument "-NoProfile -WindowStyle Hidden -Command `"& '$npm' run --silent backup`""
$quando = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 10am
$opcoes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $quando -Settings $opcoes -Force `
  -Description 'Backup semanal do banco do Smart Park (npm run backup).' | Out-Null
Write-Host "Tarefa '$nome' agendada: domingos, 10h. Pasta do projeto: $projeto"
