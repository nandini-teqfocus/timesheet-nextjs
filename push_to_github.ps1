# Script to push local main branch to GitHub repository
param(
    [string]$RepoUrl = "https://github.com/nandini-teqfocus/timesheet-nextjs.git"
)

git remote remove origin 2>$null
git remote add origin $RepoUrl
git push -u origin main
