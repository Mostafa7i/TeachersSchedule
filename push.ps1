# PowerShell script to push Frontend & Backend updates to GitHub
param (
    [string]$msg = "تحديث جديد للنظام",
    [string]$target = "all"
)

node "$PSScriptRoot\scripts\push.js" $msg "--target=$target"

