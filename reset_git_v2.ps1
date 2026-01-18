$ErrorActionPreference = "Continue" # Allow errors for branch deletion
$remoteUrl = "https://github.com/Antelope693/MyShards-Diary.git"

Write-Host "Removing existing .git directory..."
if (Test-Path .git) {
    Remove-Item -Recurse -Force .git
}

Write-Host "Initializing new git repository..."
git init
git add .
git commit -m "MyShards V1.0.1"
git branch -M main
git remote add origin $remoteUrl

Write-Host "Attempting to delete remote branch MyShardsV1.0.0..."
# This might fail if it doesn't exist or if auth fails for deletion, but we try.
git push origin --delete MyShardsV1.0.0 2>$null

Write-Host "Force pushing main..."
git push -u origin main --force

Write-Host "Done!"
